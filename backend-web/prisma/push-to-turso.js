// Script to push Prisma schema to Turso database
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
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
CREATE TABLE IF NOT EXISTS User (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  bio TEXT DEFAULT 'Quantum Explorer in the SynapseX Realm',
  profileImage TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  riskScore REAL DEFAULT 0.0,
  lastLogin DATETIME,
  isVerified INTEGER NOT NULL DEFAULT 0,
  isPrivate INTEGER NOT NULL DEFAULT 0,
  showActivityStatus INTEGER NOT NULL DEFAULT 1,
  readReceipts INTEGER NOT NULL DEFAULT 1,
  ghostViewer INTEGER NOT NULL DEFAULT 0,
  protectedStories INTEGER NOT NULL DEFAULT 0,
  profileVisitAlerts INTEGER NOT NULL DEFAULT 1,
  notificationPostAlerts INTEGER NOT NULL DEFAULT 1,
  notificationStoryAlerts INTEGER NOT NULL DEFAULT 1,
  notificationSecurityAlerts INTEGER NOT NULL DEFAULT 1,
  quantumDecayEnabled INTEGER NOT NULL DEFAULT 0,
  quantumDecayDays INTEGER NOT NULL DEFAULT 30,
  neuralGuardianEnabled INTEGER NOT NULL DEFAULT 0,
  lastActiveAt DATETIME,
  creatorModeEnabled INTEGER NOT NULL DEFAULT 0,
  creatorVerificationRequestedAt DATETIME,
  creatorVerificationStatus TEXT NOT NULL DEFAULT 'NONE',
  creatorVerifiedAt DATETIME,
  creatorVerificationReviewedById INTEGER,
  creatorHighResUploads INTEGER NOT NULL DEFAULT 0,
  creatorAnonymousShield INTEGER NOT NULL DEFAULT 0,
  creatorDeepAnalytics INTEGER NOT NULL DEFAULT 0,
  links TEXT,
  notificationClearedAt DATETIME,
  pendingEmail TEXT UNIQUE,
  emailChangeOtp TEXT,
  emailChangeOtpExpires DATETIME,
  otp TEXT,
  otpExpires DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS PlatformUpdate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  version TEXT NOT NULL,
  isPublished INTEGER NOT NULL DEFAULT 1,
  sourceCommitSha TEXT,
  authorId INTEGER NOT NULL,
  publishedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS Post (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caption TEXT,
  mediaUrl TEXT NOT NULL,
  thumbnailUrl TEXT,
  type TEXT NOT NULL DEFAULT 'IMAGE',
  postPassword TEXT,
  userId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS Follow (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  followerId INTEGER NOT NULL,
  followingId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (followerId) REFERENCES User(id),
  FOREIGN KEY (followingId) REFERENCES User(id),
  UNIQUE(followerId, followingId)
);

CREATE TABLE IF NOT EXISTS Like (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  postId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (postId) REFERENCES Post(id),
  UNIQUE(userId, postId)
);

CREATE TABLE IF NOT EXISTS Comment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  userId INTEGER NOT NULL,
  postId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (postId) REFERENCES Post(id)
);

CREATE TABLE IF NOT EXISTS Story (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mediaUrl TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'IMAGE',
  userId INTEGER NOT NULL,
  expiresAt DATETIME NOT NULL,
  isProtected INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS ProfileVisit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profileOwnerId INTEGER NOT NULL,
  visitorId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profileOwnerId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (visitorId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ProfileVisit_profileOwnerId_createdAt_idx ON ProfileVisit(profileOwnerId, createdAt);
CREATE INDEX IF NOT EXISTS ProfileVisit_visitorId_createdAt_idx ON ProfileVisit(visitorId, createdAt);

CREATE TABLE IF NOT EXISTS StoryView (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storyId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  viewedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storyId) REFERENCES Story(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(storyId, userId)
);

CREATE TABLE IF NOT EXISTS StoryMessage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  storyId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storyId) REFERENCES Story(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SavedPost (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  postId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (postId) REFERENCES Post(id),
  UNIQUE(userId, postId)
);

CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  userAgent TEXT,
  ipAddress TEXT,
  lastActive DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS AiUsageLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL DEFAULT 0,
  endpoint TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  calledAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS AiUsageLog_calledAt_idx ON AiUsageLog(calledAt);
CREATE INDEX IF NOT EXISTS AiUsageLog_userId_idx ON AiUsageLog(userId);
`;

async function pushSchema() {
  console.log('🚀 Pushing schema to Turso...');
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
    console.log('Tables created in Turso database.');
  } catch (error) {
    console.error('❌ Error pushing schema:', error);
    process.exit(1);
  }
}

pushSchema();
