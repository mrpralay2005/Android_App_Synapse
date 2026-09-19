import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { Pool, neon, neonConfig } from '@neondatabase/serverless';

// Reuse WebSocket connections within the same Worker instance for speed.
neonConfig.fetchConnectionCache = true;

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

// Login is latency-sensitive and makes several independent database calls. The
// Neon HTTP driver is stateless, so it cannot retain an exhausted WebSocket pool
// across Worker requests. Keep the existing WebSocket client for routes that
// rely on Prisma transactions; use this only for non-transactional auth flows.
export const getAuthPrisma = (databaseUrl) => {
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is missing.');
    }

    return new PrismaClient({
        adapter: new PrismaNeonHTTP(neon(databaseUrl)),
        log: ['error']
    });
};

// Neon branches can briefly wake or rebalance. Retry only the operation that
// failed, with a small bounded backoff; credentials and application errors are
// returned normally by their callers and are not hidden by this helper.
export const retryTransientDatabaseOperation = async (operation, attempts = 3) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
            }
        }
    }
    throw lastError;
};

export default getPrisma;
