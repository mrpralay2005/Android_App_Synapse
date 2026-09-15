import jwt from 'jsonwebtoken';
import { getCookie } from 'hono/cookie';

/**
 * Same token format as the main backend ({ userId, username, role }, 2h),
 * verified here with the SHARED secret so one login works for both Workers.
 * Cookie `synapse_token` first, `Authorization: Bearer` header as fallback.
 */
const authenticateChatToken = async (c, next) => {
    const cookieToken = getCookie(c, 'synapse_token');

    const authHeader = c.req.header('authorization');
    const headerToken = authHeader && authHeader.split(' ')[1];

    const token = cookieToken || headerToken;

    if (!token) {
        return c.json({ success: false, error: 'Neural authorization missing' }, 401);
    }

    try {
        const user = jwt.verify(token, c.env.JWT_SECRET || 'fallback_secret');
        if (!user?.userId) {
            return c.json({ success: false, error: 'Neural authorization missing' }, 401);
        }
        c.set('user', user);
        await next();
    } catch (err) {
        return c.json({ success: false, error: 'Neural link expired or corrupted' }, 403);
    }
};

export default authenticateChatToken;
