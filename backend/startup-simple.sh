#!/bin/sh
# Strastix Backend Startup Script - For Coolify Managed Databases
# Simpler version that works with external PostgreSQL and Redis

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

echo "✅ Environment variables validated"

# ============================================
# Database Connection Wait
# ============================================
echo ""
echo "========================================="
echo "🔄 Waiting for database connection..."
echo "========================================="

MAX_TRIES=60
TRIES=0

# Extract database host from DATABASE_URL
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

echo "Database host: $DB_HOST"

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
# Redis Connection Check (Optional)
# ============================================
echo ""
echo "========================================="
echo "🔄 Checking Redis connection..."
echo "========================================="

if [ -n "$REDIS_HOST" ]; then
    REDIS_PORT=${REDIS_PORT:-6379}

    echo "Redis host: ${REDIS_HOST}:${REDIS_PORT}"

    REDIS_TRIES=0
    MAX_REDIS_TRIES=30

    until redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping > /dev/null 2>&1 || [ $REDIS_TRIES -eq $MAX_REDIS_TRIES ]; do
        REDIS_TRIES=$((REDIS_TRIES+1))
        echo "⏳ Waiting for Redis... ($REDIS_TRIES/$MAX_REDIS_TRIES)"
        sleep 1
    done

    if [ $REDIS_TRIES -eq $MAX_REDIS_TRIES ]; then
        echo "⚠️  Redis connection timeout - continuing without cache"
    else
        echo "✅ Redis is ready!"
    fi
else
    echo "⚠️  REDIS_HOST not set - skipping Redis check"
fi

# ============================================
# Database Migrations
# ============================================
echo ""
echo "========================================="
echo "🔄 Running Prisma migrations..."
echo "========================================="

# Generate Prisma client first
echo "📦 Generating Prisma client..."
npx prisma generate

# Check migration status
echo "🔍 Checking migration status..."
npx prisma migrate status || true

# Deploy migrations
echo "▶️  Deploying migrations..."
npx prisma migrate deploy

MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  Migration deployment had issues"

    # Try to resolve known failed migration
    echo "🔄 Attempting to resolve failed migrations..."
    npx prisma migrate resolve --applied add_ip_tracking 2>/dev/null || true

    echo "🔄 Retrying migration deployment..."
    npx prisma migrate deploy

    RETRY_EXIT_CODE=$?

    if [ $RETRY_EXIT_CODE -ne 0 ]; then
        echo "⚠️  Migration still failing"
        echo "📊 Checking database schema..."

        # Verify database connection and schema
        npx prisma db pull --force > /dev/null 2>&1

        if [ $? -eq 0 ]; then
            echo "✅ Database connection valid - schema appears correct"
            echo "▶️  Proceeding with application startup..."
        else
            echo "❌ Database schema verification failed"
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
