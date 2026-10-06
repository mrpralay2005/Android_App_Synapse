import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// Cache Prisma clients per worker instance to avoid recreation on every request
const prismaCache = new Map();

const getPrisma = (envOrUrl) => {
    let databaseUrl, authToken;
    
    // If passed an object with env vars, extract both
    if (typeof envOrUrl === 'object' && envOrUrl !== null && !envOrUrl.startsWith) {
        databaseUrl = envOrUrl.DATABASE_URL;
        authToken = envOrUrl.TURSO_AUTH_TOKEN;
    } else {
        // Old style: just URL passed (for backwards compat during migration)
        databaseUrl = envOrUrl;
        authToken = process.env.TURSO_AUTH_TOKEN;
    }
    
    if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
    if (!authToken) throw new Error('TURSO_AUTH_TOKEN is missing.');
    
    // Use cached client if available for this URL
    const cacheKey = `${databaseUrl}-${authToken.slice(0, 10)}`;
    if (prismaCache.has(cacheKey)) {
        return prismaCache.get(cacheKey);
    }
    
    try {
        // v5.22 pattern: manually create libsql client, then pass to adapter
        const libsql = createClient({
            url: databaseUrl,
            authToken
        });
        
        const adapter = new PrismaLibSQL(libsql);
        const prisma = new PrismaClient({ 
            adapter,
            log: ['error', 'warn'] // Only log errors/warnings in production
        });
        
        // Cache for reuse
        prismaCache.set(cacheKey, prisma);
        return prisma;
    } catch (error) {
        console.error('Prisma initialization error:', error);
        throw error;
    }
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
                              error.message?.includes('array buffer') || // ADD THIS
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
