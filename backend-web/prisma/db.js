import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// Configure Neon for Cloudflare Workers with optimized settings
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = "password";

// Connection pool cache per Worker instance to avoid recreating pools
const poolCache = new Map();

const getPrisma = (databaseUrl) => {
    if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
    
    // Reuse pool if already created for this connection string
    if (!poolCache.has(databaseUrl)) {
        const pool = new Pool({ 
            connectionString: databaseUrl,
            // Session pooler settings optimized for Cloudflare Workers
            max: 1, // One connection per request in Workers
            idleTimeoutMillis: 10000, // Close idle connections after 10s
            connectionTimeoutMillis: 5000, // Fail fast if can't connect
        });
        poolCache.set(databaseUrl, pool);
    }
    
    const pool = poolCache.get(databaseUrl);
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ 
        adapter, 
        log: ['error']
    });
};

export const getAuthPrisma = getPrisma;

export const retryTransientDatabaseOperation = async (operation, attempts = 3) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const isTransient = error.code === 'P1001' || 
                              error.code === 'P2024' || 
                              error.message?.includes('timeout') ||
                              error.message?.includes('Connection') ||
                              error.message?.includes('ECONNREFUSED');
            
            // Only retry transient errors
            if (!isTransient || attempt === attempts - 1) {
                throw error;
            }
            
            // Exponential backoff: 300ms, 600ms, 900ms
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        }
    }
    throw lastError;
};

export default getPrisma;
