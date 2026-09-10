-- A per-user cursor makes “Clear all” persistent without deleting posts,
-- stories, or security records that belong to the platform.
ALTER TABLE "User"
    ADD COLUMN "notificationClearedAt" TIMESTAMP(3);
