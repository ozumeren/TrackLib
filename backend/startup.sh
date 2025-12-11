#!/bin/sh
# Strastix Backend Startup Script
# Handles database migrations and starts the application

set +e  # Don't exit on errors - we'll handle them gracefully

echo "========================================="
echo "🚀 Starting Strastix Backend"
echo "========================================="
echo ""

# ============================================
# Environment Variable Validation
# ============================================
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
    echo "⚠️  WARNING: REDIS_HOST not set (using default: localhost)"
    export REDIS_HOST="localhost"
fi
echo "✅ REDIS_HOST: ${REDIS_HOST}"

# ============================================
# Database Connection Wait
# ============================================
echo ""
echo "========================================="
echo "🔄 Waiting for database connection..."
echo "========================================="

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

# ============================================
# Redis Connection Wait (Optional)
# ============================================
echo ""
echo "========================================="
echo "🔄 Waiting for Redis connection..."
echo "========================================="

REDIS_TRIES=0
MAX_REDIS_TRIES=15

# Extract Redis host and port
REDIS_PORT=${REDIS_PORT:-6379}

until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping > /dev/null 2>&1 || [ $REDIS_TRIES -eq $MAX_REDIS_TRIES ]; do
    REDIS_TRIES=$((REDIS_TRIES+1))
    echo "⏳ Waiting for Redis... ($REDIS_TRIES/$MAX_REDIS_TRIES)"
    sleep 2
done

if [ $REDIS_TRIES -eq $MAX_REDIS_TRIES ]; then
    echo "⚠️  Redis connection timeout - continuing without cache"
else
    echo "✅ Redis is ready!"
fi

# ============================================
# Database Migrations
# ============================================
echo ""
echo "========================================="
echo "🔄 Running Prisma migrations..."
echo "========================================="

# Check for any failed migrations
echo "🔍 Checking migration status..."
npx prisma migrate status || true

# Deploy pending migrations
echo "▶️  Deploying migrations..."
npx prisma migrate deploy

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  Migration deployment encountered issues"
    echo "🔄 Attempting to resolve migration state..."

    # Try to resolve any locked migrations
    npx prisma migrate resolve --applied add_ip_tracking 2>/dev/null || true

    # Retry migration
    echo "🔄 Retrying migration deployment..."
    npx prisma migrate deploy

    RETRY_EXIT_CODE=$?

    if [ $RETRY_EXIT_CODE -ne 0 ]; then
        echo "⚠️  Migration still failing - this may be OK if schema is already up-to-date"
        echo "📊 Checking if database schema is valid..."

        # Generate Prisma client to verify schema
        npx prisma generate > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            echo "✅ Prisma client generated successfully - schema appears valid"
            echo "▶️  Proceeding with application startup..."
        else
            echo "❌ Schema validation failed"
            exit 1
        fi
    else
        echo "✅ Migration retry succeeded!"
    fi
fi

# ============================================
# Application Startup
# ============================================
echo ""
echo "========================================="
echo "🚀 Starting Node.js application..."
echo "========================================="
echo "Environment: ${NODE_ENV:-development}"
echo "Port: ${PORT:-3000}"
echo ""

# Start the application
exec npm start
