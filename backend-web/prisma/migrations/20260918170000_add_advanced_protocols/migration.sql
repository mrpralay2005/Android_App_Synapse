ALTER TABLE "User"
    ADD COLUMN "quantumDecayEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "quantumDecayDays" INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN "neuralGuardianEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Post" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Post_expiresAt_idx" ON "Post"("expiresAt");
