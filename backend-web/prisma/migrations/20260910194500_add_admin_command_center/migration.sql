ALTER TABLE "User"
    ADD COLUMN "creatorVerificationStatus" TEXT NOT NULL DEFAULT 'NONE',
    ADD COLUMN "creatorVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "creatorVerificationReviewedById" INTEGER;

UPDATE "User" SET "creatorVerificationStatus" = 'PENDING'
WHERE "creatorVerificationRequestedAt" IS NOT NULL;

CREATE TABLE "PlatformUpdate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorId" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformUpdate_pkey" PRIMARY KEY ("id")
);
