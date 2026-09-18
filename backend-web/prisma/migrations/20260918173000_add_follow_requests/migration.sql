ALTER TABLE "Follow" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACCEPTED';
CREATE INDEX "Follow_followingId_status_idx" ON "Follow"("followingId", "status");
