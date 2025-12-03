# Environment Variables Setup Guide

## Where to Use CloudFormation Stack Outputs

The CloudFormation stack outputs need to be added to your **Next.js application's environment variables**. Here's where to set them:

### For Local Development

Create a `.env.local` file in the root of your project with these values:

```bash
# EventBridge Configuration (from CloudFormation outputs)
EVENTBRIDGE_LAMBDA_ARN=arn:aws:lambda:us-east-1:787386855542:function:ReminderProcessor
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::787386855542:role/EventBridgeInvokeReminderLambdaRole
EVENTBRIDGE_SCHEDULE_GROUP=default

# AWS Configuration (for creating schedules)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-master-account-sid
TWILIO_AUTH_TOKEN=your-master-auth-token
TWILIO_PHONE_NUMBER_REMINDERS=+15555555555
TWILIO_SUBACCOUNT_ENCRYPTION_KEY=base64-or-hex-encoded-32-byte-key
```

### For Production (Vercel/Other Platforms)

Add these environment variables in your hosting platform's dashboard:

**Vercel:**

1. Go to your project → Settings → Environment Variables
2. Add each variable:
   - `EVENTBRIDGE_LAMBDA_ARN` = `arn:aws:lambda:us-east-1:787386855542:function:ReminderProcessor`
   - `EVENTBRIDGE_ROLE_ARN` = `arn:aws:iam::787386855542:role/EventBridgeInvokeReminderLambdaRole`
   - `EVENTBRIDGE_SCHEDULE_GROUP` = `default`
   - `AWS_REGION` = `us-east-1`
   - `AWS_ACCESS_KEY_ID` = (your AWS access key)
   - `AWS_SECRET_ACCESS_KEY` = (your AWS secret key)

**Other Platforms:**

- Add the same variables in your platform's environment variable settings

## What Each Variable Does

- **EVENTBRIDGE_LAMBDA_ARN**: Used by `EventBridgeScheduleService` to know which Lambda function to trigger
- **EVENTBRIDGE_ROLE_ARN**: IAM role that EventBridge uses to invoke the Lambda function
- **EVENTBRIDGE_SCHEDULE_GROUP**: Optional, defaults to "default" - the EventBridge schedule group name
- **AWS_REGION**: AWS region where your resources are deployed
- **AWS_ACCESS_KEY_ID** / **AWS_SECRET_ACCESS_KEY**: AWS credentials for creating EventBridge schedules from your app
- **TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN**: Master Twilio credentials used to provision child accounts and send SMS
- **TWILIO_PHONE_NUMBER_REMINDERS**: Default phone number for reminder messages
- **TWILIO_SUBACCOUNT_ENCRYPTION_KEY**: 32-byte key (64-char hex or base64) used to encrypt newly created subaccount auth tokens before storing them

## Where These Are Used in Code

- `src/lib/services/eventbridgeScheduleService.ts` - Uses these to create/update/delete EventBridge schedules
- The service is called automatically when:
  - Creating a new job assignment (`insertSingleJobAssignment`)
  - Updating a job assignment's work_date or start_time (`updateJobAssignment`)
  - Deleting a job assignment (`deleteJobAssignment`)
- `src/lib/twilio/client.ts` and `src/lib/twilio/subaccounts.ts` - Use the Twilio variables to send SMS and provision encrypted child accounts for each company signup

## Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Restart your dev server** after adding environment variables
3. **The Lambda function** gets its environment variables from CloudFormation (already set), so you don't need to configure those separately
