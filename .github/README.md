# GitHub Actions for Reminder System

This directory contains GitHub Actions workflows to automate your reminder system for [Staff Better](https://staff-better.vercel.app).

## 🚀 Workflows

### 1. `reminder-processor.yml` - Production Automation

- **Schedule**: Runs every 15 minutes (`*/15 * * * *`)
- **Purpose**: Automatically processes all due reminders
- **Target**: Production at https://staff-better.vercel.app
- **Manual Trigger**: Yes, via GitHub Actions UI

### 2. `test-reminders.yml` - Testing Workflow

- **Schedule**: Manual trigger only
- **Purpose**: Test reminder system manually on production
- **Options**:
  - Test all reminders
  - Test individual reminder (requires Job ID and Associate ID)

## 🔧 Setup Instructions

### 1. Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions, and add these secrets:

#### Required Secrets:

```
VERCEL_APP_URL=https://staff-better.vercel.app
CRON_SECRET=your-secure-random-string
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

#### Optional Secrets (if using these services):

```
OPENAI_API_Key=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-azure-tenant-id
```

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the "Actions" tab
3. Enable GitHub Actions if prompted

### 3. Test the Workflows

1. **Test the production workflow**:

   - Go to Actions tab → "Reminder Processor"
   - Click "Run workflow" → "Run workflow"

2. **Test the test workflow**:
   - Go to Actions tab → "Test Reminders"
   - Click "Run workflow"
   - Choose "all" to test all reminders
   - Or choose "individual" and provide Job ID and Associate ID

## 📊 How It Works

### Automatic Processing

- The `reminder-processor.yml` workflow runs every 15 minutes
- It calls your production app at https://staff-better.vercel.app/api/reminders/process
- The endpoint processes all due reminders and sends SMS messages
- Results are logged in the GitHub Actions run

### Manual Testing

- Use the `test-reminders.yml` workflow to test manually
- You can test all reminders or individual reminders
- Perfect for debugging and verification

## 📈 Monitoring

### View Results

1. Go to Actions tab in your GitHub repository
2. Click on any workflow run to see detailed logs
3. Check the "Summary" section for processed results

### Logs Include:

- Number of reminders processed
- Success/failure counts
- Error messages if any
- API response details

## 🔍 Troubleshooting

### Common Issues:

1. **401 Unauthorized**: Check your `CRON_SECRET` matches between GitHub and Vercel
2. **404 Not Found**: Verify your `VERCEL_APP_URL` is correct
3. **500 Internal Server Error**: Check your environment variables in Vercel
4. **No reminders found**: Verify you have job assignments with due dates

### Debug Steps:

1. Check GitHub Actions logs for detailed error messages
2. Verify all secrets are set correctly
3. Test your API endpoints manually using curl
4. Check Vercel function logs for server-side errors

## ⚙️ Customization

### Change Schedule

Edit the cron expression in `reminder-processor.yml`:

```yaml
schedule:
  - cron: "*/15 * * * *" # Every 15 minutes
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 9 * * *'    # Daily at 9 AM
```

### Add Notifications

You can add Slack, Discord, or email notifications on failure by modifying the workflow files.

## 🔒 Security Notes

- Never commit secrets to your repository
- Use GitHub Secrets for all sensitive data
- Regularly rotate your `CRON_SECRET`
- Monitor your Twilio usage to avoid unexpected charges

## 📞 Production URL

Your reminder system will be triggered automatically for your production app at:
**https://staff-better.vercel.app**
