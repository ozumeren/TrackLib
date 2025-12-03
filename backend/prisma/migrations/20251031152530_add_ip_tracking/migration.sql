-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_ipAddress_idx" ON "Event"("ipAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_customerId_ipAddress_idx" ON "Event"("customerId", "ipAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_customerId_playerId_ipAddress_idx" ON "Event"("customerId", "playerId", "ipAddress");
