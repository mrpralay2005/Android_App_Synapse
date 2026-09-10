import getPrisma from '../prisma/db.js';

const requireAdmin = (c) => {
    const user = c.get('user');
    return user.role === 'ADMIN' ? null : c.json({ success: false, error: 'Administrator access required' }, 403);
};

export const getAllUsers = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const users = await prisma.user.findMany({
            select: { id: true, username: true, email: true, name: true, role: true, riskScore: true, lastLogin: true, creatorVerificationStatus: true, creatorVerifiedAt: true },
            orderBy: { createdAt: 'desc' }
        });
        return c.json({ success: true, data: users });
    } catch (error) {
        console.error('Admin users error:', error);
        return c.json({ success: false, error: 'Failed to load identities' }, 500);
    }
};

export const getAdminOverview = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const [totalUsers, pendingVerifications, verifiedCreators, totalPosts, recentUpdates] = await Promise.all([
            prisma.user.count(), prisma.user.count({ where: { creatorVerificationStatus: 'PENDING' } }),
            prisma.user.count({ where: { creatorVerificationStatus: 'APPROVED' } }), prisma.post.count(),
            prisma.platformUpdate.findMany({ take: 3, orderBy: { publishedAt: 'desc' }, include: { author: { select: { username: true } } } })
        ]);
        return c.json({ success: true, data: { totalUsers, pendingVerifications, verifiedCreators, totalPosts, recentUpdates } });
    } catch (error) {
        return c.json({ success: false, error: 'Unable to load command center' }, 500);
    }
};

export const getCreatorRequests = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const requests = await prisma.user.findMany({ where: { creatorVerificationStatus: 'PENDING' }, select: { id: true, username: true, name: true, email: true, profileImage: true, createdAt: true, creatorVerificationRequestedAt: true }, orderBy: { creatorVerificationRequestedAt: 'asc' } });
        return c.json({ success: true, data: requests });
    } catch (error) {
        return c.json({ success: false, error: 'Unable to load creator requests' }, 500);
    }
};

export const reviewCreatorRequest = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const requestId = Number(c.req.param('id'));
        const { decision } = await c.req.json();
        if (!Number.isInteger(requestId) || !['APPROVED', 'REJECTED'].includes(decision)) return c.json({ success: false, error: 'A valid approval decision is required' }, 400);
        const admin = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);
        const account = await prisma.user.update({ where: { id: requestId }, data: { creatorVerificationStatus: decision, creatorVerifiedAt: decision === 'APPROVED' ? new Date() : null, creatorVerificationReviewedById: admin.userId }, select: { id: true, username: true, creatorVerificationStatus: true, creatorVerifiedAt: true } });
        return c.json({ success: true, data: account });
    } catch (error) {
        return c.json({ success: false, error: 'Creator review could not be completed' }, 500);
    }
};

export const getPlatformUpdates = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        return c.json({ success: true, data: await prisma.platformUpdate.findMany({ orderBy: { publishedAt: 'desc' }, include: { author: { select: { username: true } } } }) });
    } catch (error) {
        return c.json({ success: false, error: 'Unable to load release updates' }, 500);
    }
};

export const publishPlatformUpdate = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const { title, summary, version } = await c.req.json();
        if (![title, summary, version].every(value => typeof value === 'string' && value.trim())) return c.json({ success: false, error: 'Title, version, and summary are required' }, 400);
        const deployHookUrl = c.env.PAGES_DEPLOY_HOOK_URL;
        if (!deployHookUrl) {
            return c.json({ success: false, error: 'Publishing is not configured. Add the Pages deploy-hook secret to the production backend.' }, 503);
        }

        // The hook URL is an administrator-owned secret. It is never accepted from
        // the browser or returned in a response, which prevents an untrusted client
        // from triggering a public release.
        let deploymentResponse;
        try {
            deploymentResponse = await fetch(deployHookUrl, {
                method: 'POST',
                headers: { 'User-Agent': 'SynapseX-Admin-Release/1.0' }
            });
        } catch (error) {
            console.error('Pages release hook request failed:', error);
            return c.json({ success: false, error: 'Cloudflare could not be reached. No release was published.' }, 502);
        }

        if (!deploymentResponse.ok) {
            console.error('Pages release hook rejected:', deploymentResponse.status);
            return c.json({ success: false, error: 'Cloudflare did not accept this release. No release note was published.' }, 502);
        }

        const admin = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);
        const update = await prisma.platformUpdate.create({
            data: { title: title.trim(), summary: summary.trim(), version: version.trim(), authorId: admin.userId },
            include: { author: { select: { username: true } } }
        });
        return c.json({ success: true, data: update, deploymentTriggered: true }, 201);
    } catch (error) {
        return c.json({ success: false, error: 'Release update could not be published' }, 500);
    }
};
