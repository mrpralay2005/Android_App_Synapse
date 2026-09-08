import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

/**
 * Cloudflare Workers Isolation Fix:
 * We create a NEW Prisma instance for every request.
 * While slightly more overhead, this prevents the "Cannot perform I/O 
 * on behalf of a different request" error which happens when a 
 * global client tries to reuse a connection from a finished request.
 */
const getPrisma = (databaseUrl) => {
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is missing.");
    }

    try {
        const pool = new Pool({ connectionString: databaseUrl });
        const adapter = new PrismaNeon(pool);
        return new PrismaClient({
            adapter,
            log: ['error']
        });
    } catch (err) {
        console.error("Prisma Connection Factory Error:", err);
        throw err;
    }
};

export default getPrisma;
