#!/bin/bash

# Create Rona customer on production via API

echo "🚀 Creating Rona Customer on Production..."
echo ""

curl -X POST https://api.strastix.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Rona Casino",
    "scriptId": "rona_tracker",
    "trackerType": "ebetlab",
    "userName": "Rona Admin",
    "email": "admin@ronacasino.com",
    "password": "RonaSecure2025!"
  }' | jq '.'

echo ""
echo "✅ Customer creation request sent!"
echo ""
echo "📝 Script ID will be: strastix_rona_tracker"
echo "🔗 Script URL: https://api.strastix.com/c/strastix_rona_tracker.js"
echo ""
