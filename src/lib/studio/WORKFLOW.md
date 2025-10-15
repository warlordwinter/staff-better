# SMS Confirmation Workflow

This document explains the complete workflow for the new SMS-based confirmation system.

## Workflow Overview

```
1. Cron Job (every 15 minutes)
   ↓
2. Reminder Service checks for due reminders
   ↓
3. Studio Service sends SMS via Twilio Studio
   ↓
4. Associate receives SMS with confirmation request
   ↓
5. Associate replies with YES/NO
   ↓
6. Studio Function processes response
   ↓
7. Database updated with confirmation status
```

## Detailed Steps

### 1. Cron Job Trigger (Every 15 Minutes)

Your existing cron job runs and calls the reminder service to check for due reminders.

### 2. Reminder Processing

The reminder service identifies assignments that need confirmation reminders and calls:

```javascript
// Your cron job calls this endpoint
POST /api/studio/send-confirmations
{
  "assignments": [
    {
      "associate_id": "123",
      "job_id": "456",
      "phone_number": "+1234567890",
      "first_name": "John",
      "job_title": "Event Setup",
      "work_date": "2024-01-15",
      "start_time": "09:00",
      "location": "Convention Center"
    }
  ]
}
```

### 3. SMS Sending

The system:

- Processes assignments in batches (default 10, max 50)
- Calls Twilio Studio to initiate SMS flows
- Sends structured SMS messages to associates
- Includes rate limiting between batches

### 4. Associate Receives SMS

Associate receives an SMS like:

```
Hi John! You have an assignment on 2024-01-15 at 09:00 for Event Setup at Convention Center. Reply 1 to confirm or 2 to decline.
```

### 5. Associate Responds

Associate replies with:

- "1" → Confirmed
- "2" → Declined
- Anything else → Invalid response (gets clarification message)

### 6. Studio Function Processing

Twilio Studio Function:

- Receives the SMS response
- Parses the confirmation choice
- Calls your API endpoint with structured data

### 7. Database Update

Your API endpoint:

- Validates the confirmation data
- Updates the job assignment status in the database
- Logs the confirmation result

## API Endpoints

### Batch Confirmation SMS

```
POST /api/studio/send-confirmations
```

Used by your cron job to send multiple confirmation SMS.

### Single Confirmation SMS

```
POST /api/studio/initiate-confirmation
```

Used for individual confirmation SMS.

### Confirmation Result Processing

```
POST /api/studio/confirm-assignment
```

Called by Twilio Studio Function when associate responds.

## Environment Variables Required

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_STUDIO_FLOW_SID=your_flow_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Integration with Existing System

This system integrates seamlessly with your existing reminder system:

1. **No changes to cron job** - Just call the new batch endpoint
2. **No changes to database** - Uses existing assignment tables
3. **No changes to reminder logic** - Works with existing ReminderAssignment objects
4. **Enhanced confirmation** - Better SMS experience through Studio

## Benefits

1. **Professional SMS Experience** - Branded, structured messages
2. **Reliable Processing** - Structured responses instead of text parsing
3. **Batch Processing** - Efficient handling of multiple confirmations
4. **Rate Limiting** - Respects Twilio limits automatically
5. **Error Handling** - Comprehensive error handling and logging
6. **Easy Integration** - Minimal changes to existing system

## Testing the Workflow

1. **Test Studio Function**: Deploy and test in Twilio Console
2. **Test API Endpoints**: Use Postman or your application
3. **Test Complete Flow**: Send test SMS and verify database updates
4. **Test Cron Integration**: Call batch endpoint with test data
5. **Monitor Logs**: Check application and Twilio logs for issues

## Troubleshooting

- **SMS not sending**: Check Twilio credentials and phone numbers
- **Responses not processing**: Verify Studio Function and API endpoint
- **Database not updating**: Check API logs and database connection
- **Cron job issues**: Verify batch endpoint and assignment data format
