/*
  Warnings:

  - The values [FORWARD_TO_META_ADS] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[scriptId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActionType_new" AS ENUM ('SEND_TELEGRAM_MESSAGE', 'FORWARD_TO_META', 'FORWARD_TO_GOOGLE_ADS');
ALTER TABLE "public"."RuleVariant" ALTER COLUMN "actionType" TYPE "public"."ActionType_new" USING ("actionType"::text::"public"."ActionType_new");
ALTER TYPE "public"."ActionType" RENAME TO "ActionType_old";
ALTER TYPE "public"."ActionType_new" RENAME TO "ActionType";
DROP TYPE "public"."ActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scriptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_scriptId_key" ON "public"."Customer"("scriptId");

-- CreateIndex
CREATE INDEX "Customer_scriptId_idx" ON "public"."Customer"("scriptId");

-- CreateIndex
CREATE INDEX "Event_customerId_playerId_eventName_idx" ON "public"."Event"("customerId", "playerId", "eventName");

-- CreateIndex
CREATE INDEX "Event_customerId_eventName_createdAt_idx" ON "public"."Event"("customerId", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "Event_sessionId_idx" ON "public"."Event"("sessionId");

-- CreateIndex
CREATE INDEX "Player_customerId_playerId_idx" ON "public"."Player"("customerId", "playerId");
