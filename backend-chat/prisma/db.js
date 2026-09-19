import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';

// The Neon serverless driver works with any PostgreSQL connection string,
// including Supabase's transaction pooler.
neonConfig.fetchConnectionCache = true;

const getChatPrisma = (databaseUrl) => {
    if (!databaseUrl) throw new Error('CHAT DATABASE_URL is missing.');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: ['error'] });
};

export default getChatPrisma;
