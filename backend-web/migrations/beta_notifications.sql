CREATE TABLE IF NOT EXISTS "betanotification" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "actorName" TEXT,
    "actorImage" TEXT,
    "actorUsername" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "betanotification_userId_idx" ON "betanotification"("userId");
CREATE INDEX IF NOT EXISTS "betanotification_createdAt_idx" ON "betanotification"("createdAt");

