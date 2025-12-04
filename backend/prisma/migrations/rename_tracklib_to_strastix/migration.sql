-- Update scriptId from tracklib to strastix
UPDATE "Customer"
SET "scriptId" = REPLACE("scriptId", 'tracklib', 'strastix')
WHERE "scriptId" LIKE '%tracklib%';
