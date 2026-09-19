import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// The Neon serverless driver works with any PostgreSQL connection string,
// including Supabase's transaction pooler. It uses WebSocket transport
// which is fully supported in Cloudflare Workers.
neonConfig.fetchConnectionCache = true;

const getPrisma = (databaseUrl) => {
    if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: ['error'] });
};

export const getAuthPrisma = getPrisma;

export const retryTransientDatabaseOperation = async (operation, attempts = 2) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) {
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            }
        }
    }
    throw lastError;
};

export default getPrisma;
