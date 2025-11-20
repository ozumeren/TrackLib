#!/bin/bash
# Migration cleanup script for VPS

set -e  # Exit on error

echo "🔍 Checking current migration status..."
npx prisma migrate status

echo ""
echo "📋 Current migrations:"
ls -la prisma/migrations/ | grep -E "^d" | awk '{print $9}' | grep -v "^\." | nl

echo ""
echo "⚠️  This will:"
echo "   1. Backup current schema"
echo "   2. Delete all old migrations"
echo "   3. Create one clean baseline migration"
echo "   4. Mark it as applied (won't modify database)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "💾 Step 1: Backing up schema..."
cp prisma/schema.prisma prisma/schema.backup.$(date +%Y%m%d_%H%M%S).prisma
echo "✅ Schema backed up"

echo ""
echo "🗑️  Step 2: Deleting old migrations..."
MIGRATION_COUNT=$(ls -1 prisma/migrations/ | wc -l)
rm -rf prisma/migrations
echo "✅ Deleted $MIGRATION_COUNT old migrations"

echo ""
echo "📝 Step 3: Creating new baseline migration..."
npx prisma migrate dev --name baseline_schema --create-only
echo "✅ Baseline migration created"

echo ""
echo "✅ Step 4: Marking as applied..."
npx prisma migrate resolve --applied baseline_schema
echo "✅ Migration marked as applied"

echo ""
echo "🔍 Final verification..."
npx prisma migrate status

echo ""
echo "✅ Migration cleanup complete!"
echo ""
echo "📊 Summary:"
echo "   - Old migrations: $MIGRATION_COUNT → 1"
echo "   - Database: Unchanged (already up to date)"
echo "   - New baseline: baseline_schema"
