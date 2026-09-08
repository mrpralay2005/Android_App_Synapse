import getPrisma from '../prisma/db.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getFeed = async (c) => {
    try {
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        const posts = await prisma.post.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profileImage: true
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
            likes: undefined, // remove raw array
            savedBy: undefined // remove raw array
        }));

        return c.json(formattedPosts);
    } catch (error) {
        console.error("Neural Feed Sync Error:", error);
        return c.json({ success: false, error: "Feed synchronization failed" }, 500);
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
    try {
        const { caption, mediaUrl, type, postPassword, thumbnailUrl } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        if (!user) return c.json({ success: false, error: "Identity missing" }, 401);
        if (!mediaUrl) return c.json({ success: false, error: "Media resource required" }, 400);

        const post = await prisma.post.create({
            data: {
                caption: caption || "",
                mediaUrl,
                type: type || 'IMAGE', // IMAGE or VIDEO
                postPassword: postPassword || null,
                thumbnailUrl: thumbnailUrl || null,
                userId: user.id || user.userId
            },
            include: {
                user: {
                    select: { username: true, name: true, profileImage: true }
                }
            }
        });

        return c.json({ success: true, data: post }, 201);
    } catch (error) {
        console.error("Neural Post Broadcast Error:", error);
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
        const prisma = getPrisma(c.env.DATABASE_URL);

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
        const prisma = getPrisma(c.env.DATABASE_URL);

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
        const prisma = getPrisma(c.env.DATABASE_URL);

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
        const prisma = getPrisma(c.env.DATABASE_URL);

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
        const prisma = getPrisma(c.env.DATABASE_URL);
        const now = new Date();

        // Fetch stories that haven't expired
        const stories = await prisma.story.findMany({
            where: {
                expiresAt: { gt: now }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        profileImage: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return c.json({ success: true, data: stories });
    } catch (error) {
        console.error("Story Retrieval Error:", error);
        return c.json({ success: false, error: "Failed to fetch stories" }, 500);
    }
};

export const createStory = async (c) => {
    try {
        const { mediaUrl, type } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        if (!mediaUrl) return c.json({ success: false, error: "Media resource required" }, 400);

        // Story expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = await prisma.story.create({
            data: {
                mediaUrl,
                type: type || 'IMAGE',
                userId: user.userId,
                expiresAt
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
        const prisma = getPrisma(c.env.DATABASE_URL);

        const story = await prisma.story.findUnique({
            where: { id: storyId }
        });

        if (!story) return c.json({ success: false, error: "Story not found" }, 404);
        if (story.userId !== user.userId) return c.json({ success: false, error: "Unauthorized" }, 412);

        await prisma.story.delete({
            where: { id: storyId }
        });

        return c.json({ success: true, message: "Story terminated" });
    } catch (error) {
        return c.json({ success: false, error: "Termination failed" }, 500);
    }
};

export const viewStory = async (c) => {
    try {
        const storyId = parseInt(c.req.param('id'));
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        // Optimization: Don't fetch story body just to check owner, but we need ownerId.
        // Assuming we might need to check if story exists anyway.
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { userId: true }
        });

        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        // Filter: Don't count owner's own view
        if (story.userId === user.userId) {
            return c.json({ success: true, ignored: true });
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
        const prisma = getPrisma(c.env.DATABASE_URL);

        if (!content) return c.json({ success: false, error: "Content required" }, 400);

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
        const prisma = getPrisma(c.env.DATABASE_URL);

        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) return c.json({ success: false, error: "Story not found" }, 404);

        if (story.userId !== user.userId) {
            return c.json({ success: false, error: "Unauthorized" }, 403);
        }

        const [viewers, messages] = await Promise.all([
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
            })
        ]);

        return c.json({ success: true, viewers, messages });
    } catch (error) {
        console.error("Story Details Error:", error);
        return c.json({ success: false, error: "Failed to fetch details" }, 500);
    }
};
