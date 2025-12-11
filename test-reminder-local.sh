#!/bin/bash

# Local Reminder Processor Test Script
# This script mimics the GitHub workflow but targets localhost

# Configuration
LOCAL_URL="http://localhost:3000"
# LOCAL_URL="https://staff-better.vercel.app"
# LOCAL_URL="https://staff-better.com"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    # Read .env file line by line, handling comments and empty lines properly
    set -a  # Automatically export all variables
    while IFS= read -r line || [ -n "$line" ]; do
        # Remove carriage returns (Windows line endings)
        line=$(echo "$line" | tr -d '\r')
        
        # Skip empty lines
        [ -z "$line" ] && continue
        
        # Skip lines that start with # (comments)
        case "$line" in
            \#*) continue ;;
        esac
        
        # Remove inline comments (everything after # that's not in quotes)
        # Simple approach: remove # and everything after it, but preserve the key=value part
        if echo "$line" | grep -q '='; then
            # Extract key=value part (before any #)
            key_value=$(echo "$line" | sed 's/#.*$//' | xargs)
            [ -n "$key_value" ] && export "$key_value"
        fi
    done < .env
    set +a  # Stop automatically exporting
else
    echo "📄 No .env file found. Creating one with default values..."
    echo "CRON_SECRET=test-secret-123" > .env
    echo "📄 Created .env file with default CRON_SECRET"
fi

# Set default CRON_SECRET if not already set
CRON_SECRET="${CRON_SECRET:-test-secret-123}"

echo "🚀 Starting local reminder processing test..."
echo "⏰ Current time: $(date)"
echo "🌐 Target URL: $LOCAL_URL"
# Show first 10 chars of CRON_SECRET for debugging (without exposing full secret)
CRON_SECRET_PREVIEW=$(echo "$CRON_SECRET" | cut -c1-10)
echo "🔑 Using CRON_SECRET: ${CRON_SECRET_PREVIEW}..."

# Check if the local server is running
echo "🔍 Checking if local server is running..."
if ! curl -s "$LOCAL_URL" > /dev/null; then
    echo "❌ Local server is not running at $LOCAL_URL"
    echo "💡 Please start your Next.js development server with: npm run dev"
    exit 1
fi

echo "✅ Local server is running"

# Make API call to your local app
echo "📡 Making API call to local reminder processor..."

# Try POST first (with authentication)
echo "🔐 Testing POST endpoint with authentication..."
RESPONSE=$(curl -sL -w "\n%{http_code}" -X POST "$LOCAL_URL/api/reminders/process" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

# Extract HTTP status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 HTTP Status: $HTTP_CODE"
echo "📊 Response Body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

# If POST fails with auth, try GET (no auth required)
if [ "$HTTP_CODE" -ne 200 ]; then
    if [ "$HTTP_CODE" -eq 401 ]; then
        echo ""
        echo "⚠️  POST failed with 401 Unauthorized"
        echo "💡 This usually means:"
        echo "   - Your local CRON_SECRET doesn't match the server's CRON_SECRET"
        if [[ "$LOCAL_URL" == *"staff-better.com"* ]] || [[ "$LOCAL_URL" == *"vercel.app"* ]]; then
            echo "   - You're testing against PRODUCTION, which has its own CRON_SECRET in Vercel"
            echo "   - Get the production CRON_SECRET from: Vercel Dashboard → Your Project → Settings → Environment Variables"
            echo "   - Or test against localhost:3000 if running locally"
        fi
        echo ""
    else
        echo ""
        echo "🔄 POST failed with status $HTTP_CODE"
    fi
    
    echo "🔄 Trying GET endpoint (no authentication required)..."
    RESPONSE=$(curl -sL -w "\n%{http_code}" -X GET "$LOCAL_URL/api/reminders/process")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)
    
    echo "📊 HTTP Status: $HTTP_CODE"
    echo "📊 Response Body:"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

# Check if the request was successful
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ API call successful"
    
    # Parse JSON response if possible
    if echo "$RESPONSE_BODY" | jq -e '.success == true' > /dev/null 2>&1; then
        echo "✅ Reminder processing completed successfully"
        PROCESSED=$(echo "$RESPONSE_BODY" | jq -r '.processed // 0')
        SUCCESSFUL=$(echo "$RESPONSE_BODY" | jq -r '.successful // 0')
        FAILED=$(echo "$RESPONSE_BODY" | jq -r '.failed // 0')
        echo "📈 Results: Processed=$PROCESSED, Successful=$SUCCESSFUL, Failed=$FAILED"
    else
        echo "⚠️ API returned success but reminder processing may have failed"
        echo "$RESPONSE_BODY"
    fi
else
    echo "❌ API call failed with status $HTTP_CODE"
    echo "$RESPONSE_BODY"
    exit 1
fi

echo ""
echo "🎉 Local reminder processing test completed!"
