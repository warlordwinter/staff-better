#!/usr/bin/env bash
set -euo pipefail

# Auto-load env files if present (.env then .env.local)
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

# Required environment variables:
#  - TWILIO_ACCOUNT_SID (e.g., ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
#  - TWILIO_AUTH_TOKEN
#  - FLOW_SID (e.g., FWa1680e7223433b43a2a49fb990b491ea)
#  - FROM_NUMBER (Twilio number in E.164, e.g., +15551234567)
#  - TO_PHONE_NUMBER (destination number in E.164)

: "${TWILIO_ACCOUNT_SID:?Set TWILIO_ACCOUNT_SID}"
: "${TWILIO_AUTH_TOKEN:?Set TWILIO_AUTH_TOKEN}"
: "${FLOW_SID:?Set FLOW_SID}"
: "${FROM_NUMBER:?Set FROM_NUMBER}"
: "${TO_PHONE_NUMBER:?Set TO_PHONE_NUMBER}"

# Optional CLI overrides (fallback to sensible demo values)
ASSOCIATE_ID="${ASSOCIATE_ID:-demo-associate-123}"
JOB_ID="${JOB_ID:-demo-job-456}"
ASSOCIATE_NAME="${ASSOCIATE_NAME:-John Doe}"
JOB_TITLE="${JOB_TITLE:-Event Setup}"
WORK_DATE="${WORK_DATE:-2024-01-15}"
START_TIME="${START_TIME:-09:00}"
LOCATION="${LOCATION:-Convention Center}"

# Build JSON Parameters expected by the Studio Flow
# Per src/lib/studio/StudioFlowGuide.md → flow.data fields
PARAMS=$(jq -cn --arg associate_id "$ASSOCIATE_ID" \
              --arg job_id "$JOB_ID" \
              --arg associate_name "$ASSOCIATE_NAME" \
              --arg job_title "$JOB_TITLE" \
              --arg work_date "$WORK_DATE" \
              --arg start_time "$START_TIME" \
              --arg location "$LOCATION" \
              '{associate_id:$associate_id, job_id:$job_id, associate_name:$associate_name, job_title:$job_title, work_date:$work_date, start_time:$start_time, location:$location}')

# Fallback if jq is not installed: minimal escapings via python if available
if ! command -v jq >/dev/null 2>&1; then
  if command -v python >/dev/null 2>&1; then
    PARAMS=$(python - <<PY
import json, os
print(json.dumps({
  'associate_id': os.environ.get('ASSOCIATE_ID','demo-associate-123'),
  'job_id': os.environ.get('JOB_ID','demo-job-456'),
  'associate_name': os.environ.get('ASSOCIATE_NAME','John Doe'),
  'job_title': os.environ.get('JOB_TITLE','Event Setup'),
  'work_date': os.environ.get('WORK_DATE','2024-01-15'),
  'start_time': os.environ.get('START_TIME','09:00'),
  'location': os.environ.get('LOCATION','Convention Center'),
}))
PY
)
  else
    echo "Error: Neither jq nor python is available to build JSON Parameters." >&2
    exit 1
  fi
fi

curl -sS -X POST "https://studio.twilio.com/v2/Flows/${FLOW_SID}/Executions" \
  -d "To=${TO_PHONE_NUMBER}" \
  -d "From=${FROM_NUMBER}" \
  --data-urlencode "Parameters=${PARAMS}" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
echo