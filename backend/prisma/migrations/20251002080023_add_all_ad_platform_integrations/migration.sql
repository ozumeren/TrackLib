/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActionType" ADD VALUE 'FORWARD_TO_META_ADS';
ALTER TYPE "public"."ActionType" ADD VALUE 'FORWARD_TO_GOOGLE_ADS';
ALTER TYPE "public"."ActionType" ADD VALUE 'FORWARD_TO_TIKTOK_ADS';

-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "googleAdsId" TEXT,
ADD COLUMN     "googleApiSecret" TEXT,
ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaPixelId" TEXT,
ADD COLUMN     "tiktokAccessToken" TEXT,
ADD COLUMN     "tiktokPixelId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBER';

-- DropEnum
DROP TYPE "public"."Role";
