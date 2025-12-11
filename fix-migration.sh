#!/bin/bash
# Migration Fix Script
# Run this inside the backend container or on the server

echo "🔧 Fixing failed migration: add_ip_tracking"
echo ""

# Mark the failed migration as applied
echo "1️⃣ Marking migration as applied..."
npx prisma migrate resolve --applied add_ip_tracking

echo ""
echo "2️⃣ Deploying remaining migrations..."
npx prisma migrate deploy

echo ""
echo "3️⃣ Verifying migration status..."
npx prisma migrate status

echo ""
echo "✅ Migration fix complete!"
