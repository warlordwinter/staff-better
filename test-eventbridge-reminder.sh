#!/bin/bash

# Simple script to create an EventBridge schedule that triggers ReminderProcessor Lambda
# Usage: ./test-eventbridge-reminder.sh [job_id] [work_date] [start_time] [reminder_type]

# Configuration - Update these if needed
LAMBDA_ARN="${EVENTBRIDGE_LAMBDA_ARN:-arn:aws:lambda:us-east-1:787386855542:function:ReminderProcessor}"
ROLE_ARN="${EVENTBRIDGE_ROLE_ARN:-arn:aws:iam::787386855542:role/EventBridgeInvokeReminderLambdaRole}"
SCHEDULE_GROUP="${EVENTBRIDGE_SCHEDULE_GROUP:-default}"
REGION="${AWS_REGION:-us-east-1}"

# Parameters
JOB_ID="${1:-test-job-$(date +%s)}"
WORK_DATE="${2:-$(date -u +%Y-%m-%d)}"
START_TIME="${3:-09:00:00}"
REMINDER_TYPE="${4:-DAY_BEFORE}"

# Generate unique schedule name
SCHEDULE_NAME="test-reminder-$(date +%s)"

# Schedule for 2 minutes from now
SCHEDULE_TIME=$(date -u -d "+2 minutes" +"%Y-%m-%dT%H:%M:%S")

# Create payload JSON
PAYLOAD_JSON=$(jq -n -c \
  --arg job_id "${JOB_ID}" \
  --arg work_date "${WORK_DATE}" \
  --arg start_time "${START_TIME}" \
  --arg reminder_type "${REMINDER_TYPE}" \
  '{job_id: $job_id, work_date: $work_date, start_time: $start_time, reminder_type: $reminder_type}')

echo "🚀 Creating EventBridge schedule..."
echo "   Job ID: ${JOB_ID}"
echo "   Work Date: ${WORK_DATE}"
echo "   Start Time: ${START_TIME}"
echo "   Reminder Type: ${REMINDER_TYPE}"
echo "   Will trigger at: ${SCHEDULE_TIME} UTC"
echo ""

# Create schedule using JSON file to avoid escaping issues
SCHEDULE_FILE=$(mktemp)
jq -n \
  --arg name "${SCHEDULE_NAME}" \
  --arg group "${SCHEDULE_GROUP}" \
  --arg expression "at(${SCHEDULE_TIME})" \
  --arg arn "${LAMBDA_ARN}" \
  --arg role_arn "${ROLE_ARN}" \
  --argjson input "${PAYLOAD_JSON}" \
  '{
    Name: $name,
    GroupName: $group,
    ScheduleExpression: $expression,
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: $arn,
      RoleArn: $role_arn,
      Input: ($input | tojson)
    }
  }' > "${SCHEDULE_FILE}"

aws scheduler create-schedule \
    --cli-input-json "file://${SCHEDULE_FILE}" \
    --region "${REGION}" \
    --output json > /dev/null

# Clean up
rm -f "${SCHEDULE_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Schedule created successfully!"
    echo ""
    echo "⏰ Waiting 2 minutes for Lambda to trigger..."
    sleep 120
    echo ""
    echo "🔍 Recent Lambda logs:"
    aws logs tail /aws/lambda/ReminderProcessor --since 3m --region "${REGION}" --format short 2>/dev/null || echo "   (No logs found yet)"
    echo ""
    echo "🗑️  To delete this schedule:"
    echo "   aws scheduler delete-schedule --name ${SCHEDULE_NAME} --group-name ${SCHEDULE_GROUP} --region ${REGION}"
else
    echo "❌ Failed to create schedule"
    exit 1
fi
