#!/bin/bash

# ============================================
# RONA TRACKER v3.0 - QUICK DEPLOYMENT SCRIPT
# ============================================
#
# Bu script tüm deployment adımlarını otomatik yapar.
#
# Kullanım:
#   chmod +x deploy-rona.sh
#   ./deploy-rona.sh
#

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   RONA TRACKER v3.0 DEPLOYMENT         ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================
# STEP 1: Check Prerequisites
# ============================================
print_step 1 "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found! Please install Node.js v16+"
    exit 1
fi
print_success "Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found!"
    exit 1
fi
print_success "npm $(npm --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found (but might be running remotely)"
else
    print_success "PostgreSQL client found"
fi

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_warning "Backend is not running on port 3000"
    echo "   Start backend first: npm start"
    read -p "   Continue anyway? (y/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success "Backend is running"
fi

# ============================================
# STEP 2: Check Files
# ============================================
print_step 2 "Checking required files..."

FILES=(
    "setup-rona-customer.js"
    "update-rona-config.js"
    "rona-dom-config.json"
    "public/tracker-rona.js"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "File not found: $file"
        exit 1
    fi
done
print_success "All required files present"

# ============================================
# STEP 3: Create Customer
# ============================================
print_step 3 "Creating Rona customer..."

echo ""
echo "This will create a new customer in the database."
echo "If customer already exists, you can skip or recreate."
echo ""

read -p "Create/Recreate Rona customer? (Y/n): " create_customer

if [[ $create_customer =~ ^[Yy]$|^$ ]]; then
    node setup-rona-customer.js
    if [ $? -eq 0 ]; then
        print_success "Customer created successfully"
    else
        print_error "Failed to create customer"
        exit 1
    fi
else
    print_warning "Skipped customer creation"
fi

# ============================================
# STEP 4: Load DOM Config
# ============================================
print_step 4 "Loading DOM configuration..."

echo ""
node update-rona-config.js rona_tracker

if [ $? -eq 0 ]; then
    print_success "DOM config loaded successfully"
else
    print_error "Failed to load DOM config"
    exit 1
fi

# ============================================
# STEP 5: Verify Files
# ============================================
print_step 5 "Verifying tracker files..."

if [ ! -f "public/tracker-rona.js" ]; then
    print_error "tracker-rona.js not found in public/"
    exit 1
fi

print_success "Tracker file verified ($(wc -c < public/tracker-rona.js) bytes)"

# ============================================
# STEP 6: Test Script Endpoint
# ============================================
print_step 6 "Testing script endpoint..."

echo ""
echo "Testing: http://localhost:3000/c/rona_tracker.js"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/c/rona_tracker.js)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    print_success "Script endpoint working (HTTP $HTTP_CODE)"

    # Check if it's the Rona tracker
    if echo "$BODY" | grep -q "RONA Edition"; then
        print_success "Rona tracker detected in response"
    else
        print_warning "Response doesn't contain 'RONA Edition'"
    fi
else
    print_error "Script endpoint failed (HTTP $HTTP_CODE)"
    echo "$BODY" | head -n 10
    exit 1
fi

# ============================================
# STEP 7: Summary
# ============================================
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   DEPLOYMENT COMPLETED SUCCESSFULLY!   ║"
echo "╚════════════════════════════════════════╝"
echo ""

echo "📋 SUMMARY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Customer: Rona Casino"
echo "✅ Script ID: rona_tracker"
echo "✅ DOM Config: 5 rules loaded"
echo "✅ Tracker: tracker-rona.js (v3.0)"
echo ""
echo "🔗 INTEGRATION:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Local URL:"
echo "  http://localhost:3000/c/rona_tracker.js"
echo ""
echo "Integration Code:"
echo '  <script src="http://localhost:3000/c/rona_tracker.js" async></script>'
echo ""
echo "Production URL (update with your domain):"
echo "  https://your-backend.com/c/rona_tracker.js"
echo ""
echo "📝 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Test locally:"
echo "   open test-rona-tracking.html"
echo ""
echo "2. Check events in database:"
echo "   psql -d tracklib -c \"SELECT * FROM \\\"Event\\\" ORDER BY \\\"createdAt\\\" DESC LIMIT 10;\""
echo ""
echo "3. For production deployment, see:"
echo "   cat DEPLOYMENT-GUIDE.md"
echo ""
echo "4. Add script to Rona website:"
echo "   <head>"
echo '     <script src="https://your-backend.com/c/rona_tracker.js" async></script>'
echo "   </head>"
echo ""
echo "🎉 Happy Tracking!"
echo ""
