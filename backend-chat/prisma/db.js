import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

/**
 * Cloudflare Workers Isolation Fix (same rule as the main backend):
 * create a NEW Prisma instance per request so a finished request's
 * connection is never reused ("Cannot perform I/O on behalf of a
 * different request").
 */
const getChatPrisma = (databaseUrl) => {
    if (!databaseUrl) {
        throw new Error('CHAT DATABASE_URL is missing.');
    }

    try {
        const pool = new Pool({ connectionString: databaseUrl });
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
