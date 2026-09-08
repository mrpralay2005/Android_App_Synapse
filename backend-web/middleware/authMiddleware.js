import jwt from 'jsonwebtoken';
import { getCookie } from 'hono/cookie';

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
        c.set('user', user);
        await next();
    } catch (err) {
        return c.json({ success: false, error: "Neural link expired or corrupted" }, 403);
    }
};

export default authenticateToken;
