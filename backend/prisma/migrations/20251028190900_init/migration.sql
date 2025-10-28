/*
  Warnings:

  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "public"."_PlayerSegments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PlayerSegments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PlayerSegments_B_index" ON "public"."_PlayerSegments"("B");

-- CreateIndex
CREATE INDEX "Event_customerId_playerId_eventName_idx" ON "public"."Event"("customerId", "playerId", "eventName");

-- CreateIndex
CREATE INDEX "Event_customerId_eventName_createdAt_idx" ON "public"."Event"("customerId", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "Event_sessionId_idx" ON "public"."Event"("sessionId");

-- CreateIndex
CREATE INDEX "Player_customerId_playerId_idx" ON "public"."Player"("customerId", "playerId");

-- AddForeignKey
ALTER TABLE "public"."_PlayerSegments" ADD CONSTRAINT "_PlayerSegments_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PlayerSegments" ADD CONSTRAINT "_PlayerSegments_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
