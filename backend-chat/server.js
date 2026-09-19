import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import chatRoutes from './routes/chatRoutes.js';

const app = new Hono();

// The chat client authenticates every cross-origin call with an explicit
// Authorization header.  Do not enable credentialed wildcard CORS: browsers
// reject it and it would unnecessarily permit cookie-based cross-site calls.
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Chat-Unlock'],
    exposeHeaders: ['Content-Length', 'X-Synapse-Chat'],
    maxAge: 86400,
    credentials: false,
}));

app.use('*', logger());
app.use('*', prettyJSON());

// Professional Error Handling
app.onError((err, c) => {
    console.error(`[Chat Neural Crash]: ${err.message}`);

    return c.json({
        success: false,
        error: {
            message: 'Internal Server Error',
            code: 'CHAT_LINK_SEVERED'
        }
    }, 500);
});

// Main Route
app.get('/', (c) => {
    return c.text('SynapseX Direct Chat Core is Online...');
});

// API Routes — chat lives under /api/chat only, in its own Worker.
app.route('/api/chat', chatRoutes);

// ── Scheduled keep-alive: runs every 4 minutes via Cloudflare Cron.
const scheduled = async (event, env, ctx) => {
    try {
        const getChatPrisma = (await import('./prisma/db.js')).default;
        const db = getChatPrisma(env.DATABASE_URL);
        await db.$queryRaw`SELECT 1`;
        console.log('[Cron] Chat DB keep-alive OK');
    } catch (e) {
        console.error('[Cron] Chat DB keep-alive failed:', e.message);
    }
};

export default { fetch: app.fetch, scheduled };
