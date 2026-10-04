import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// Configure Neon for Cloudflare Workers with aggressive connection management
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = "password";

// Single pool instance - reuse across all requests in this Worker
let globalPool = null;

const getPrisma = (databaseUrl) => {
    if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
    
    // Create pool only once per Worker instance
    if (!globalPool) {
        globalPool = new Pool({ 
            connectionString: databaseUrl,
            // Aggressive limits for Supabase free tier
            max: 1, // Absolute minimum - one connection per Worker
            min: 0, // No minimum connections
            idleTimeoutMillis: 3000, // Close idle very fast (3s)
            connectionTimeoutMillis: 3000, // Fail fast
            maxUses: 1000, // Recycle connection after 1000 queries
        });
    }
    
    const adapter = new PrismaNeon(globalPool);
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
