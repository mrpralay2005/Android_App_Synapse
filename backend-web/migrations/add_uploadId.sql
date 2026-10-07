-- Add uploadId column to Post table for Instagram-style idempotency
-- Run this manually on Turso dashboard or via Turso CLI

ALTER TABLE Post ADD COLUMN uploadId TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_uploadId ON Post(uploadId);
