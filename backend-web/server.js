import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import getPrisma from './prisma/db.js';

const app = new Hono();

// 1. UNIVERSAL CORS (Hono Official Middleware)
// This is the most reliable way to handle CORS in Hono/Workers
app.use('*', cors({
    origin: (origin) => {
        // Echo back the origin to support credentials: true
        // If no origin (direct access), use allow-all
        return origin || '*';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposeHeaders: ['Content-Length', 'X-Synapse-Debug'],
    maxAge: 86400,
    credentials: true,
}));

app.use('*', logger());
app.use('*', prettyJSON());

// 2. DIAGNOSTIC ROUTES
app.get('/api/debug-env', (c) => {
    return c.json({
        success: true,
        hasDatabaseUrl: !!c.env.DATABASE_URL,
        databaseUrlLength: c.env.DATABASE_URL ? c.env.DATABASE_URL.length : 0,
        envKeys: Object.keys(c.env),
        message: "SynapseX Neural Gateway Diagnostic: Active"
    });
});

app.get('/api/test-db', async (c) => {
    try {
        const prisma = getPrisma(c.env.DATABASE_URL);
        const userCount = await prisma.user.count();
        return c.json({ success: true, message: "Connection Established", userCount });
    } catch (err) {
        return c.json({ success: false, error: err.message, stack: err.stack }, 500);
    }
});

// Professional Error Handling
app.onError((err, c) => {
    console.error(`[Neural Crash]: ${err.message}`);

    // Fallback: Ensure CORS headers are still sent even if Hono's middleware fails
    const origin = c.req.header('Origin');
    if (origin) {
        c.header('Access-Control-Allow-Origin', origin);
        c.header('Access-Control-Allow-Credentials', 'true');
    }

    return c.json({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            code: 'NEURAL_LINK_SEVERED',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    }, 500);
});

// Main Route
app.get('/', (c) => {
    return c.text('SynapseX Neural Gateway is Online...');
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/social', socialRoutes);
app.route('/api/admin', adminRoutes);

export default app;