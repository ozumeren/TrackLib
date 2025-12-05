-- Add trackerType field to Customer table
-- This allows customers to select which tracker script they want to use:
-- "pronet" (for Truva infrastructure)
-- "ebetlab" (for Rona infrastructure)  
-- "default" (generic tracker)

ALTER TABLE "Customer" ADD COLUMN "trackerType" TEXT NOT NULL DEFAULT 'default';

-- Create index for faster queries
CREATE INDEX "Customer_trackerType_idx" ON "Customer"("trackerType");

-- Update existing Rona customer to use ebetlab tracker
UPDATE "Customer" SET "trackerType" = 'ebetlab' WHERE "scriptId" = 'rona_tracker';
