import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

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
    
    try {
        // Create fresh libsql client with connection timeout
        const libsql = createClient({
            url: databaseUrl,
            authToken,
            syncUrl: undefined, // Disable sync for serverless
            syncInterval: undefined
        });
        
        const adapter = new PrismaLibSQL(libsql);
        const prisma = new PrismaClient({ 
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : []
        });
        
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
                              error.message?.includes('array buffer') ||
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
