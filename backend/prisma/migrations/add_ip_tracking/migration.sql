-- Event tablosuna IP alanı ekle
ALTER TABLE "Event" ADD COLUMN "ipAddress" VARCHAR(45);

-- IP için index
CREATE INDEX "Event_ipAddress_idx" ON "Event"("ipAddress");
CREATE INDEX "Event_customerId_ipAddress_idx" ON "Event"("customerId", "ipAddress");

-- IP conflict detection için view (opsiyonel - performans için)
CREATE INDEX "Event_customerId_playerId_ipAddress_idx" ON "Event"("customerId", "playerId", "ipAddress");