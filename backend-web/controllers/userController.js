import getPrisma from '../prisma/db.js';

const scoreSearchMatch = (user, query) => {
    const username = user.username.toLocaleLowerCase();
    const name = (user.name || '').toLocaleLowerCase();

    if (username === query) return 0;
    if (name === query) return 1;
    if (username.startsWith(query)) return 2;
    if (name.startsWith(query)) return 3;
    if (username.includes(query)) return 4;
    return 5;
};

export const getProfile = async (c) => {
    const username = c.req.param('username');
    try {
        const prisma = getPrisma(c.env);
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

        // Check if viewer has a pending follow request to this user
        const followRequest = !isOwnProfile && viewerId && user.isPrivate
            ? await prisma.followRequest.findFirst({ where: { fromId: viewerId, toId: user.id, status: 'PENDING' } })
            : null;
        const isRequested = Boolean(followRequest);
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
                isRequested,
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
        const prisma = getPrisma(c.env);
        
        const target = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, isPrivate: true } });
        
        if (!target) return c.json({ success: false, error: 'Identity not found' }, 404);
        if (target.id === viewerId) return c.json({ success: false, error: 'You cannot follow your own profile' }, 400);
        
        const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: target.id } } });
        
        // If already following → unfollow using raw SQL (Turso rejects Prisma's delete subquery)
        if (existing) {
            await prisma.$executeRaw`DELETE FROM follow WHERE id = ${existing.id}`;
            // Also clean up any followrequest row (accepted or pending) so isRequested doesn't linger
            await prisma.$executeRaw`DELETE FROM followrequest WHERE fromId = ${viewerId} AND toId = ${target.id}`.catch(() => {});

            const [targetFollowers, viewerFollowing] = await prisma.$transaction([
                prisma.follow.count({ where: { followingId: target.id } }),
                prisma.follow.count({ where: { followerId: viewerId } })
            ]);
            return c.json({ success: true, following: false, requested: false, counts: { targetFollowers, viewerFollowing } });
        }

        // Private account → create follow request instead of immediate follow
        if (target.isPrivate) {
            // Check if request already pending → cancel it (un-request)
            const existingRequest = await prisma.followRequest.findUnique({
                where: { fromId_toId: { fromId: viewerId, toId: target.id } }
            });
            if (existingRequest) {
                await prisma.$executeRaw`DELETE FROM followrequest WHERE id = ${existingRequest.id}`;
                const [targetFollowers, viewerFollowing] = await prisma.$transaction([
                    prisma.follow.count({ where: { followingId: target.id } }),
                    prisma.follow.count({ where: { followerId: viewerId } })
                ]);
                return c.json({ success: true, following: false, requested: false, counts: { targetFollowers, viewerFollowing } });
            }
            // Create new pending request
            await prisma.followRequest.create({ data: { fromId: viewerId, toId: target.id, status: 'PENDING' } });
            const [targetFollowers, viewerFollowing] = await prisma.$transaction([
                prisma.follow.count({ where: { followingId: target.id } }),
                prisma.follow.count({ where: { followerId: viewerId } })
            ]);
            return c.json({ success: true, following: false, requested: true, counts: { targetFollowers, viewerFollowing } });
        }

        // Public account → immediate follow
        await prisma.follow.create({ data: { followerId: viewerId, followingId: target.id } });
        const [targetFollowers, viewerFollowing] = await prisma.$transaction([
            prisma.follow.count({ where: { followingId: target.id } }),
            prisma.follow.count({ where: { followerId: viewerId } })
        ]);
        return c.json({ success: true, following: true, requested: false, counts: { targetFollowers, viewerFollowing }, message: `Following @${target.username}` });
    } catch (error) {
        console.error('Follow toggle error:', error.message, error.stack);
        return c.json({ success: false, error: 'Follow status could not be updated', detail: error.message }, 500);
    }
};

export const getPendingFollowRequests = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const prisma = getPrisma(c.env);

        const requests = await prisma.followRequest.findMany({
            where: { toId: userId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
                from: { select: { id: true, username: true, name: true, profileImage: true } }
            }
        });

        return c.json({ success: true, data: requests });
    } catch (error) {
        console.error('Get follow requests error:', error);
        return c.json({ success: false, error: 'Could not load follow requests' }, 500);
    }
};

export const acceptFollowRequest = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const requestId = parseInt(c.req.param('id'));
        const prisma = getPrisma(c.env);

        const request = await prisma.followRequest.findUnique({ where: { id: requestId } });
        if (!request) return c.json({ success: false, error: 'Request not found' }, 404);
        if (request.toId !== userId) return c.json({ success: false, error: 'Not authorized' }, 403);

        // Create the follow + mark request accepted using raw SQL (Turso compatibility)
        await prisma.$executeRaw`INSERT OR IGNORE INTO follow (followerId, followingId, createdAt) VALUES (${request.fromId}, ${request.toId}, ${new Date().toISOString()})`;
        await prisma.$executeRaw`UPDATE followrequest SET status = 'ACCEPTED' WHERE id = ${requestId}`;

        return c.json({ success: true });
    } catch (error) {
        console.error('Accept follow request error:', error);
        return c.json({ success: false, error: 'Could not accept request' }, 500);
    }
};

export const rejectFollowRequest = async (c) => {
    try {
        const userId = c.get('user')?.userId;
        const requestId = parseInt(c.req.param('id'));
        const prisma = getPrisma(c.env);

        const request = await prisma.followRequest.findUnique({ where: { id: requestId } });
        if (!request) return c.json({ success: false, error: 'Request not found' }, 404);
        if (request.toId !== userId) return c.json({ success: false, error: 'Not authorized' }, 403);

        await prisma.$executeRaw`DELETE FROM followrequest WHERE id = ${requestId}`;
        // Also remove any existing follow row so the requester can't still see content
        await prisma.$executeRaw`DELETE FROM follow WHERE followerId = ${request.fromId} AND followingId = ${request.toId}`.catch(() => {});

        return c.json({ success: true });
    } catch (error) {
        console.error('Reject follow request error:', error);
        return c.json({ success: false, error: 'Could not reject request' }, 500);
    }
};

export const getSavedItems = async (c) => {
    try {
        const user = c.get('user');
        const prisma = getPrisma(c.env);

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
        const prisma = getPrisma(c.env);
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
        return c.json({ 
            success: true, 
            data: { 
                exportedAt: new Date().toISOString(), 
                profile: {
                    ...profile,
                    links: profile?.links ? JSON.parse(profile.links) : []
                }, 
                posts, 
                stories, 
                comments, 
                likes, 
                savedPosts, 
                followers, 
                following 
            } 
        });
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
        const prisma = getPrisma(c.env);
        const [storyViews, profileVisits] = await prisma.$transaction([
            prisma.storyView.deleteMany({ where: { userId } }),
            prisma.profileVisit.deleteMany({ where: { visitorId: userId } }),
            prisma.$executeRaw`UPDATE user SET notificationClearedAt = ${new Date().toISOString()} WHERE id = ${userId}`
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
        const prisma = getPrisma(c.env);
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
        const prisma = getPrisma(c.env);
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
        const prisma = getPrisma(c.env);

        // Build dynamic UPDATE query for Turso compatibility
        const updates = [];
        const values = [];
        
        if (name) { updates.push('name = ?'); values.push(name); }
        if (bio) { updates.push('bio = ?'); values.push(bio); }
        if (profileImage) { updates.push('profileImage = ?'); values.push(profileImage); }
        if (username) { updates.push('username = ?'); values.push(username); }
        if (typeof isPrivate === 'boolean') { updates.push('isPrivate = ?'); values.push(isPrivate ? 1 : 0); }
        if (typeof showActivityStatus === 'boolean') { updates.push('showActivityStatus = ?'); values.push(showActivityStatus ? 1 : 0); }
        if (typeof readReceipts === 'boolean') { updates.push('readReceipts = ?'); values.push(readReceipts ? 1 : 0); }
        if (typeof ghostViewer === 'boolean') { updates.push('ghostViewer = ?'); values.push(ghostViewer ? 1 : 0); }
        if (typeof protectedStories === 'boolean') { updates.push('protectedStories = ?'); values.push(protectedStories ? 1 : 0); }
        if (typeof profileVisitAlerts === 'boolean') { updates.push('profileVisitAlerts = ?'); values.push(profileVisitAlerts ? 1 : 0); }
        if (typeof notificationPostAlerts === 'boolean') { updates.push('notificationPostAlerts = ?'); values.push(notificationPostAlerts ? 1 : 0); }
        if (typeof notificationStoryAlerts === 'boolean') { updates.push('notificationStoryAlerts = ?'); values.push(notificationStoryAlerts ? 1 : 0); }
        if (typeof notificationSecurityAlerts === 'boolean') { updates.push('notificationSecurityAlerts = ?'); values.push(notificationSecurityAlerts ? 1 : 0); }
        if (typeof quantumDecayEnabled === 'boolean') { updates.push('quantumDecayEnabled = ?'); values.push(quantumDecayEnabled ? 1 : 0); }
        if (Number.isInteger(quantumDecayDays) && [7, 30, 90].includes(quantumDecayDays)) { updates.push('quantumDecayDays = ?'); values.push(quantumDecayDays); }
        if (typeof neuralGuardianEnabled === 'boolean') { 
            updates.push('neuralGuardianEnabled = ?'); 
            values.push(neuralGuardianEnabled ? 1 : 0);
            // Turning ON forces private. Turning OFF also removes the private lock.
            updates.push('isPrivate = ?'); 
            values.push(neuralGuardianEnabled ? 1 : 0);
        }
        if (Array.isArray(links)) { 
            updates.push('links = ?'); 
            values.push(JSON.stringify(links.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean))); 
        }
        if (typeof creatorModeEnabled === 'boolean') { updates.push('creatorModeEnabled = ?'); values.push(creatorModeEnabled ? 1 : 0); }
        if (typeof creatorHighResUploads === 'boolean') { updates.push('creatorHighResUploads = ?'); values.push(creatorHighResUploads ? 1 : 0); }
        if (typeof creatorAnonymousShield === 'boolean') { updates.push('creatorAnonymousShield = ?'); values.push(creatorAnonymousShield ? 1 : 0); }
        if (typeof creatorDeepAnalytics === 'boolean') { updates.push('creatorDeepAnalytics = ?'); values.push(creatorDeepAnalytics ? 1 : 0); }
        if (requestCreatorVerification === true) {
            updates.push('creatorVerificationRequestedAt = ?', 'creatorVerificationStatus = ?', 'creatorVerifiedAt = ?', 'creatorVerificationReviewedById = ?');
            values.push(new Date().toISOString(), 'PENDING', null, null);
        }
        
        // Execute raw SQL if there are updates
        if (updates.length > 0) {
            const query = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
            values.push(user.userId);
            await prisma.$executeRawUnsafe(query, ...values);
        }
        
        // Fetch updated user for response
        const updatedUser = await prisma.user.findUnique({
            where: { id: user.userId },
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
            data: { 
                ...updatedUser, 
                links: updatedUser.links ? JSON.parse(updatedUser.links) : [] 
            }
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
        const prisma = getPrisma(c.env);

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
        const prisma = getPrisma(c.env);
        const viewerId = c.get('user')?.userId;
        const limit = parseInt(c.req.query('limit')) || 10;

        // Get accounts I follow
        const following = viewerId ? await prisma.follow.findMany({
            where: { followerId: viewerId },
            select: { followingId: true }
        }) : [];
        const followingIds = following.map(f => f.followingId);

        // Fetch public users + private users I follow (exclude ADMIN)
        const users = await prisma.user.findMany({
            take: limit * 3, // Fetch more to filter later
            where: {
                role: { not: 'ADMIN' }
            },
            select: {
                id: true,
                username: true,
                profileImage: true,
                role: true,
                isPrivate: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Filter: own account + public + private accounts I follow
        const filtered = users.filter(u => {
            if (viewerId && u.id === viewerId) return true; // Own account
            if (!u.isPrivate) return true; // Public
            return viewerId && followingIds.includes(u.id); // Private but following
        }).slice(0, limit);

        return c.json({ success: true, data: filtered });
    } catch (error) {
        console.error("Suggested Users Error:", error);
        return c.json({ success: false, error: "Failed to fetch user signatures" }, 500);
    }
};

// Search returns only the public profile card fields. Private profiles remain
// discoverable, but their protected posts are still enforced by getProfile.
export const searchUsers = async (c) => {
    try {
        const viewerId = c.get('user')?.userId;
        const requestedQuery = (c.req.query('q') || '').normalize('NFKC').trim().replace(/^@+/, '');
        const query = requestedQuery.slice(0, 64);
        const requestedLimit = Number.parseInt(c.req.query('limit'), 10);
        const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 10;

        if (!query) return c.json({ success: true, data: [] });

        const candidates = await getPrisma(c.env).user.findMany({
            where: {
                AND: [
                    // Operational admin accounts are not searchable. An admin can
                    // still find their own profile without exposing it to others.
                    {
                        OR: [
                            { role: { not: 'ADMIN' } },
                            ...(viewerId ? [{ id: viewerId }] : [])
                        ]
                    },
                    {
                        OR: [
                            { username: { contains: query } },
                            { name: { contains: query } }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                name: true,
                profileImage: true,
                isPrivate: true
            },
            // Fetch a small candidate set, then rank exact and prefix matches
            // ahead of partial matches for an Instagram-style result order.
            take: 40
        });

        const normalizedQuery = query.toLocaleLowerCase();
        const users = candidates
            .sort((left, right) => (
                scoreSearchMatch(left, normalizedQuery) - scoreSearchMatch(right, normalizedQuery)
                || left.username.localeCompare(right.username)
            ))
            .slice(0, limit);

        return c.json({ success: true, data: users });
    } catch (error) {
        console.error('User search failed:', error);
        return c.json({ success: false, error: 'Could not search profiles right now.' }, 500);
    }
};
