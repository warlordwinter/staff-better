#!/bin/bash

# Local Reminder Processor Test Script
# This script mimics the GitHub workflow but targets localhost

# Configuration
LOCAL_URL="http://localhost:3000"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
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
    echo ""
    echo "🔄 POST failed, trying GET endpoint (no authentication required)..."
    
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
