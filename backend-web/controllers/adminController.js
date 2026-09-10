import getPrisma from '../prisma/db.js';

const requireAdmin = (c) => {
    const user = c.get('user');
    return user.role === 'ADMIN' ? null : c.json({ success: false, error: 'Administrator access required' }, 403);
};

const getLatestMainCommit = async (c) => {
    const repository = c.env.GITHUB_REPOSITORY || 'mrpralay2005/Android_App_Synapse';
    const response = await fetch(`https://api.github.com/repos/${repository}/commits/main`, {
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'SynapseX-Release-Readiness'
        }
    });
    if (!response.ok) throw new Error(`GitHub commit check failed (${response.status})`);
    const commit = await response.json();
    return {
        sha: commit.sha,
        shortSha: commit.sha?.slice(0, 7),
        title: commit.commit?.message?.split('\n')[0] || 'Untitled update',
        committedAt: commit.commit?.author?.date || null
    };
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

// The command center reads GitHub's actual main-branch head. It does not infer
// changes from release notes, so admins see a pending release only when code is
// truly waiting to be deployed.
export const getReleaseReadiness = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const [latestCommit, latestRelease] = await Promise.all([
            getLatestMainCommit(c),
            prisma.platformUpdate.findFirst({
                where: { isPublished: true },
                orderBy: { publishedAt: 'desc' },
                select: { version: true, title: true, sourceCommitSha: true, publishedAt: true }
            })
        ]);
        // Releases created before commit tracking existed have no SHA. For the
        // one-time bootstrap release, use its publication time as the baseline:
        // code committed before that release was included in it; later commits
        // are correctly shown as pending.
        const legacyReleaseCoversCommit = latestRelease
            && !latestRelease.sourceCommitSha
            && latestCommit.committedAt
            && new Date(latestRelease.publishedAt) >= new Date(latestCommit.committedAt);
        const pending = latestRelease?.sourceCommitSha
            ? latestCommit.sha !== latestRelease.sourceCommitSha
            : !legacyReleaseCoversCommit;
        return c.json({
            success: true,
            data: {
                pending,
                latestCommit,
                lastPublishedRelease: latestRelease
            }
        });
    } catch (error) {
        console.error('Release readiness error:', error);
        return c.json({ success: false, error: 'Unable to check the GitHub release queue' }, 502);
    }
};

// Public by design: release notes contain no account data and must be visible
// to every signed-in SynapseX user in System Support.
export const getLatestPlatformUpdate = async (c) => {
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const update = await prisma.platformUpdate.findFirst({
            where: { isPublished: true },
            orderBy: { publishedAt: 'desc' },
            select: { id: true, title: true, summary: true, version: true, publishedAt: true }
        });
        return c.json({ success: true, data: update });
    } catch (error) {
        console.error('Latest platform update error:', error);
        return c.json({ success: false, error: 'Unable to check for updates' }, 500);
    }
};

export const publishPlatformUpdate = async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;
    try {
        const { title, summary, version } = await c.req.json();
        if (![title, summary, version].every(value => typeof value === 'string' && value.trim())) return c.json({ success: false, error: 'Title, version, and summary are required' }, 400);
        const pagesDeployHookUrl = c.env.PAGES_DEPLOY_HOOK_URL;
        const workerDeployHookUrl = c.env.WORKER_DEPLOY_HOOK_URL;
        if (!pagesDeployHookUrl || !workerDeployHookUrl) {
            return c.json({ success: false, error: 'Publishing is not configured. Both the Pages and backend deploy-hook secrets are required.' }, 503);
        }

        // GitHub's public API is used for the readiness label only. A temporary
        // GitHub outage must never prevent an administrator from deploying a
        // release that Cloudflare is ready to build.
        let latestCommit = null;
        try {
            latestCommit = await getLatestMainCommit(c);
        } catch (error) {
            console.warn('Could not attach a GitHub commit to this release:', error);
        }

        // Both URLs are administrator-owned secrets. They are never accepted from
        // the browser or returned in a response, which prevents an untrusted client
        // from triggering either public deployment.
        let pagesResponse;
        let workerResponse;
        try {
            [workerResponse, pagesResponse] = await Promise.all([
                fetch(workerDeployHookUrl, { method: 'POST', headers: { 'User-Agent': 'SynapseX-Admin-Release/1.0' } }),
                fetch(pagesDeployHookUrl, { method: 'POST', headers: { 'User-Agent': 'SynapseX-Admin-Release/1.0' } })
            ]);
        } catch (error) {
            console.error('Release hook request failed:', error);
            return c.json({ success: false, error: 'Cloudflare could not be reached. No release was published.' }, 502);
        }

        if (!workerResponse.ok || !pagesResponse.ok) {
            console.error('Release hook rejected:', { worker: workerResponse.status, pages: pagesResponse.status });
            return c.json({ success: false, error: 'Cloudflare did not accept both deployments. No release note was published.' }, 502);
        }

        const admin = c.get('user');
        const prisma = getPrisma(c.env.DATABASE_URL);
        const update = await prisma.platformUpdate.create({
            data: { title: title.trim(), summary: summary.trim(), version: version.trim(), sourceCommitSha: latestCommit?.sha || null, authorId: admin.userId },
            include: { author: { select: { username: true } } }
        });
        return c.json({ success: true, data: update, deploymentTriggered: true, workerDeploymentTriggered: true, pagesDeploymentTriggered: true }, 201);
    } catch (error) {
        return c.json({ success: false, error: 'Release update could not be published' }, 500);
    }
};
