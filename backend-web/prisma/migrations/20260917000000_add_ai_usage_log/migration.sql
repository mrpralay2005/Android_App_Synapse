CREATE TABLE "AiUsageLog" (
    "id"       SERIAL NOT NULL,
    "userId"   INTEGER NOT NULL DEFAULT 0,
    "endpoint" TEXT NOT NULL,
    "tokens"   INTEGER NOT NULL DEFAULT 0,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsageLog_calledAt_idx" ON "AiUsageLog"("calledAt");
CREATE INDEX "AiUsageLog_userId_idx"   ON "AiUsageLog"("userId");
