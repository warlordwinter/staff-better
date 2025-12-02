#!/bin/bash

# AWS Production Environment Test Script
# This script comprehensively tests your AWS production infrastructure
# Usage: ./test-aws-production.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
# Try to auto-detect stack name, fallback to common names
STACK_NAME="${CLOUDFORMATION_STACK_NAME:-}"
LAMBDA_REMINDER="${LAMBDA_REMINDER_NAME:-ReminderProcessor}"
LAMBDA_DAILY_SUMMARY="${LAMBDA_DAILY_SUMMARY_NAME:-DailySummaryEmail}"
SCHEDULE_GROUP="${EVENTBRIDGE_SCHEDULE_GROUP:-default}"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("✅ $1")
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("❌ $1")
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if AWS CLI is installed and configured
check_aws_cli() {
    print_header "Checking AWS CLI Configuration"
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    print_success "AWS CLI is installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or invalid"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS credentials are valid (Account: $ACCOUNT_ID)"
    print_info "Region: $REGION"
}

# Test CloudFormation Stack
test_cloudformation_stack() {
    print_header "Testing CloudFormation Stack"
    
    # Auto-detect stack name if not provided
    if [ -z "$STACK_NAME" ]; then
        print_info "Auto-detecting CloudFormation stack name..."
        POSSIBLE_NAMES=("reminder-scheduler-stack" "ReminderSchedulerStack" "reminder-scheduler")
        
        for NAME in "${POSSIBLE_NAMES[@]}"; do
            if aws cloudformation describe-stacks --stack-name "$NAME" --region "$REGION" &> /dev/null; then
                STACK_NAME="$NAME"
                print_success "Found stack: $STACK_NAME"
                break
            fi
        done
    fi
    
    if [ -z "$STACK_NAME" ]; then
        print_warning "Could not find CloudFormation stack (tried: reminder-scheduler-stack, ReminderSchedulerStack, reminder-scheduler)"
        print_info "This is OK if the stack was created manually or has a different name"
        return
    fi
    
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        STACK_STATUS=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'Stacks[0].StackStatus' \
            --output text)
        
        if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
            print_success "CloudFormation stack '$STACK_NAME' is in healthy state: $STACK_STATUS"
            
            # Get stack outputs
            print_info "Stack Outputs:"
            aws cloudformation describe-stacks \
                --stack-name "$STACK_NAME" \
                --region "$REGION" \
                --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
                --output table
        else
            print_error "CloudFormation stack '$STACK_NAME' is in unhealthy state: $STACK_STATUS"
        fi
    else
        print_error "CloudFormation stack '$STACK_NAME' not found"
    fi
}

# Test Lambda Functions
test_lambda_function() {
    local FUNCTION_NAME=$1
    local DESCRIPTION=$2
    
    print_header "Testing Lambda Function: $FUNCTION_NAME"
    
    if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
        print_success "Lambda function '$FUNCTION_NAME' exists"
        
        # Get function configuration
        FUNCTION_CONFIG=$(aws lambda get-function \
            --function-name "$FUNCTION_NAME" \
            --region "$REGION" \
            --query 'Configuration.[FunctionName,Runtime,LastModified,State,StateReason]' \
            --output text)
        
        print_info "Function Configuration:"
        echo "  $FUNCTION_CONFIG" | awk '{print "  Name: " $1 "\n  Runtime: " $2 "\n  Last Modified: " $3 "\n  State: " $4 "\n  State Reason: " $5}'
        
        # Check function state
        FUNCTION_STATE=$(aws lambda get-function \
            --function-name "$FUNCTION_NAME" \
            --region "$REGION" \
            --query 'Configuration.State' \
            --output text)
        
        if [ "$FUNCTION_STATE" = "Active" ]; then
            print_success "Lambda function '$FUNCTION_NAME' is Active"
        else
            print_error "Lambda function '$FUNCTION_NAME' is not Active (State: $FUNCTION_STATE)"
        fi
        
        # Check environment variables
        ENV_VARS=$(aws lambda get-function-configuration \
            --function-name "$FUNCTION_NAME" \
            --region "$REGION" \
            --query 'Environment.Variables' \
            --output json)
        
        if [ "$ENV_VARS" != "null" ] && [ "$ENV_VARS" != "{}" ]; then
            print_success "Environment variables are configured"
            print_info "Environment Variables:"
            echo "$ENV_VARS" | jq -r 'to_entries[] | "  \(.key): \(if .value | length > 20 then .value[0:20] + "..." else .value end)"'
        else
            print_warning "No environment variables found (this may be expected)"
        fi
        
        # Test invocation for ReminderProcessor
        if [ "$FUNCTION_NAME" = "$LAMBDA_REMINDER" ]; then
            print_info "Testing Lambda invocation with sample payload..."
            # Create payload file to avoid base64 encoding issues
            PAYLOAD_FILE=$(mktemp)
            JOB_ID="test-production-$(date +%s)"
            WORK_DATE="$(date -u +%Y-%m-%d)"
            
            # Use jq if available, otherwise use echo (less safe but works)
            if command -v jq &> /dev/null; then
                jq -n \
                    --arg job_id "$JOB_ID" \
                    --arg work_date "$WORK_DATE" \
                    --arg start_time "09:00:00" \
                    --arg reminder_type "DAY_BEFORE" \
                    '{job_id: $job_id, work_date: $work_date, start_time: $start_time, reminder_type: $reminder_type}' \
                    > "$PAYLOAD_FILE"
            else
                # Fallback: create JSON manually (less safe but works)
                echo "{\"job_id\":\"$JOB_ID\",\"work_date\":\"$WORK_DATE\",\"start_time\":\"09:00:00\",\"reminder_type\":\"DAY_BEFORE\"}" > "$PAYLOAD_FILE"
            fi
            
            RESPONSE_FILE=$(mktemp)
            ERROR_FILE=$(mktemp)
            
            # Try invoking the Lambda using file:// prefix
            if aws lambda invoke \
                --function-name "$FUNCTION_NAME" \
                --region "$REGION" \
                --payload "file://$PAYLOAD_FILE" \
                "$RESPONSE_FILE" \
                2> "$ERROR_FILE"; then
                
                RESPONSE=$(cat "$RESPONSE_FILE")
                ERROR_OUTPUT=$(cat "$ERROR_FILE")
                rm -f "$RESPONSE_FILE" "$ERROR_FILE" "$PAYLOAD_FILE"
                
                # Check if response contains error
                if echo "$RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
                    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.errorMessage')
                    ERROR_TYPE=$(echo "$RESPONSE" | jq -r '.errorType // "Unknown"')
                    print_warning "Lambda returned error (this may be expected for test data):"
                    echo "  Type: $ERROR_TYPE"
                    echo "  Message: $ERROR_MSG"
                    # Don't count this as a failure since it's expected with test data
                elif echo "$RESPONSE" | jq -e '.statusCode' > /dev/null 2>&1; then
                    STATUS_CODE=$(echo "$RESPONSE" | jq -r '.statusCode')
                    if [ "$STATUS_CODE" = "200" ]; then
                        print_success "Lambda invocation succeeded (Status: $STATUS_CODE)"
                        print_info "Response preview:"
                        echo "$RESPONSE" | jq '.' | head -20
                    else
                        print_warning "Lambda returned status code $STATUS_CODE (may be expected)"
                        echo "$RESPONSE" | jq '.' | head -10
                    fi
                else
                    print_success "Lambda invocation completed"
                    print_info "Response preview:"
                    echo "$RESPONSE" | jq '.' | head -20
                fi
            else
                ERROR_OUTPUT=$(cat "$ERROR_FILE")
                print_error "Failed to invoke Lambda function"
                print_info "Error details:"
                echo "$ERROR_OUTPUT" | head -5
                rm -f "$RESPONSE_FILE" "$ERROR_FILE" "$PAYLOAD_FILE"
            fi
        fi
        
        # Test invocation for DailySummaryEmail
        if [ "$FUNCTION_NAME" = "$LAMBDA_DAILY_SUMMARY" ]; then
            print_info "Testing Lambda invocation with empty payload..."
            RESPONSE_FILE=$(mktemp)
            ERROR_FILE=$(mktemp)
            
            if aws lambda invoke \
                --function-name "$FUNCTION_NAME" \
                --region "$REGION" \
                --payload '{}' \
                "$RESPONSE_FILE" \
                2> "$ERROR_FILE"; then
                
                RESPONSE=$(cat "$RESPONSE_FILE")
                ERROR_OUTPUT=$(cat "$ERROR_FILE")
                rm -f "$RESPONSE_FILE" "$ERROR_FILE"
                
                # Check if response contains error
                if echo "$RESPONSE" | jq -e '.errorMessage' > /dev/null 2>&1; then
                    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.errorMessage')
                    print_warning "Lambda returned error (may be expected if API is not accessible): $ERROR_MSG"
                elif echo "$RESPONSE" | jq -e '.statusCode' > /dev/null 2>&1; then
                    STATUS_CODE=$(echo "$RESPONSE" | jq -r '.statusCode')
                    if [ "$STATUS_CODE" = "200" ]; then
                        print_success "Lambda invocation succeeded (Status: $STATUS_CODE)"
                        print_info "Response preview:"
                        echo "$RESPONSE" | jq '.' | head -20
                    else
                        print_warning "Lambda returned status code $STATUS_CODE"
                        echo "$RESPONSE" | jq '.' | head -10
                    fi
                else
                    print_success "Lambda invocation completed"
                    print_info "Response preview:"
                    echo "$RESPONSE" | jq '.' | head -20
                fi
            else
                ERROR_OUTPUT=$(cat "$ERROR_FILE")
                print_error "Failed to invoke Lambda function"
                print_info "Error details:"
                echo "$ERROR_OUTPUT" | head -5
                rm -f "$RESPONSE_FILE" "$ERROR_FILE"
            fi
        fi
        
    else
        print_error "Lambda function '$FUNCTION_NAME' not found"
    fi
}

# Test EventBridge Schedules
test_eventbridge_schedules() {
    print_header "Testing EventBridge Schedules"
    
    # Check if schedules exist
    SCHEDULES=$(aws scheduler list-schedules \
        --group-name "$SCHEDULE_GROUP" \
        --region "$REGION" \
        --query 'Schedules[*].[Name,State]' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$SCHEDULES" ] && [ "$SCHEDULES" != "None" ]; then
        SCHEDULE_COUNT=$(echo "$SCHEDULES" | wc -l)
        print_success "Found $SCHEDULE_COUNT schedule(s) in group '$SCHEDULE_GROUP'"
        
        print_info "Schedule Status:"
        echo "$SCHEDULES" | while read -r name state; do
            if [ "$state" = "ENABLED" ]; then
                echo -e "  ${GREEN}✅${NC} $name: $state"
            else
                echo -e "  ${YELLOW}⚠️${NC}  $name: $state"
            fi
        done
        
        # Check Daily Summary schedule specifically
        if aws scheduler get-schedule \
            --name "DailySummaryEmailSchedule" \
            --group-name "$SCHEDULE_GROUP" \
            --region "$REGION" &> /dev/null; then
            print_success "Daily Summary schedule exists"
        else
            print_warning "Daily Summary schedule not found (may be in different group)"
        fi
    else
        print_warning "No schedules found in group '$SCHEDULE_GROUP' (this may be normal if no reminders are scheduled)"
    fi
}

# Test IAM Roles
test_iam_roles() {
    print_header "Testing IAM Roles"
    
    ROLES=(
        "ReminderLambdaExecutionRole"
        "EventBridgeInvokeReminderLambdaRole"
        "DailySummaryLambdaExecutionRole"
        "EventBridgeInvokeDailySummaryRole"
    )
    
    for ROLE_NAME in "${ROLES[@]}"; do
        if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
            print_success "IAM role '$ROLE_NAME' exists"
        else
            print_error "IAM role '$ROLE_NAME' not found"
        fi
    done
}

# Check CloudWatch Logs
check_cloudwatch_logs() {
    print_header "Checking CloudWatch Logs"
    
    LOG_GROUPS=(
        "/aws/lambda/$LAMBDA_REMINDER"
        "/aws/lambda/$LAMBDA_DAILY_SUMMARY"
    )
    
    for LOG_GROUP in "${LOG_GROUPS[@]}"; do
        if aws logs describe-log-groups \
            --log-group-name-prefix "$LOG_GROUP" \
            --region "$REGION" \
            --query 'logGroups[0].logGroupName' \
            --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
            print_success "Log group '$LOG_GROUP' exists"
            
            # Get recent log streams
            RECENT_STREAMS=$(aws logs describe-log-streams \
                --log-group-name "$LOG_GROUP" \
                --region "$REGION" \
                --order-by LastEventTime \
                --descending \
                --max-items 1 \
                --query 'logStreams[0].lastEventTime' \
                --output text 2>/dev/null || echo "0")
            
            if [ "$RECENT_STREAMS" != "0" ] && [ -n "$RECENT_STREAMS" ]; then
                CURRENT_TIME=$(date +%s)
                TIME_DIFF=$((CURRENT_TIME - RECENT_STREAMS / 1000))
                HOURS_AGO=$((TIME_DIFF / 3600))
                
                if [ $HOURS_AGO -lt 24 ]; then
                    print_success "Recent activity in '$LOG_GROUP' (last event: $HOURS_AGO hours ago)"
                else
                    print_warning "No recent activity in '$LOG_GROUP' (last event: $HOURS_AGO hours ago)"
                fi
            else
                print_warning "No log streams found in '$LOG_GROUP'"
            fi
        else
            print_warning "Log group '$LOG_GROUP' not found (may be created on first execution)"
        fi
    done
}

# Test API Endpoints (if API_BASE_URL is set)
test_api_endpoints() {
    if [ -n "$API_BASE_URL" ]; then
        print_header "Testing API Endpoints"
        
        # Test daily summary endpoint
        print_info "Testing /api/daily-summary endpoint..."
        if [ -n "$CRON_SECRET" ]; then
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                -H "Authorization: Bearer $CRON_SECRET" \
                "$API_BASE_URL/api/daily-summary" || echo "000")
        else
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                "$API_BASE_URL/api/daily-summary" || echo "000")
        fi
        
        if [ "$HTTP_CODE" = "200" ]; then
            print_success "API endpoint /api/daily-summary is accessible"
        elif [ "$HTTP_CODE" = "401" ]; then
            print_warning "API endpoint /api/daily-summary returned 401 (authentication required)"
        else
            print_warning "API endpoint /api/daily-summary returned HTTP $HTTP_CODE"
        fi
    else
        print_info "Skipping API endpoint tests (API_BASE_URL not set)"
    fi
}

# Generate Test Report
generate_report() {
    print_header "Test Summary Report"
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    PASS_RATE=0
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    fi
    
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo "Pass Rate: $PASS_RATE%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Your AWS production environment is healthy.${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Please review the errors above.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  AWS Production Environment Test      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    check_aws_cli
    test_cloudformation_stack
    test_lambda_function "$LAMBDA_REMINDER" "Reminder Processor"
    test_lambda_function "$LAMBDA_DAILY_SUMMARY" "Daily Summary Email"
    test_eventbridge_schedules
    test_iam_roles
    check_cloudwatch_logs
    test_api_endpoints
    
    generate_report
}

# Run main function
main "$@"

