/*
  Warnings:

  - The values [FORWARD_TO_META,FORWARD_TO_GOOGLE_ADS] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isActive` on the `Segment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `_PlayerSegments` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `scriptId` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActionType_new" AS ENUM ('SEND_TELEGRAM_MESSAGE', 'SEND_EMAIL', 'SEND_SMS', 'SEND_PUSH_NOTIFICATION', 'ADD_BONUS', 'ADD_FREE_SPINS', 'ADJUST_LOYALTY_POINTS', 'CHANGE_VIP_TIER', 'APPLY_CASHBACK', 'SEND_IN_APP_MESSAGE', 'TRIGGER_POPUP', 'ADD_TO_SEGMENT', 'REMOVE_FROM_SEGMENT', 'FLAG_ACCOUNT', 'CREATE_TASK', 'WEBHOOK', 'CUSTOM_JAVASCRIPT');
ALTER TABLE "public"."RuleVariant" ALTER COLUMN "actionType" TYPE "public"."ActionType_new" USING ("actionType"::text::"public"."ActionType_new");
ALTER TYPE "public"."ActionType" RENAME TO "ActionType_old";
ALTER TYPE "public"."ActionType_new" RENAME TO "ActionType";
DROP TYPE "public"."ActionType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TriggerType" ADD VALUE 'SEGMENT_EXIT';
ALTER TYPE "public"."TriggerType" ADD VALUE 'TIME_BASED';
ALTER TYPE "public"."TriggerType" ADD VALUE 'DEPOSIT_THRESHOLD';
ALTER TYPE "public"."TriggerType" ADD VALUE 'WITHDRAWAL_THRESHOLD';
ALTER TYPE "public"."TriggerType" ADD VALUE 'LOGIN_STREAK';
ALTER TYPE "public"."TriggerType" ADD VALUE 'LOSS_STREAK';
ALTER TYPE "public"."TriggerType" ADD VALUE 'WIN_STREAK';
ALTER TYPE "public"."TriggerType" ADD VALUE 'FIRST_DEPOSIT';
ALTER TYPE "public"."TriggerType" ADD VALUE 'BIRTHDAY';
ALTER TYPE "public"."TriggerType" ADD VALUE 'ACCOUNT_ANNIVERSARY';
ALTER TYPE "public"."TriggerType" ADD VALUE 'LOW_BALANCE';
ALTER TYPE "public"."TriggerType" ADD VALUE 'HIGH_BALANCE';
ALTER TYPE "public"."TriggerType" ADD VALUE 'GAME_SPECIFIC';
ALTER TYPE "public"."TriggerType" ADD VALUE 'BET_SIZE';
ALTER TYPE "public"."TriggerType" ADD VALUE 'SESSION_DURATION';
ALTER TYPE "public"."TriggerType" ADD VALUE 'MULTIPLE_FAILED_DEPOSITS';
ALTER TYPE "public"."TriggerType" ADD VALUE 'RTP_THRESHOLD';
ALTER TYPE "public"."TriggerType" ADD VALUE 'BONUS_EXPIRY';

-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Player" DROP CONSTRAINT "Player_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Rule" DROP CONSTRAINT "Rule_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Segment" DROP CONSTRAINT "Segment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TelegramConnection" DROP CONSTRAINT "TelegramConnection_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TelegramConnection" DROP CONSTRAINT "TelegramConnection_playerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PlayerSegments" DROP CONSTRAINT "_PlayerSegments_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PlayerSegments" DROP CONSTRAINT "_PlayerSegments_B_fkey";

-- DropIndex
DROP INDEX "public"."Event_customerId_eventName_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Event_customerId_playerId_eventName_idx";

-- DropIndex
DROP INDEX "public"."Event_sessionId_idx";

-- DropIndex
DROP INDEX "public"."Player_customerId_playerId_idx";

-- AlterTable
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "allowedDomains" DROP DEFAULT,
ALTER COLUMN "scriptId" SET NOT NULL,
ADD CONSTRAINT "Customer_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Customer_id_seq";

-- AlterTable
ALTER TABLE "public"."Event" ALTER COLUMN "customerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Player" ALTER COLUMN "customerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Rule" ADD COLUMN     "activeDaysOfWeek" JSONB,
ADD COLUMN     "activeHours" JSONB,
ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "cooldownPeriodDays" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "lastExecutedAt" TIMESTAMP(3),
ADD COLUMN     "maxExecutionsPerPlayer" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "testingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalConversions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalExecutions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "customerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."RuleVariant" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."Segment" DROP COLUMN "isActive",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "customerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."TelegramConnection" ALTER COLUMN "customerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "name",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "customerId" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- DropTable
DROP TABLE "public"."_PlayerSegments";

-- DropEnum
DROP TYPE "public"."Role";

-- CreateTable
CREATE TABLE "public"."RuleExecution" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "playerId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleExecution_customerId_playerId_idx" ON "public"."RuleExecution"("customerId", "playerId");

-- CreateIndex
CREATE INDEX "RuleExecution_ruleId_idx" ON "public"."RuleExecution"("ruleId");

-- CreateIndex
CREATE INDEX "RuleExecution_executedAt_idx" ON "public"."RuleExecution"("executedAt");

-- CreateIndex
CREATE INDEX "Event_customerId_playerId_idx" ON "public"."Event"("customerId", "playerId");

-- CreateIndex
CREATE INDEX "Event_eventName_idx" ON "public"."Event"("eventName");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "public"."Event"("createdAt");

-- CreateIndex
CREATE INDEX "Rule_customerId_isActive_idx" ON "public"."Rule"("customerId", "isActive");

-- CreateIndex
CREATE INDEX "Rule_triggerType_idx" ON "public"."Rule"("triggerType");

-- CreateIndex
CREATE INDEX "Rule_priority_idx" ON "public"."Rule"("priority");

-- CreateIndex
CREATE INDEX "Segment_customerId_idx" ON "public"."Segment"("customerId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelegramConnection" ADD CONSTRAINT "TelegramConnection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Segment" ADD CONSTRAINT "Segment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rule" ADD CONSTRAINT "Rule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RuleExecution" ADD CONSTRAINT "RuleExecution_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
