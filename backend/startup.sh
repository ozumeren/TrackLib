#!/bin/sh
# Don't exit on errors during migration - we'll handle them
set +e

echo "========================================="
echo "🚀 Starting Strastix Backend"
echo "========================================="
echo ""

# Check required environment variables
echo "📋 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set!"
    exit 1
fi
echo "✅ DATABASE_URL is set"

if [ -z "$JWT_SECRET" ]; then
    echo "❌ ERROR: JWT_SECRET is not set!"
    exit 1
fi
echo "✅ JWT_SECRET is set"

if [ -z "$REDIS_HOST" ]; then
    echo "⚠️  WARNING: REDIS_HOST is not set (using default: localhost)"
fi
echo "✅ REDIS_HOST: ${REDIS_HOST:-localhost}"

echo ""
echo "========================================="
echo "🔄 Waiting for database connection..."
echo "========================================="

# Wait for database to be ready (max 60 seconds)
MAX_TRIES=30
TRIES=0
until pg_isready -d "$DATABASE_URL" > /dev/null 2>&1 || [ $TRIES -eq $MAX_TRIES ]; do
    TRIES=$((TRIES+1))
    echo "⏳ Waiting for database... ($TRIES/$MAX_TRIES)"
    sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
    echo "❌ Database connection timeout!"
    echo "DATABASE_URL: ${DATABASE_URL}"
    exit 1
fi

echo "✅ Database is ready!"
echo ""

echo "========================================="
echo "🔄 Running Prisma migrations..."
echo "========================================="

# First, try to resolve any failed migrations
echo "🔍 Checking for failed migrations..."
npx prisma migrate resolve --applied add_ip_tracking 2>/dev/null || echo "No failed migration to resolve"

# Now deploy migrations
echo "▶️  Deploying migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  Migration deploy failed"
    echo "🔄 Attempting to fix migration state..."

    # Try to mark as rolled back and redeploy
    npx prisma migrate resolve --rolled-back add_ip_tracking 2>/dev/null || true

    echo "🔄 Retrying migration deploy..."
    npx prisma migrate deploy

    if [ $? -ne 0 ]; then
        echo "❌ Migration still failing, but continuing..."
        echo "⚠️  App may work if database schema is already correct"
    fi
fi

echo ""
echo "========================================="
echo "🚀 Starting Node.js server..."
echo "========================================="
echo ""

exec npm start
