-- Persist the settings controlled by Professional Deck.
ALTER TABLE "User"
    ADD COLUMN "creatorModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "creatorVerificationRequestedAt" TIMESTAMP(3),
    ADD COLUMN "creatorHighResUploads" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "creatorAnonymousShield" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "creatorDeepAnalytics" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "links" JSONB;
