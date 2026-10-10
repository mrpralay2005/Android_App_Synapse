import getPrisma from '../prisma/db.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getFeed = async (c) => {
    try {
        const user = c.get('user');
        const prisma = getPrisma(c.env);
        const sort = c.req.query('sort') === 'latest' ? 'latest' : 'popular';

        const viewerId = user?.userId;
        const posts = await prisma.post.findMany({
            take: 30,
            where: {
                AND: [
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                    { OR: [
                        { user: { isPrivate: false } },
                        ...(viewerId ? [{ userId: viewerId }, { user: { followers: { some: { followerId: viewerId } } } }] : [])
                    ] }
                ]
            },
            // Popular prioritizes genuine social engagement; newest content is the
            // tie-breaker. Latest is strictly chronological.
            orderBy: sort === 'popular'
                ? [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }]
                : { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profileImage: true,
                        isPrivate: true,
                        ...(viewerId ? {
                            followers: {
                                where: { followerId: viewerId },
                                select: { id: true }
                            },
                            receivedFollowRequests: {
                                where: { fromId: viewerId },
                                select: { id: true, status: true }
                            }
                        } : {})
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        savedBy: true
                    }
                },
                likes: user ? {
                    where: { userId: user.userId },
                    select: { id: true }
                } : false,
                savedBy: user ? {
                    where: { userId: user.userId },
                    select: { id: true }
                } : false
            }
        });

        // Transform to include helpful flags
        const formattedPosts = posts.map(post => ({
            ...post,
            isLiked: (post.likes?.length || 0) > 0,
            isSaved: (post.savedBy?.length || 0) > 0,
            user: {
                ...post.user,
                isFollowing: viewerId ? (post.user.followers?.length || 0) > 0 : false,
                isRequested: viewerId ? (post.user.receivedFollowRequests?.filter(req => req.status === 'PENDING').length || 0) > 0 : false,
                followers: undefined,
                receivedFollowRequests: undefined
            },
            likes: undefined, // remove raw array
            savedBy: undefined // remove raw array
        }));

        return c.json(formattedPosts);
    } catch (error) {
        console.error("Neural Feed Sync Error:", error);
        return c.json({ success: false, error: "Feed synchronization failed" }, 500);
    }
};

// A personal activity stream. Security entries always belong to the signed-in
// identity; social entries are limited to identities the user follows.
export const getNotifications = async (c) => {
    try {
        const viewerId = c.get('user')?.userId;
        if (!viewerId) return c.json({ success: false, error: 'Neural authorization missing' }, 401);
        const prisma = getPrisma(c.env);
        
        // Fetch viewer to get notification preferences
        const viewer = await prisma.user.findUnique({
            where: { id: viewerId },
            select: {
                notificationClearedAt: true,
                notificationPostAlerts: true,
                notificationStoryAlerts: true,
                notificationSecurityAlerts: true,
                profileVisitAlerts: true
            }
        });
        
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const clearedAt = viewer?.notificationClearedAt ? new Date(viewer.notificationClearedAt) : null;
        const activitySince = clearedAt && clearedAt.getTime() > since.getTime() ? clearedAt : since;

        const following = await prisma.follow.findMany({
            where: { followerId: viewerId },
            select: { followingId: true }
        });
        const followedIds = following.map(link => link.followingId);

        const [posts, stories, sessions, profileVisits, followRequests, betaNotifications] = await Promise.all([
            viewer?.notificationPostAlerts !== false ? prisma.post.findMany({
                where: { userId: { in: followedIds }, createdAt: { gte: activitySince } },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, user: { select: { username: true, name: true, profileImage: true } } }
            }).catch(e => { console.warn('[NOTIF] posts query error:', e?.message || e); return []; }) : Promise.resolve([]),
            viewer?.notificationStoryAlerts !== false ? prisma.story.findMany({
                where: { userId: { in: followedIds }, expiresAt: { gt: new Date() }, createdAt: { gte: activitySince } },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, user: { select: { username: true, name: true, profileImage: true } } }
            }).catch(e => { console.warn('[NOTIF] stories query error:', e?.message || e); return []; }) : Promise.resolve([]),
            viewer?.notificationSecurityAlerts !== false ? prisma.session.findMany({
                where: { userId: viewerId, createdAt: { gte: activitySince } },
                take: 8,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, userAgent: true, ipAddress: true }
            }).catch(e => { console.warn('[NOTIF] sessions query error:', e?.message || e); return []; }) : Promise.resolve([]),
            viewer?.profileVisitAlerts ? prisma.profileVisit.findMany({
                where: { profileOwnerId: viewerId, createdAt: { gte: activitySince } },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, visitor: { select: { username: true, name: true, profileImage: true } } }
            }).catch(e => { console.warn('[NOTIF] profileVisits query error:', e?.message || e); return []; }) : Promise.resolve([]),
            // Follow requests sent TO this user (pending only)
            prisma.followRequest.findMany({
                where: { toId: viewerId, status: 'PENDING', createdAt: { gte: activitySince } },
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { id: true, createdAt: true, from: { select: { username: true, name: true, profileImage: true } } }
            }).catch(e => { console.warn('[NOTIF] followRequests query error:', e?.message || e); return []; }),
            // Beta notifications for this user (both applicant notifications and admin alerts)
            prisma.betaNotification ? prisma.betaNotification.findMany({
                where: { userId: viewerId, createdAt: { gte: activitySince } },
                take: 20,
                orderBy: { createdAt: 'desc' }
            }).catch(e => { console.warn('[NOTIF] betaNotification query error:', e?.message || e); return []; }) : Promise.resolve([])
        ]);

        const activity = [
            ...(posts || []).filter(p => p?.user).map(post => ({ id: `post-${post.id}`, type: 'POST', createdAt: post.createdAt, actor: post.user, title: `${post.user?.name || post.user?.username || 'User'} shared a post`, detail: 'New post from an identity you follow.' })),
            ...(stories || []).filter(s => s?.user).map(story => ({ id: `story-${story.id}`, type: 'STORY', createdAt: story.createdAt, actor: story.user, title: `${story.user?.name || story.user?.username || 'User'} added a story`, detail: 'A fresh story is available for the next 24 hours.' })),
            ...(sessions || []).map(session => ({ id: `session-${session.id}`, type: 'SECURITY', createdAt: session.createdAt, actor: null, title: 'New sign-in to your account', detail: `${session.userAgent || 'Unknown device'} · ${session.ipAddress || 'Location protected'}` })),
            ...(profileVisits || []).map(visit => ({ id: `profile-visit-${visit.id}`, type: 'PROFILE_VISIT', createdAt: visit.createdAt, actor: visit.visitor || null, title: `${visit.visitor?.name || visit.visitor?.username || 'Someone'} visited your profile`, detail: 'A profile visit was recorded in your analytics.' })),
            ...(followRequests || []).map(req => ({ id: `follow-req-${req.id}`, type: 'FOLLOW_REQUEST', requestId: req.id, createdAt: req.createdAt, actor: req.from || null, title: `${req.from?.name || req.from?.username || 'Someone'} wants to follow you`, detail: 'Tap to accept or decline this follow request.' })),
            ...(betaNotifications || []).map(bn => ({
                id: `beta-notif-${bn.id}`,
                type: bn.type,
                createdAt: bn.createdAt,
                actor: bn.actorUsername ? { username: bn.actorUsername, name: bn.actorName, profileImage: bn.actorImage } : null,
                title: bn.title,
                detail: bn.detail
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

        return c.json({ success: true, data: activity });
    } catch (error) {
        console.error('Notification stream error:', error);
        return c.json({ success: false, error: 'Unable to load your activity', details: error?.message }, 500);
    }
};

export const clearNotifications = async (c) => {
    try {
        const viewerId = c.get('user')?.userId;
        if (!viewerId) return c.json({ success: false, error: 'Neural authorization missing' }, 401);
        const prisma = getPrisma(c.env);
        await prisma.$executeRaw`UPDATE user SET notificationClearedAt = ${new Date().toISOString()} WHERE id = ${viewerId}`;
        return c.json({ success: true, message: 'Activity cleared' });
    } catch (error) {
        console.error('Notification clear error:', error);
        return c.json({ success: false, error: 'Unable to clear activity' }, 500);
    }
};

export const getUploadUrl = async (c) => {
    try {
        const { fileName, fileType } = await c.req.json();
        const user = c.get('user');

        if (!c.env.SUPABASE_STORAGE_URL || !c.env.SUPABASE_ACCESS_KEY_ID || !c.env.SUPABASE_SECRET_ACCESS_KEY || !c.env.SUPABASE_BUCKET_NAME) {
            return c.json({ success: false, error: "Cloud Config Missing" }, 503);
        }

        const s3 = new S3Client({
            region: c.env.SUPABASE_REGION || "ap-northeast-1",
            endpoint: c.env.SUPABASE_STORAGE_URL,
            credentials: {
                accessKeyId: c.env.SUPABASE_ACCESS_KEY_ID,
                secretAccessKey: c.env.SUPABASE_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        });

        const key = `${user.userId}/${Date.now()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: c.env.SUPABASE_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const projectUrl = c.env.SUPABASE_STORAGE_URL.split('/storage')[0].replace('.storage', '');
        const publicUrl = `${projectUrl}/storage/v1/object/public/${c.env.SUPABASE_BUCKET_NAME}/${key}`;

        return c.json({ success: true, uploadUrl, publicUrl });
    } catch (error) {
        console.error("Neural Keys Error:", error);
        return c.json({ success: false, error: "Failed to generate uplink keys" }, 500);
    }
};

export const createPost = async (c) => {
    const requestId = `BACKEND_POST_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log(`\n[${requestId}] ========== BACKEND: CREATE POST REQUEST ==========`);
    console.log(`[${requestId}] Timestamp:`, new Date().toISOString());
    
    try {
        const { uploadId, caption, mediaUrl, type, postPassword, thumbnailUrl } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        console.log(`[${requestId}] Request Data:`, {
            uploadId,
            userId: user?.userId || user?.id,
            captionLength: caption?.length || 0,
            mediaUrlLength: mediaUrl?.length || 0,
            type,
            hasPassword: !!postPassword,
            hasThumbnail: !!thumbnailUrl
        });

        if (!user) {
            console.error(`[${requestId}] ❌ No user in request`);
            return c.json({ success: false, error: "Identity missing" }, 401);
        }
        
        if (!mediaUrl) {
            console.error(`[${requestId}] ❌ No mediaUrl provided`);
            return c.json({ success: false, error: "Media resource required" }, 400);
        }

        // INSTAGRAM-STYLE IDEMPOTENCY: Check if uploadId already exists
        // BACKWARDS COMPATIBLE: Skip if uploadId column doesn't exist in DB yet
        if (uploadId) {
            try {
                console.log(`[${requestId}] Checking for existing post with uploadId:`, uploadId);
                const existingPost = await prisma.post.findUnique({
                    where: { uploadId },
                    include: {
                        user: {
                            select: { username: true, name: true, profileImage: true }
                        }
                    }
                });

                if (existingPost) {
                    console.log(`[${requestId}] ✅ DUPLICATE DETECTED - Returning existing post (id: ${existingPost.id})`);
                    console.log(`[${requestId}] ========== REQUEST COMPLETE (IDEMPOTENT) ==========\n`);
                    return c.json({ 
                        success: true, 
                        data: existingPost,
                        duplicate: true  // Flag to indicate this was a duplicate
                    }, 200);
                }
            } catch (uploadIdError) {
                // Column doesn't exist yet - continue without idempotency check
                console.log(`[${requestId}] ⚠️ uploadId check skipped (column may not exist):`, uploadIdError.message);
            }
        }

        console.log(`[${requestId}] Fetching user quantum settings...`);
        const owner = await prisma.user.findUnique({ where: { id: user.userId }, select: { quantumDecayEnabled: true, quantumDecayDays: true } });
        const expiresAt = owner?.quantumDecayEnabled ? new Date(Date.now() + owner.quantumDecayDays * 24 * 60 * 60 * 1000) : null;
        
        console.log(`[${requestId}] Creating new post in database...`);
        const dbStartTime = Date.now();
        
        // BACKWARDS COMPATIBLE: Only include uploadId if it exists in schema
        const postData = {
            caption: caption || "",
            mediaUrl,
            type: type || 'IMAGE',
            postPassword: postPassword || null,
            thumbnailUrl: thumbnailUrl || null,
            userId: user.id || user.userId,
            expiresAt
        };
        
        // Try to include uploadId - if column doesn't exist, it will be ignored
        if (uploadId) {
            postData.uploadId = uploadId;
        }
        
        const post = await prisma.post.create({
            data: postData,
            include: {
                user: {
                    select: { username: true, name: true, profileImage: true }
                }
            }
        });

        const dbDuration = Date.now() - dbStartTime;
        console.log(`[${requestId}] ✅ Post created successfully`);
        console.log(`[${requestId}] Post ID:`, post.id);
        console.log(`[${requestId}] Upload ID:`, post.uploadId);
        console.log(`[${requestId}] DB Duration:`, `${dbDuration}ms`);
        console.log(`[${requestId}] ========== REQUEST COMPLETE ==========\n`);

        return c.json({ success: true, data: post }, 201);
    } catch (error) {
        console.error(`[${requestId}] ❌ EXCEPTION:`, error);
        console.error(`[${requestId}] Error Message:`, error.message);
        console.error(`[${requestId}] Error Stack:`, error.stack);
        console.error(`[${requestId}] ========== REQUEST FAILED ==========\n`);
        
        return c.json({
            success: false,
            error: "Post transmission failed",
            details: error.message,
            stack: error.stack
        }, 500);
    }
};

export const toggleLike = async (c) => {
    try {
        const postId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId: user.userId,
                    postId
                }
            }
        });

        if (existingLike) {
            await prisma.like.delete({ where: { id: existingLike.id } });
            return c.json({ success: true, action: 'unliked' });
        } else {
            await prisma.like.create({
                data: {
                    userId: user.userId,
                    postId
                }
            });
            return c.json({ success: true, action: 'liked' });
        }
    } catch (error) {
        console.error("Neural Like Toggle Error:", error);
        return c.json({ success: false, error: "Link interaction failed" }, 500);
    }
};

export const addComment = async (c) => {
    try {
        const postId = parseInt(c.req.param('id'));
        const { content } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        if (!content) return c.json({ success: false, error: "Synapse content required" }, 400);

        const comment = await prisma.comment.create({
            data: {
                content,
                userId: user.userId,
                postId
            },
            include: {
                user: {
                    select: { username: true, profileImage: true }
                }
            }
        });

        return c.json({ success: true, data: comment });
    } catch (error) {
        return c.json({ success: false, error: "Comment synchronization failed" }, 500);
    }
};

export const toggleSave = async (c) => {
    try {
        const postId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        const existingSave = await prisma.savedPost.findUnique({
            where: {
                userId_postId: {
                    userId: user.userId,
                    postId
                }
            }
        });

        if (existingSave) {
            await prisma.savedPost.delete({ where: { id: existingSave.id } });
            return c.json({ success: true, action: 'unsaved' });
        } else {
            await prisma.savedPost.create({
                data: {
                    userId: user.userId,
                    postId
                }
            });
            return c.json({ success: true, action: 'saved' });
        }
    } catch (error) {
        return c.json({ success: false, error: "Archive interaction failed" }, 500);
    }
};

export const getComments = async (c) => {
    try {
        const postId = parseInt(c.req.param('id'));
        const prisma = getPrisma(c.env);

        const comments = await prisma.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: { username: true, profileImage: true }
                }
            }
        });

        return c.json(comments);
    } catch (error) {
        return c.json({ success: false, error: "Comment retrieval failed" }, 500);
    }
};

export const getStories = async (c) => {
    try {
        const prisma = getPrisma(c.env);
        const now = new Date();
        const viewerId = c.get('user')?.userId;

        console.log('[getStories] ViewerId:', viewerId);

        // Get ALL unexpired stories first
        const allStories = await prisma.story.findMany({
            where: { expiresAt: { gt: now } },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        profileImage: true,
                        role: true,
                        showActivityStatus: true,
                        lastActiveAt: true,
                        isPrivate: true
                    }
                },
                views: viewerId ? {
                    where: { userId: viewerId },
                    select: { id: true, viewedAt: true }
                } : false,
                likes: viewerId ? {
                    where: { userId: viewerId },
                    select: { id: true }
                } : false
            },
            orderBy: { createdAt: 'desc' }
        });

        // If no viewer, only show public non-protected account stories
        if (!viewerId) {
            const publicStories = allStories.filter(s => !s.user.isPrivate && !s.isProtected).map(s => ({
                ...s,
                hasViewed: false,
                isLiked: false
            }));
            console.log('[getStories] No viewer - returning', publicStories.length, 'public stories');
            return c.json({ success: true, data: publicStories });
        }

        // Get accounts the viewer follows
        const following = await prisma.follow.findMany({
            where: { followerId: viewerId },
            select: { followingId: true }
        });
        const followingIds = following.map(f => f.followingId);

        // Filter: own stories + public non-protected stories + stories from accounts I follow
        const filteredStories = allStories.filter(story => {
            if (story.userId === viewerId) return true; // Own story
            // Neural Vault: protected stories are follower-only regardless of account privacy
            if (story.isProtected) return followingIds.includes(story.userId);
            // Stealth Shield: private account stories are follower-only
            if (story.user.isPrivate) return followingIds.includes(story.userId);
            // Public non-protected stories are accessible
            return true;
        }).map(story => ({
            ...story,
            hasViewed: story.views && story.views.length > 0,
            isLiked: story.likes && story.likes.length > 0
        }));

        console.log('[getStories] Total:', allStories.length, 'Accessible:', filteredStories.length);
        return c.json({ success: true, data: filteredStories });
    } catch (error) {
        console.error("Story Retrieval Error:", error);
        return c.json({ success: false, error: "Failed to fetch stories" }, 500);
    }
};

export const createStory = async (c) => {
    try {
        const { mediaUrl, type } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        if (!mediaUrl) return c.json({ success: false, error: "Media resource required" }, 400);

        // Story expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const owner = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { protectedStories: true }
        });
        const story = await prisma.story.create({
            data: {
                mediaUrl,
                type: type || 'IMAGE',
                userId: user.userId,
                expiresAt,
                // Vault stories remain follower-only even if the preference is
                // changed after publishing.
                isProtected: owner?.protectedStories ?? false
            },
            include: {
                user: {
                    select: { id: true, username: true, profileImage: true }
                }
            }
        });

        return c.json({ success: true, data: story }, 201);
    } catch (error) {
        console.error("Story Creation Error:", error);
        return c.json({ success: false, error: "Failed to broadcast story" }, 500);
    }
};

export const deleteStory = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        // Check if story exists and user owns it
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { id: true, userId: true }
        });

        if (!story) {
            return c.json({ success: false, error: "Story not found" }, 404);
        }
        
        if (story.userId !== user.userId) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // Use raw SQL to delete - Turso doesn't support deleteMany properly
        // CASCADE is defined in schema, but being explicit with raw queries
        await prisma.$executeRaw`DELETE FROM StoryView WHERE storyId = ${storyId}`;
        await prisma.$executeRaw`DELETE FROM StoryMessage WHERE storyId = ${storyId}`;
        await prisma.$executeRaw`DELETE FROM Story WHERE id = ${storyId}`;

        return c.json({ success: true, message: "Story deleted successfully" });
    } catch (error) {
        console.error('[deleteStory] Error:', error.message);
        return c.json({ 
            success: false, 
            error: "Failed to delete story", 
            details: error.message
        }, 500);
    }
};

export const deletePost = async (c) => {
    try {
        const postId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        // Check if post exists and user owns it
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, userId: true }
        });

        if (!post) {
            return c.json({ success: false, error: "Post not found" }, 404);
        }
        
        if (post.userId !== user.userId) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        // Use raw SQL to delete - Turso doesn't support deleteMany properly
        // Delete related records first, then the post
        await prisma.$executeRaw`DELETE FROM Like WHERE postId = ${postId}`;
        await prisma.$executeRaw`DELETE FROM Comment WHERE postId = ${postId}`;
        await prisma.$executeRaw`DELETE FROM SavedPost WHERE postId = ${postId}`;
        await prisma.$executeRaw`DELETE FROM Post WHERE id = ${postId}`;

        return c.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        console.error('[deletePost] Error:', error.message);
        return c.json({ 
            success: false, 
            error: "Failed to delete post", 
            details: error.message
        }, 500);
    }
};

export const viewStory = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        // Optimization: Don't fetch story body just to check owner, but we need ownerId.
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { 
                userId: true,
                isProtected: true,
                user: { select: { isPrivate: true } }
            }
        });

        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        // Filter: Don't count owner's own view
        if (story.userId === user.userId) {
            return c.json({ success: true, ignored: true });
        }

        // Access check: If story is protected (Neural Vault) or author is private (Stealth Shield),
        // only followers can view.
        if (story.isProtected || story.user?.isPrivate) {
            const isFollower = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: user.userId,
                        followingId: story.userId
                    }
                }
            });
            if (!isFollower) {
                return c.json({ success: false, error: "Access denied" }, 403);
            }
        }

        const viewer = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { ghostViewer: true, readReceipts: true }
        });
        // Wraith Mode never leaves a view. Turning feedback off also suppresses
        // the viewer receipt while preserving normal story access.
        if (viewer?.ghostViewer || !viewer?.readReceipts) {
            return c.json({ success: true, anonymous: true });
        }

        await prisma.storyView.upsert({
            where: {
                storyId_userId: {
                    storyId: storyId,
                    userId: user.userId
                }
            },
            update: { viewedAt: new Date() },
            create: {
                storyId: storyId,
                userId: user.userId
            }
        });

        return c.json({ success: true });
    } catch (error) {
        console.error("View Sync Error:", error);
        return c.json({ success: false, error: "Failed to record view" }, 500);
    }
};

export const replyToStory = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const { content } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        if (!content) return c.json({ success: false, error: "Content required" }, 400);

        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { 
                userId: true,
                isProtected: true,
                user: { select: { isPrivate: true } }
            }
        });
        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        if (story.userId !== user.userId && (story.isProtected || story.user?.isPrivate)) {
            const isFollower = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: user.userId,
                        followingId: story.userId
                    }
                }
            });
            if (!isFollower) {
                return c.json({ success: false, error: "Access denied" }, 403);
            }
        }

        const message = await prisma.storyMessage.create({
            data: {
                content,
                storyId,
                userId: user.userId
            },
            include: {
                user: {
                    select: { username: true, profileImage: true }
                }
            }
        });

        return c.json({ success: true, data: message });
    } catch (error) {
        console.error("Reply Error:", error);
        return c.json({ success: false, error: "Failed to send reply" }, 500);
    }
};

export const getStoryDetails = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        if (story.userId !== user.userId) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        const [viewers, messages, likes] = await Promise.all([
            prisma.storyView.findMany({
                where: {
                    storyId,
                    userId: { not: story.userId } // Filter out owner
                },
                include: {
                    user: {
                        select: { id: true, username: true, name: true, profileImage: true }
                    }
                },
                orderBy: { viewedAt: 'desc' }
            }),
            prisma.storyMessage.findMany({
                where: {
                    storyId,
                    userId: { not: story.userId } // Filter out owner
                },
                include: {
                    user: {
                        select: { id: true, username: true, profileImage: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma.storyLike.findMany({
                where: {
                    storyId,
                    userId: { not: story.userId } // Filter out owner
                },
                include: {
                    user: {
                        select: { id: true, username: true, name: true, profileImage: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return c.json({ success: true, viewers, messages, likes });
    } catch (error) {
        console.error("Story Details Error:", error);
        return c.json({ success: false, error: "Failed to fetch details" }, 500);
    }
};

export const likeStory = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env);

        // Check if story exists
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { 
                userId: true,
                isProtected: true,
                user: { select: { isPrivate: true } }
            }
        });

        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        // Don't let owner like their own story
        if (story.userId === user.userId) {
            return c.json({ success: false, error: "Cannot like your own story" }, 400);
        }

        if (story.isProtected || story.user?.isPrivate) {
            const isFollower = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: user.userId,
                        followingId: story.userId
                    }
                }
            });
            if (!isFollower) {
                return c.json({ success: false, error: "Access denied" }, 403);
            }
        }

        // Toggle like
        const existing = await prisma.storyLike.findUnique({
            where: {
                storyId_userId: {
                    storyId: storyId,
                    userId: user.userId
                }
            }
        });

        if (existing) {
            // Unlike
            try {
                await prisma.storyLike.delete({
                    where: { id: existing.id }
                });
                return c.json({ success: true, liked: false });
            } catch (error) {
                // If delete fails, treat as if already unliked
                return c.json({ success: true, liked: false });
            }
        } else {
            // Like
            try {
                await prisma.storyLike.create({
                    data: {
                        storyId: storyId,
                        userId: user.userId
                    }
                });
                return c.json({ success: true, liked: true });
            } catch (error) {
                // If constraint error, it means already liked (race condition)
                if (error.code === 'P2002') {
                    return c.json({ success: true, liked: true });
                }
                throw error;
            }
        }
    } catch (error) {
        console.error("Story Like Error:", error);
        return c.json({ success: false, error: "Failed to like story" }, 500);
    }
};
