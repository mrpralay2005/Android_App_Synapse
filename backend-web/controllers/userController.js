import getPrisma from '../prisma/db.js';

export const getProfile = async (c) => {
    const username = c.req.param('username');
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
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
                createdAt: true,
                role: true,
                posts: {
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

        return c.json({ success: true, data: user });
    } catch (error) {
        console.error("Profile Error:", error);
        return c.json({ success: false, error: "Search failed" }, 500);
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

export const updateProfile = async (c) => {
    try {
        const { name, bio, profileImage, username, isPrivate } = await c.req.json();
        const user = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);

        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: {
                ...(name && { name }),
                ...(bio && { bio }),
                ...(profileImage && { profileImage }),
                ...(username && { username }),
                ...(typeof isPrivate === 'boolean' && { isPrivate })
            },
            select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profileImage: true,
                riskScore: true,
                isPrivate: true
            }
        });

        return c.json({ success: true, data: updatedUser });
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
            select: {
                id: true,
                username: true,
                profileImage: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return c.json({ success: true, data: users });
    } catch (error) {
        console.error("Suggested Users Error:", error);
        return c.json({ success: false, error: "Failed to fetch user signatures" }, 500);
    }
};
