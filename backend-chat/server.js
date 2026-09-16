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

export default app;
