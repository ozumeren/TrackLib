/*
  Warnings:

  - The values [FORWARD_TO_TIKTOK_ADS] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `tiktokAccessToken` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `tiktokPixelId` on the `Customer` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ActionType_new" AS ENUM ('SEND_TELEGRAM_MESSAGE', 'FORWARD_TO_META_ADS', 'FORWARD_TO_GOOGLE_ADS');
ALTER TABLE "public"."RuleVariant" ALTER COLUMN "actionType" TYPE "public"."ActionType_new" USING ("actionType"::text::"public"."ActionType_new");
ALTER TYPE "public"."ActionType" RENAME TO "ActionType_old";
ALTER TYPE "public"."ActionType_new" RENAME TO "ActionType";
DROP TYPE "public"."ActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Customer" DROP COLUMN "tiktokAccessToken",
DROP COLUMN "tiktokPixelId";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'MEMBER';
