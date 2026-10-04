// Script to push Prisma schema to Turso database
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env.production');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const client = createClient({
  url: envVars.DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN
});

// SQL schema extracted from Prisma schema
const schema = `
CREATE TABLE IF NOT EXISTS ChatConversation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  createdById INTEGER NOT NULL,
  isGroup INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  passwordHash TEXT,
  passwordSalt TEXT,
  passwordSetBy INTEGER,
  passwordSetAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ChatConversation_createdById_idx ON ChatConversation(createdById);
CREATE INDEX IF NOT EXISTS ChatConversation_updatedAt_idx ON ChatConversation(updatedAt);

CREATE TABLE IF NOT EXISTS ChatParticipant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversationId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  lastReadAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  typingAt DATETIME,
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES ChatConversation(id) ON DELETE CASCADE,
  UNIQUE(conversationId, userId)
);

CREATE INDEX IF NOT EXISTS ChatParticipant_userId_idx ON ChatParticipant(userId);
CREATE INDEX IF NOT EXISTS ChatParticipant_conversationId_idx ON ChatParticipant(conversationId);

CREATE TABLE IF NOT EXISTS ChatMessage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversationId INTEGER NOT NULL,
  senderId INTEGER NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES ChatConversation(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ChatMessage_conversationId_createdAt_idx ON ChatMessage(conversationId, createdAt);
CREATE INDEX IF NOT EXISTS ChatMessage_senderId_idx ON ChatMessage(senderId);
`;

async function pushSchema() {
  console.log('🚀 Pushing schema to Turso chat database...');
  console.log('Database URL:', envVars.DATABASE_URL);
  
  try {
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await client.execute(statement);
    }
    
    console.log('✅ Schema pushed successfully!');
    console.log('Chat tables created in Turso database.');
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    process.exit(1);
  }
}

pushSchema();
