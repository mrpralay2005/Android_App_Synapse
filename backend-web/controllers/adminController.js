import getPrisma from '../prisma/db.js';

export const getAllUsers = async (c) => {
    const user = c.get('user');

    if (user.role !== 'ADMIN') {
        return c.json({ success: false, error: "Unauthorized access detected" }, 403);
    }

    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                role: true,
                riskScore: true,
                lastLogin: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return c.json({ success: true, data: users });
    } catch (error) {
        console.error("Admin Error:", error);
        return c.json({ success: false, error: "Failed to fetch grid data" }, 500);
    }
};
