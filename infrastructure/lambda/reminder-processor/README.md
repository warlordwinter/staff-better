# Lambda Function Deployment Guide

This directory contains the Lambda function code for processing reminders and sending SMS via Twilio.

## Prerequisites

1. **AWS CLI** installed and configured with credentials

   - Download: https://aws.amazon.com/cli/
   - Configure: `aws configure`

2. **Node.js** (version 20.x or higher)

   - Download: https://nodejs.org/

3. **AWS Permissions**: Your AWS credentials must have permission to update Lambda functions

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

The script automatically:

- Installs dependencies
- Creates the deployment package
- Deploys to AWS Lambda
- Verifies the deployment

## Verify Deployment

After deployment, verify it worked:

```bash
# Check last modified time
aws lambda get-function \
  --function-name ReminderProcessor \
  --region us-east-1 \
  --query 'Configuration.LastModified'

# Test the function
aws lambda invoke \
  --function-name ReminderProcessor \
  --region us-east-1 \
  --payload '{"job_id":"test","work_date":"2025-01-20","start_time":"09:00:00","reminder_type":"DAY_BEFORE"}' \
  response.json

cat response.json
```

## Environment Variables

The Lambda function requires these environment variables (set via CloudFormation):

- `TWILIO_SID` - Twilio Account SID
- `TWILIO_AUTH` - Twilio Auth Token
- `TWILIO_DEFAULT_FROM` - Twilio phone number
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

These are automatically set when you deploy the CloudFormation stack.

## Troubleshooting

### "Function not found" error

- Make sure the CloudFormation stack is deployed first
- Verify the function name is `ReminderProcessor`
- Check the AWS region (should be `us-east-1`)

### "Access denied" error

- Verify your AWS credentials have `lambda:UpdateFunctionCode` permission
- Check that you're using the correct AWS account/region

### Package too large

- Remove `node_modules` and use Lambda Layers instead
- Or use container images (supports up to 10 GB)

### Function not working after deployment

- Check CloudWatch Logs: `/aws/lambda/ReminderProcessor`
- Verify environment variables are set correctly
- Test the function manually using the invoke command above

## File Structure

```
reminder-processor/
├── index.js              # Lambda handler code
├── package.json          # Dependencies and scripts
├── deploy-lambda.ps1    # PowerShell deployment script (Windows)
└── README.md            # This file
```

## Updating the Function

After making changes to `index.js`:

1. **If using GitHub:** Just commit and push - deployment happens automatically!
2. **If deploying manually:** Run `.\deploy-lambda.ps1`
3. Verify the deployment
4. Test with a real event
