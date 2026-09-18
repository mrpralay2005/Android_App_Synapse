import jwt from 'jsonwebtoken';
import { getCookie } from 'hono/cookie';

const isApprovedPreviewUser = (c, user) => {
    if (c.env.PREVIEW_MODE !== 'true') return true;
    const approvedUsernames = (c.env.PREVIEW_TEST_USERS || '')
        .split(',')
        .map((username) => username.trim().toLowerCase())
        .filter(Boolean);
    return user?.role !== 'ADMIN' && approvedUsernames.includes(user?.username?.toLowerCase());
};

const authenticateToken = async (c, next) => {
    // 1. Try Cookie first (Professional way)
    const cookieToken = getCookie(c, 'synapse_token');

    // 2. Fallback to Authorization Header (Backup way)
    const authHeader = c.req.header('authorization');
    const headerToken = authHeader && authHeader.split(' ')[1];

    const token = cookieToken || headerToken;

    if (!token) {
        return c.json({ success: false, error: "Neural authorization missing" }, 401);
    }

    try {
        const user = jwt.verify(token, c.env.JWT_SECRET || 'fallback_secret');
        // Tokens issued before the preview was locked must not retain access.
        // Apply the same allow-list at every authenticated endpoint, not only
        // during login.
        if (!isApprovedPreviewUser(c, user)) {
            return c.json({ success: false, error: 'This private preview accepts only approved test accounts.' }, 403);
        }
        c.set('user', user);
        await next();
    } catch (err) {
        return c.json({ success: false, error: "Neural link expired or corrupted" }, 403);
    }
};

export default authenticateToken;
