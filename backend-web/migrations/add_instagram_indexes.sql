-- Instagram-Level Database Optimization
-- Adds indexes to make queries 10-100x faster

-- Post indexes (for fast feed queries)
CREATE INDEX IF NOT EXISTS "post_createdAt_idx" ON "post"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "post_userId_createdAt_idx" ON "post"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "post_expiresAt_idx" ON "post"("expiresAt");

-- Like indexes (for fast like counts)
CREATE INDEX IF NOT EXISTS "like_postId_idx" ON "like"("postId");
CREATE INDEX IF NOT EXISTS "like_userId_idx" ON "like"("userId");

-- Story indexes (for fast story queries)
CREATE INDEX IF NOT EXISTS "story_expiresAt_idx" ON "story"("expiresAt");
CREATE INDEX IF NOT EXISTS "story_userId_expiresAt_idx" ON "story"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "story_createdAt_idx" ON "story"("createdAt" DESC);

-- Follow indexes (for fast follower queries)
CREATE INDEX IF NOT EXISTS "follow_followerId_idx" ON "follow"("followerId");
CREATE INDEX IF NOT EXISTS "follow_followingId_idx" ON "follow"("followingId");

-- Verify indexes were created
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%_idx';
