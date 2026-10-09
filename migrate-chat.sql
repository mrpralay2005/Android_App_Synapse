-- Migration: Add seen receipts and activity tracking
-- Add seenAt column to ChatMessage
ALTER TABLE ChatMessage ADD COLUMN seenAt TEXT;

-- Add lastActiveAt column to ChatParticipant
ALTER TABLE ChatParticipant ADD COLUMN lastActiveAt TEXT;

-- Update existing rows with current timestamp
UPDATE ChatParticipant SET lastActiveAt = datetime('now') WHERE lastActiveAt IS NULL;
