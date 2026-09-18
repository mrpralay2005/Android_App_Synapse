ALTER TABLE "User"
    ADD COLUMN "showActivityStatus" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "ghostViewer" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "protectedStories" BOOLEAN NOT NULL DEFAULT false;
