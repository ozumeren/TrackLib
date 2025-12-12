-- Migration: Simplify Remove API Keys
-- Removes apiKey from Customer and Event models

-- 1. Remove apiKey from Customer table
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "apiKey";

-- 2. Remove unused CRM fields from Customer table
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "metaPixelId";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "metaAccessToken";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "googleAdsId";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "googleApiSecret";

-- 3. Remove apiKey from Event table
ALTER TABLE "Event" DROP COLUMN IF EXISTS "apiKey";

-- Migration tamamlandı!
--
-- NOTLAR:
-- - Customer.scriptId hala unique key olarak kalıyor
-- - Event tracking artık script_id ile yapılıyor
-- - Domain kontrolü .env'den EBETLAB_ALLOWED_DOMAINS ve TRUVA_ALLOWED_DOMAINS ile
