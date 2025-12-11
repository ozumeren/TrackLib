#!/bin/bash
# Strastix Cleanup Script - Run this on server before redeploying

echo "🧹 Cleaning up Strastix deployment..."

# Stop all containers
echo "⏸️  Stopping containers..."
docker stop strastix-backend strastix-frontend strastix-test-casino strastix-postgres strastix-redis 2>/dev/null || true

# Remove containers
echo "🗑️  Removing containers..."
docker rm strastix-backend strastix-frontend strastix-test-casino strastix-postgres strastix-redis 2>/dev/null || true

# Remove volumes (WARNING: This deletes all data!)
echo "⚠️  Removing volumes..."
read -p "This will DELETE ALL DATA. Continue? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    docker volume rm strastix-postgres-data strastix-redis-data strastix-backend-logs 2>/dev/null || true
    echo "✅ Volumes removed"
else
    echo "⏭️  Skipping volume removal"
fi

# Remove network
echo "🔌 Removing network..."
docker network rm strastix-network 2>/dev/null || true

# Prune build cache
echo "🧹 Pruning build cache..."
docker builder prune -f

echo ""
echo "✅ Cleanup complete!"
echo "Now redeploy in Coolify"
