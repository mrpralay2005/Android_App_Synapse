import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// Single libSQL client instance - reuse across all requests in this Worker
let globalClient = null;

const getChatPrisma = (envOrUrl) => {
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
    
    if (!databaseUrl) throw new Error('CHAT DATABASE_URL is missing.');
    if (!authToken) throw new Error('CHAT TURSO_AUTH_TOKEN is missing.');
    
    // Create libSQL client only once per Worker instance
    if (!globalClient) {
        globalClient = createClient({
            url: databaseUrl,
            authToken: authToken
        });
    }
    
    const adapter = new PrismaLibSql(globalClient);
    return new PrismaClient({ 
        adapter, 
        log: ['error']
    });
};

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

export default getChatPrisma;
