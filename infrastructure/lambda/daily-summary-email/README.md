# Daily Summary Email Lambda Function

This Lambda function sends daily email summaries of job assignments to company owners via Amazon SES.

## Overview

The function runs daily at 5:00 PM MST (00:00 UTC) via EventBridge Scheduler. It:

1. Calls the `/api/daily-summary` API endpoint to get assignment data
2. Groups assignments by company
3. Generates HTML emails for each company
4. Sends emails via Amazon SES

## Prerequisites

1. **AWS CLI** installed and configured with credentials

   - Download: https://aws.amazon.com/cli/
   - Configure: `aws configure`

2. **Node.js** (version 20.x or higher)

   - Download: https://nodejs.org/

3. **AWS Permissions**: Your AWS credentials must have permission to update Lambda functions

4. **Amazon SES**:
   - The sender email address must be verified in SES
   - SES must be out of sandbox mode (or recipient emails must be verified) for production use

## Quick Deployment

### Option 1: Automatic Deployment (GitHub Actions) - Recommended

The Lambda function is automatically deployed via GitHub Actions when you push changes to this directory. See `.github/workflows/deploy-lambda.yml` for details.

**Required:** Set up GitHub Secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Option 2: Manual Deployment (PowerShell)

```powershell
.\deploy-lambda.ps1
```

### Option 3: Manual Deployment (Node.js)

```bash
node deploy-lambda.js
```

The scripts automatically:

- Install dependencies
- Create the deployment package
- Deploy to AWS Lambda
- Verify the deployment

## Environment Variables

The Lambda function requires these environment variables (set via CloudFormation):

- `API_BASE_URL` - Base URL of the Next.js API (e.g., `https://your-app.vercel.app`)
- `CRON_SECRET` - Secret token for authenticating API calls
- `SES_FROM_EMAIL` - Verified SES sender email address
- `AWS_REGION` - AWS region (defaults to `us-east-1`)

These are automatically set when you deploy the CloudFormation stack.

## Verify Deployment

After deployment, verify it worked:

```bash
# Check last modified time
aws lambda get-function \
  --function-name DailySummaryEmail \
  --region us-east-1 \
  --query 'Configuration.LastModified'

# Test the function
aws lambda invoke \
  --function-name DailySummaryEmail \
  --region us-east-1 \
  --payload '{}' \
  response.json

cat response.json
```

## Email Format

The emails include:

- Company name header
- Summary statistics (Confirmed, Pending, Declined counts)
- Three tables:
  - Confirmed Assignments (green)
  - Pending Assignments (orange)
  - Declined Assignments (red)
- Each row shows: Associate Name | Job Title | Customer | Work Date | Start Time

## Schedule

The function is scheduled to run daily at 5:00 PM MST (00:00 UTC) via EventBridge Scheduler.

**Note:** During Mountain Daylight Time (MDT, UTC-6), the email will be sent at 6:00 PM MDT.

## Troubleshooting

### "Function not found" error

The CloudFormation stack must be deployed first to create the Lambda function. Deploy the stack, then deploy the code.

### "SES email not verified" error

Verify the sender email address in Amazon SES:

1. Go to AWS Console → Amazon SES → Verified identities
2. Add and verify the email address used in `SES_FROM_EMAIL`

### "API call failed" error

Check:

1. `API_BASE_URL` is correct and the API is accessible
2. `CRON_SECRET` matches the value in your Next.js environment variables
3. The `/api/daily-summary` endpoint is working (test manually)

### No emails received

Check CloudWatch Logs:

1. Go to AWS Console → CloudWatch → Log groups
2. Find `/aws/lambda/DailySummaryEmail`
3. Check for errors in the logs

### Emails going to spam

- Ensure SES is out of sandbox mode for production
- Verify SPF and DKIM records are set up for your domain
- Use a verified domain instead of a single email address

## Testing Locally

You can test the email template generation:

```javascript
const { generateEmailHTML } = require("./emailTemplate");

const testData = {
  company_name: "Test Company",
  assignments: [
    {
      job_id: "1",
      associate_id: "1",
      work_date: "2025-01-20",
      start_time: "09:00:00",
      confirmation_status: "CONFIRMED",
      associate_first_name: "John",
      associate_last_name: "Doe",
      associate_phone: "+1234567890",
      job_title: "Construction Worker",
      customer_name: "ABC Corp",
    },
  ],
};

const html = generateEmailHTML(testData);
console.log(html);
```
