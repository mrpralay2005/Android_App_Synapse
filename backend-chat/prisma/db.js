import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// Reuse WebSocket connections within the same Worker instance for speed.
// Each Worker isolate still gets its own pool — this just avoids
// re-handshaking on every request within the same warm instance.
neonConfig.fetchConnectionCache = true;

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
