-- CreateEnum
CREATE TYPE "public"."TriggerType" AS ENUM ('INACTIVITY', 'EVENT');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('SEND_TELEGRAM_MESSAGE');

-- CreateTable
CREATE TABLE "public"."Rule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "public"."TriggerType" NOT NULL,
    "config" JSONB NOT NULL,
    "customerId" INTEGER NOT NULL,
    "conversionGoalEvent" TEXT,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RuleVariant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "actionType" "public"."ActionType" NOT NULL,
    "actionPayload" JSONB NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "exposures" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RuleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "telegramBotToken" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" SERIAL NOT NULL,
    "playerId" TEXT NOT NULL,
    "email" TEXT,
    "customerId" INTEGER NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TelegramConnection" (
    "id" SERIAL NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,

    CONSTRAINT "TelegramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiKey" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "eventName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "parameters" JSONB,
    "customerId" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_apiKey_key" ON "public"."Customer"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Player_playerId_customerId_key" ON "public"."Player"("playerId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConnection_playerId_key" ON "public"."TelegramConnection"("playerId");

-- AddForeignKey
ALTER TABLE "public"."Rule" ADD CONSTRAINT "Rule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RuleVariant" ADD CONSTRAINT "RuleVariant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelegramConnection" ADD CONSTRAINT "TelegramConnection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelegramConnection" ADD CONSTRAINT "TelegramConnection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
