-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "Event_ipAddress_idx" ON "public"."Event"("ipAddress");

-- CreateIndex
CREATE INDEX "Event_customerId_ipAddress_idx" ON "public"."Event"("customerId", "ipAddress");

-- CreateIndex
CREATE INDEX "Event_customerId_playerId_ipAddress_idx" ON "public"."Event"("customerId", "playerId", "ipAddress");
