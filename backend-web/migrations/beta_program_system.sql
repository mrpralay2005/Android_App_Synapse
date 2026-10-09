-- ============================================
-- PHASE 1: Beta Program System Database Schema
-- ============================================

-- Step 1: Add beta fields to User table
ALTER TABLE User ADD COLUMN isBetaTester INTEGER DEFAULT 0;
ALTER TABLE User ADD COLUMN betaAccessGrantedAt TEXT;
ALTER TABLE User ADD COLUMN betaAccessRevokedAt TEXT;

-- Step 2: Create BetaApplication table
CREATE TABLE IF NOT EXISTS BetaApplication (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  age INTEGER,
  gender TEXT,
  reasonForJoining TEXT NOT NULL,
  motivation TEXT NOT NULL,
  otpCode TEXT,
  otpExpires TEXT,
  otpVerified INTEGER DEFAULT 0,
  otpVerifiedAt TEXT,
  status TEXT DEFAULT 'PENDING',
  reviewedById INTEGER,
  reviewedAt TEXT,
  reviewNotes TEXT,
  appliedAt TEXT DEFAULT (datetime('now')),
  approvedAt TEXT,
  revokedAt TEXT,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_beta_application_userId ON BetaApplication(userId);
CREATE INDEX idx_beta_application_status ON BetaApplication(status);
CREATE INDEX idx_beta_application_appliedAt ON BetaApplication(appliedAt);

-- Step 3: Create BetaFeedback table
CREATE TABLE IF NOT EXISTS BetaFeedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  featureName TEXT,
  rating INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshots TEXT,
  isRead INTEGER DEFAULT 0,
  readById INTEGER,
  readAt TEXT,
  adminResponse TEXT,
  respondedAt TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  priority TEXT DEFAULT 'MEDIUM',
  submittedAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_beta_feedback_userId ON BetaFeedback(userId);
CREATE INDEX idx_beta_feedback_status ON BetaFeedback(status);
CREATE INDEX idx_beta_feedback_submittedAt ON BetaFeedback(submittedAt);
CREATE INDEX idx_beta_feedback_isRead ON BetaFeedback(isRead);

-- Step 4: Create FeatureFlag table
CREATE TABLE IF NOT EXISTS FeatureFlag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  description TEXT,
  enabledForBeta INTEGER DEFAULT 0,
  enabledForAll INTEGER DEFAULT 0,
  createdById INTEGER,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_feature_flag_enabledForBeta ON FeatureFlag(enabledForBeta);
CREATE INDEX idx_feature_flag_enabledForAll ON FeatureFlag(enabledForAll);

-- Step 5: Create AdminSetting table
CREATE TABLE IF NOT EXISTS AdminSetting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updatedById INTEGER,
  updatedAt TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Step 6: Create AdminActivityLog table
CREATE TABLE IF NOT EXISTS AdminActivityLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adminId INTEGER NOT NULL,
  action TEXT NOT NULL,
  targetType TEXT,
  targetId INTEGER,
  details TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  performedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_activity_log_adminId ON AdminActivityLog(adminId);
CREATE INDEX idx_admin_activity_log_performedAt ON AdminActivityLog(performedAt);
CREATE INDEX idx_admin_activity_log_action ON AdminActivityLog(action);

-- Step 7: Insert default admin settings
INSERT INTO AdminSetting (key, value, description) VALUES
  ('beta_auto_approve', 'false', 'Automatically approve beta applications'),
  ('max_beta_testers', '1000', 'Maximum number of beta testers allowed'),
  ('beta_program_enabled', 'true', 'Enable/disable beta program globally'),
  ('beta_require_otp', 'true', 'Require OTP verification for beta applications');

-- Step 8: Insert default feature flags (examples)
INSERT INTO FeatureFlag (name, displayName, description, enabledForBeta, enabledForAll) VALUES
  ('advanced_search', 'Advanced Search', 'Enhanced search with filters and AI suggestions', 1, 0),
  ('ai_content_generation', 'AI Content Generation', 'Generate captions and content with AI', 1, 0),
  ('premium_analytics', 'Premium Analytics', 'Detailed insights and engagement metrics', 1, 0),
  ('collaborative_posts', 'Collaborative Posts', 'Create posts with multiple authors', 1, 0);

-- Verification queries
SELECT 'User table updated' AS status, COUNT(*) AS count FROM pragma_table_info('User') WHERE name IN ('isBetaTester', 'betaAccessGrantedAt', 'betaAccessRevokedAt');
SELECT 'BetaApplication table created' AS status, COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='BetaApplication';
SELECT 'BetaFeedback table created' AS status, COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='BetaFeedback';
SELECT 'FeatureFlag table created' AS status, COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='FeatureFlag';
SELECT 'AdminSetting table created' AS status, COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='AdminSetting';
SELECT 'AdminActivityLog table created' AS status, COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='AdminActivityLog';
