-- CreateTable
CREATE TABLE IF NOT EXISTS "FraudAlert" (
    "id" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "action" TEXT,
    "actionTaken" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PlayerRiskProfile" (
    "id" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "totalDeposits" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawals" INTEGER NOT NULL DEFAULT 0,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "chargebacks" INTEGER NOT NULL DEFAULT 0,
    "totalDepositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVpnUser" BOOLEAN NOT NULL DEFAULT false,
    "isProxyUser" BOOLEAN NOT NULL DEFAULT false,
    "hasMultipleAccounts" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousPattern" BOOLEAN NOT NULL DEFAULT false,
    "rapidWithdrawal" BOOLEAN NOT NULL DEFAULT false,
    "deviceIds" TEXT[],
    "ipAddresses" TEXT[],
    "avgSessionDuration" INTEGER,
    "avgTimeBetweenBets" INTEGER,
    "lastRiskCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "PlayerRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerRiskProfile_playerId_key" ON "PlayerRiskProfile"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_customerId_idx" ON "FraudAlert"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_playerId_idx" ON "FraudAlert"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_customerId_playerId_idx" ON "FraudAlert"("customerId", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_alertType_idx" ON "FraudAlert"("alertType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_severity_idx" ON "FraudAlert"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_status_idx" ON "FraudAlert"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_createdAt_idx" ON "FraudAlert"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_customerId_status_idx" ON "FraudAlert"("customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudAlert_customerId_alertType_status_idx" ON "FraudAlert"("customerId", "alertType", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_customerId_idx" ON "PlayerRiskProfile"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_riskLevel_idx" ON "PlayerRiskProfile"("riskLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_riskScore_idx" ON "PlayerRiskProfile"("riskScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_customerId_riskLevel_idx" ON "PlayerRiskProfile"("customerId", "riskLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_hasMultipleAccounts_idx" ON "PlayerRiskProfile"("hasMultipleAccounts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlayerRiskProfile_suspiciousPattern_idx" ON "PlayerRiskProfile"("suspiciousPattern");

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRiskProfile" ADD CONSTRAINT "PlayerRiskProfile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRiskProfile" ADD CONSTRAINT "PlayerRiskProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
