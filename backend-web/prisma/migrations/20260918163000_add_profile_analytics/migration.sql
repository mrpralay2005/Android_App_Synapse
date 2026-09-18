ALTER TABLE "User" ADD COLUMN "profileVisitAlerts" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ProfileVisit" (
    "id" SERIAL NOT NULL,
    "profileOwnerId" INTEGER NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileVisit_profileOwnerId_createdAt_idx" ON "ProfileVisit"("profileOwnerId", "createdAt");
CREATE INDEX "ProfileVisit_visitorId_createdAt_idx" ON "ProfileVisit"("visitorId", "createdAt");
