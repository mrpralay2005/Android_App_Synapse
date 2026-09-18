import getPrisma from '../prisma/db.js';

export const getProfile = async (c) => {
    const username = c.req.param('username');
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const viewerId = c.get('user')?.userId;
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profileImage: true,
                riskScore: true,
                isPrivate: true,
                showActivityStatus: true,
                lastActiveAt: true,
                createdAt: true,
                role: true,
                posts: {
                    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { likes: true, comments: true }
                        }
                    }
                },
                _count: {
                    select: {
                        posts: true,
                        followers: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return c.json({ success: false, error: "Identity not found" }, 404);
        }

        const isOwnProfile = user.id === viewerId;
        const follow = !isOwnProfile && viewerId
            ? await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
            : null;
        const isFollowing = Boolean(follow);
        // Privacy is enforced at the API boundary. A private profile's content
        // never reaches a non-follower's browser, even if they call the API.
        const canViewContent = !user.isPrivate || isOwnProfile || isFollowing;
        const responseUser = canViewContent ? user : {
            id: user.id,
            username: user.username,
            profileImage: user.profileImage,
            isPrivate: true,
            _count: { posts: 0, followers: 0, following: 0 }
        };
        return c.json({
            success: true,
            data: {
                ...responseUser,
                posts: canViewContent ? user.posts : [],
                isFollowing,
                canViewContent
            }
        });
    } catch (error) {
        console.error("Profile Error:", error);
        return c.json({ success: false, error: "Search failed" }, 500);
    }
};

export const toggleFollow = async (c) => {
    try {
        const viewerId = c.get('user')?.userId;
        const username = c.req.param('username');
        const prisma = getPrisma(c.env.DATABASE_URL);
        const target = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true } });
        if (!target) return c.json({ success: false, error: 'Identity not found' }, 404);
        if (target.id === viewerId) return c.json({ success: false, error: 'You cannot follow your own profile' }, 400);
        const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: target.id } } });
        let following;
        if (existing) {
            await prisma.follow.delete({ where: { id: existing.id } });
            following = false;
        } else {
            await prisma.follow.create({ data: { followerId: viewerId, followingId: target.id } });
            following = true;
        }
        const [targetFollowers, viewerFollowing] = await prisma.$transaction([
            prisma.follow.count({ where: { followingId: target.id } }),
            prisma.follow.count({ where: { followerId: viewerId } })
        ]);
        return c.json({
            success: true,
            following,
            counts: { targetFollowers, viewerFollowing },
            message: following ? `Following @${target.username}` : `Unfollowed @${target.username}`
        });
    } catch (error) {
        console.error('Follow toggle error:', error);
        return c.json({ success: false, error: 'Follow status could not be updated' }, 500);
    }
};

export const getSavedItems = async (c) => {
    try {
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        const saved = await prisma.savedPost.findMany({
            where: { userId: user.userId },
            include: {
                post: {
                    include: {
                        user: { select: { username: true, profileImage: true } },
                        _count: { select: { likes: true, comments: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return c.json({
            success: true,
            data: saved.map(s => s.post)
        });
    } catch (error) {
        return c.json({ success: false, error: "Archived content retrieval failed" }, 500);
    }
};

// A portable account export. Passwords, OTPs, and server-only security secrets
// are deliberately excluded even though this endpoint is authenticated.
export const exportArchive = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const prisma = getPrisma(c.env.DATABASE_URL);
        const [profile, posts, stories, comments, likes, savedPosts, followers, following] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, name: true, email: true, bio: true, profileImage: true, isPrivate: true, links: true, createdAt: true } }),
            prisma.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, caption: true, mediaUrl: true, thumbnailUrl: true, type: true, createdAt: true, updatedAt: true, expiresAt: true } }),
            prisma.story.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, mediaUrl: true, type: true, isProtected: true, createdAt: true, expiresAt: true } }),
            prisma.comment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, content: true, postId: true, createdAt: true } }),
            prisma.like.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { postId: true, createdAt: true } }),
            prisma.savedPost.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { postId: true, createdAt: true } }),
            prisma.follow.findMany({ where: { followingId: userId }, select: { follower: { select: { username: true, name: true } }, createdAt: true } }),
            prisma.follow.findMany({ where: { followerId: userId }, select: { following: { select: { username: true, name: true } }, createdAt: true } })
        ]);
        return c.json({ success: true, data: { exportedAt: new Date().toISOString(), profile, posts, stories, comments, likes, savedPosts, followers, following } });
    } catch (error) {
        console.error('Archive export error:', error);
        return c.json({ success: false, error: 'Archive could not be prepared' }, 500);
    }
};

// Clears disposable activity records only. It does not delete posts, stories,
// followers, messages, media, or the account itself.
export const purgeActivity = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const prisma = getPrisma(c.env.DATABASE_URL);
        const [storyViews, profileVisits] = await prisma.$transaction([
            prisma.storyView.deleteMany({ where: { userId } }),
            prisma.profileVisit.deleteMany({ where: { visitorId: userId } }),
            prisma.user.update({ where: { id: userId }, data: { notificationClearedAt: new Date() } })
        ]);
        return c.json({ success: true, data: { storyViewsCleared: storyViews.count, profileVisitsCleared: profileVisits.count } });
    } catch (error) {
        console.error('Activity purge error:', error);
        return c.json({ success: false, error: 'Activity could not be purged' }, 500);
    }
};

export const recordProfileVisit = async (c) => {
    try {
        const visitorId = c.get('user')?.userId;
        const username = c.req.param('username');
        const prisma = getPrisma(c.env.DATABASE_URL);
        const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
        if (!owner) return c.json({ success: false, error: 'Identity not found' }, 404);
        if (owner.id !== visitorId) {
            await prisma.profileVisit.create({ data: { profileOwnerId: owner.id, visitorId } });
        }
        return c.json({ success: true });
    } catch (error) {
        console.error('Profile visit recording failed:', error);
        return c.json({ success: false, error: 'Profile visit could not be recorded' }, 500);
    }
};

export const getAnalytics = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const prisma = getPrisma(c.env.DATABASE_URL);
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [posts, followers, profileVisits, recentVisits] = await Promise.all([
            prisma.post.findMany({ where: { userId }, select: { _count: { select: { likes: true, comments: true } } } }),
            prisma.follow.count({ where: { followingId: userId } }),
            prisma.profileVisit.count({ where: { profileOwnerId: userId, createdAt: { gte: since } } }),
            prisma.profileVisit.findMany({ where: { profileOwnerId: userId, createdAt: { gte: since } }, select: { createdAt: true } })
        ]);
        const likes = posts.reduce((total, post) => total + post._count.likes, 0);
        const comments = posts.reduce((total, post) => total + post._count.comments, 0);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return { label: date.toLocaleDateString('en-US', { weekday: 'short' }), date, visits: 0 };
        });
        recentVisits.forEach(({ createdAt }) => {
            const visitDay = new Date(createdAt); visitDay.setHours(0, 0, 0, 0);
            const matchingDay = days.find(day => day.date.getTime() === visitDay.getTime());
            if (matchingDay) matchingDay.visits += 1;
        });
        return c.json({ success: true, data: { posts: posts.length, followers, likes, comments, profileVisits, dailyVisits: days.map(({ label, visits }) => ({ label, visits })) } });
    } catch (error) {
        console.error('Analytics lookup failed:', error);
        return c.json({ success: false, error: 'Analytics could not be loaded' }, 500);
    }
};

export const updateProfile = async (c) => {
    try {
        const {
            name, bio, profileImage, username, isPrivate, links,
            showActivityStatus, readReceipts, ghostViewer, protectedStories, profileVisitAlerts,
            notificationPostAlerts, notificationStoryAlerts, notificationSecurityAlerts,
            quantumDecayEnabled, quantumDecayDays, neuralGuardianEnabled,
            creatorModeEnabled, creatorHighResUploads, creatorAnonymousShield,
            creatorDeepAnalytics, requestCreatorVerification
        } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: {
                ...(name && { name }),
                ...(bio && { bio }),
                ...(profileImage && { profileImage }),
                ...(username && { username }),
                ...(typeof isPrivate === 'boolean' && { isPrivate }),
                ...(typeof showActivityStatus === 'boolean' && { showActivityStatus }),
                ...(typeof readReceipts === 'boolean' && { readReceipts }),
                ...(typeof ghostViewer === 'boolean' && { ghostViewer }),
                ...(typeof protectedStories === 'boolean' && { protectedStories }),
                ...(typeof profileVisitAlerts === 'boolean' && { profileVisitAlerts }),
                ...(typeof notificationPostAlerts === 'boolean' && { notificationPostAlerts }),
                ...(typeof notificationStoryAlerts === 'boolean' && { notificationStoryAlerts }),
                ...(typeof notificationSecurityAlerts === 'boolean' && { notificationSecurityAlerts }),
                ...(typeof quantumDecayEnabled === 'boolean' && { quantumDecayEnabled }),
                ...(Number.isInteger(quantumDecayDays) && [7, 30, 90].includes(quantumDecayDays) && { quantumDecayDays }),
                ...(typeof neuralGuardianEnabled === 'boolean' && { neuralGuardianEnabled, ...(neuralGuardianEnabled ? { isPrivate: true } : {}) }),
                ...(Array.isArray(links) && { links: links.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean) }),
                ...(typeof creatorModeEnabled === 'boolean' && { creatorModeEnabled }),
                ...(typeof creatorHighResUploads === 'boolean' && { creatorHighResUploads }),
                ...(typeof creatorAnonymousShield === 'boolean' && { creatorAnonymousShield }),
                ...(typeof creatorDeepAnalytics === 'boolean' && { creatorDeepAnalytics }),
                ...(requestCreatorVerification === true && {
                    creatorVerificationRequestedAt: new Date(),
                    creatorVerificationStatus: 'PENDING',
                    creatorVerifiedAt: null,
                    creatorVerificationReviewedById: null
                })
            },
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profileImage: true,
                riskScore: true,
                isPrivate: true,
                showActivityStatus: true,
                readReceipts: true,
                ghostViewer: true,
                protectedStories: true,
                profileVisitAlerts: true,
                notificationPostAlerts: true,
                notificationStoryAlerts: true,
                notificationSecurityAlerts: true,
                quantumDecayEnabled: true,
                quantumDecayDays: true,
                neuralGuardianEnabled: true,
                creatorModeEnabled: true,
                creatorVerificationRequestedAt: true,
                creatorVerificationStatus: true,
                creatorVerifiedAt: true,
                creatorHighResUploads: true,
                creatorAnonymousShield: true,
                creatorDeepAnalytics: true,
                links: true
            }
        });

        return c.json({
            success: true,
            // Older accounts predate professional links and therefore have null here.
            // The client always receives a usable collection.
            data: { ...updatedUser, links: Array.isArray(updatedUser.links) ? updatedUser.links : [] }
        });
    } catch (error) {
        console.error("Profile Update Error:", error);
        return c.json({ success: false, error: "Neural recalibration failed" }, 500);
    }
};

export const getResonance = async (c) => {
    try {
        const targetUsername = c.req.param('username');
        const currentUser = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        // Find posts liked by BOTH users
        const mutualPosts = await prisma.post.findMany({
            where: {
                AND: [
                    { likes: { some: { userId: currentUser.userId } } },
                    { likes: { some: { user: { username: targetUsername } } } }
                ]
            },
            include: {
                user: { select: { username: true, profileImage: true } },
                _count: { select: { likes: true, comments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return c.json({ success: true, data: mutualPosts });
    } catch (error) {
        console.error("Resonance Error:", error);
        return c.json({ success: false, error: "Neural resonance failed" }, 500);
    }
};

export const getSuggestedUsers = async (c) => {
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const limit = parseInt(c.req.query('limit')) || 10;

        // Fetch users for the story bar (suggested users)
        const users = await prisma.user.findMany({
            take: limit,
            // Administrative accounts are operational accounts, not social profiles.
            // Keeping this rule in the API prevents them appearing in any story-bar
            // fallback, including for clients with a fresh cache.
            where: {
                role: { not: 'ADMIN' }
            },
            select: {
                id: true,
                username: true,
                profileImage: true,
                role: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return c.json({ success: true, data: users });
    } catch (error) {
        console.error("Suggested Users Error:", error);
        return c.json({ success: false, error: "Failed to fetch user signatures" }, 500);
    }
};
