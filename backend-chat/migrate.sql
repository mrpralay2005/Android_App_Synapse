-- Migration: Add seen receipts and activity tracking
-- Run this against your Turso database

-- Add seenAt column to ChatMessage
ALTER TABLE ChatMessage ADD COLUMN seenAt TEXT;

-- Add lastActiveAt column to ChatParticipant with default
ALTER TABLE ChatParticipant ADD COLUMN lastActiveAt TEXT DEFAULT (datetime('now'));

-- Update existing rows to have a lastActiveAt value (set to current time)
UPDATE ChatParticipant SET lastActiveAt = datetime('now') WHERE lastActiveAt IS NULL;
