# EventBridge Reminder System - Setup Checklist

## ✅ Completed Steps

- [x] CloudFormation stack deployed
- [x] IAM user created with EventBridge permissions

## 🔄 Next Steps

### 1. Get AWS Credentials from IAM User

1. Go to AWS Console → IAM → Users
2. Click on your user
3. Go to "Security credentials" tab
4. Scroll to "Access keys" section
5. Click "Create access key"
6. Choose "Application running outside AWS" (for Next.js app)
7. Copy both:
   - **Access key ID**
   - **Secret access key** (only shown once - save it!)

### 2. Add Environment Variables to Your App

Create or update `.env.local` in your project root:

```bash
# EventBridge Configuration (from CloudFormation outputs)
EVENTBRIDGE_LAMBDA_ARN=arn:aws:lambda:us-east-1:787386855542:function:ReminderProcessor
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::787386855542:role/EventBridgeInvokeReminderLambdaRole
EVENTBRIDGE_SCHEDULE_GROUP=default

# AWS Configuration (from IAM user credentials)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=paste-your-access-key-id-here
AWS_SECRET_ACCESS_KEY=paste-your-secret-access-key-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-master-account-sid
TWILIO_AUTH_TOKEN=your-master-auth-token
TWILIO_PHONE_NUMBER_REMINDERS=+15555555555
TWILIO_SUBACCOUNT_ENCRYPTION_KEY=base64-or-hex-encoded-32-byte-key
```

### 3. Deploy Lambda Function Code

The CloudFormation stack created the Lambda function with placeholder code. You need to deploy the actual code:

**Option 1: Automatic Deployment via GitHub Actions (Recommended)**

If you're using GitHub, the Lambda function will automatically deploy when you push changes to `infrastructure/lambda/reminder-processor/`.

**Setup:**

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID` - Your AWS access key
   - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
3. Push changes to the Lambda code - deployment happens automatically!

See `.github/workflows/deploy-lambda.yml` for details.

**Option 2: Manual Deployment using PowerShell Script (Windows)**

```powershell
cd infrastructure/lambda/reminder-processor
.\deploy-lambda.ps1
```

**Verification:**

After deployment, verify the code was deployed:

```bash
aws lambda get-function --function-name ReminderProcessor --region us-east-1 --query 'Configuration.LastModified'
```

You should see a recent timestamp. You can also check the function code in the AWS Console to confirm it's not the placeholder.

### 4. Run Database Migration

Apply the migration to create the `reminder_schedules` table:

**Option A: Using Supabase CLI**

```bash
supabase migration up
```

**Option B: Using Supabase Dashboard**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250101000000_create_reminder_schedules_table.sql`
3. Paste and run

### 5. Restart Your Next.js App

After adding environment variables:

```bash
# Stop your dev server (Ctrl+C)
# Then restart
npm run dev
```

### 6. Test the System

1. **Create a test job assignment** with:

   - `work_date`: A future date (e.g., tomorrow)
   - `start_time`: A time (e.g., "09:00:00")
   - `num_reminders`: 2

2. **Check if schedules were created**:

   - Query `reminder_schedules` table in Supabase
   - Should see 2 rows (DAY_BEFORE and TWO_HOURS_BEFORE)

3. **Check EventBridge Scheduler**:

   - AWS Console → EventBridge → Schedules
   - Should see schedules with names like `reminder-{jobId}-...`

4. **Test Lambda manually** (optional):
   ```bash
   aws lambda invoke \
     --function-name ReminderProcessor \
     --payload '{"job_id":"test-id","work_date":"2025-01-20","start_time":"09:00:00","reminder_type":"DAY_BEFORE"}' \
     response.json
   cat response.json
   ```

## 🎯 Verification Checklist

- [ ] `.env.local` file created with all variables
- [ ] Lambda function code deployed (not just placeholder)
- [ ] Database migration applied (`reminder_schedules` table exists)
- [ ] Next.js app restarted with new environment variables
- [ ] Test assignment created successfully
- [ ] Schedules appear in `reminder_schedules` table
- [ ] Schedules visible in EventBridge Scheduler console

## 🐛 Troubleshooting

**Schedules not being created?**

- Check CloudWatch Logs for Lambda function
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure IAM user has correct permissions

**Lambda not working?**

- Verify Lambda code is deployed (not placeholder)
- Check Lambda environment variables in AWS Console
- Check CloudWatch Logs for errors
