ALTER TABLE "User"
    ADD COLUMN "pendingEmail" TEXT,
    ADD COLUMN "emailChangeOtp" TEXT,
    ADD COLUMN "emailChangeOtpExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_pendingEmail_key" ON "User"("pendingEmail");
