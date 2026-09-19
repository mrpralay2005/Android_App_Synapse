import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// Reuse WebSocket connections within the same Worker instance for speed.
neonConfig.fetchConnectionCache = true;

// Fail fast — don't let a sleeping Neon DB hang the whole Worker.
neonConfig.fetchEndpoint = (host) =>
    `https://${host}/sql`;

const getChatPrisma = (databaseUrl) => {
    if (!databaseUrl) {
        throw new Error('CHAT DATABASE_URL is missing.');
    }

    try {
        const pool = new Pool({
            connectionString: databaseUrl,
            connectionTimeoutMillis: 8000,  // fail after 8s instead of hanging
            idleTimeoutMillis: 10000,
        });
        const adapter = new PrismaNeon(pool);
        return new PrismaClient({
            adapter,
            log: ['error']
        });
    } catch (err) {
        console.error('Chat Prisma Connection Factory Error:', err);
        throw err;
    }
};

export default getChatPrisma;
