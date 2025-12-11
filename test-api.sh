#!/bin/bash
# API Endpoint Test Script

API_URL="${1:-https://api.strastix.com}"

echo "🧪 Testing Backend API Endpoints"
echo "API URL: $API_URL"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local headers=$5

    echo -n "Testing: $description... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" $headers)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        [ ! -z "$body" ] && echo "  Response: $body" | head -c 100
    elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        echo -e "${YELLOW}⚠ AUTH${NC} (HTTP $http_code) - Auth required"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        [ ! -z "$body" ] && echo "  Error: $body" | head -c 100
    fi
    echo ""
}

# ============================================
# PUBLIC ENDPOINTS (No Auth)
# ============================================
echo "📂 PUBLIC ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/health" "Health Check"

test_endpoint "GET" "/ready" "Readiness Check"

test_endpoint "GET" "/api" "API Documentation"

# ============================================
# TRACKING ENDPOINTS
# ============================================
echo ""
echo "📊 TRACKING ENDPOINTS"
echo "----------------------------------------"

# This will fail without proper apiKey but we can test if endpoint exists
test_endpoint "POST" "/api/e" "Event Tracking" \
    '{"eventName":"test","url":"https://test.com","sessionId":"test123"}' \
    '-H "X-API-Key: test"'

# ============================================
# AUTH ENDPOINTS
# ============================================
echo ""
echo "🔐 AUTH ENDPOINTS"
echo "----------------------------------------"

test_endpoint "POST" "/api/auth/login" "Login" \
    '{"email":"test@test.com","password":"test123"}'

test_endpoint "POST" "/api/auth/register" "Register" \
    '{"email":"newuser@test.com","password":"test123","name":"Test User"}'

test_endpoint "GET" "/api/auth/me" "Get Current User"

# ============================================
# CUSTOMER ENDPOINTS
# ============================================
echo ""
echo "👤 CUSTOMER ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/api/customers" "List Customers"

test_endpoint "GET" "/api/customers/current" "Get Current Customer"

# ============================================
# EVENT ENDPOINTS
# ============================================
echo ""
echo "📈 EVENT ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/api/events" "List Events"

test_endpoint "GET" "/api/events/stats" "Event Statistics"

# ============================================
# PLAYER ENDPOINTS
# ============================================
echo ""
echo "🎮 PLAYER ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/api/players" "List Players"

test_endpoint "GET" "/api/players/stats" "Player Statistics"

# ============================================
# RULE ENDPOINTS
# ============================================
echo ""
echo "📋 RULE ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/api/rules" "List Rules"

# ============================================
# SEGMENT ENDPOINTS
# ============================================
echo ""
echo "🎯 SEGMENT ENDPOINTS"
echo "----------------------------------------"

test_endpoint "GET" "/api/segments" "List Segments"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "✅ Test complete!"
echo ""
echo "Note: Some endpoints require authentication"
echo "Use /api/auth/register to create an account"
echo "Then /api/auth/login to get a JWT token"
