# Testing the Studio SMS Confirmation System

This guide helps you test the complete SMS confirmation workflow.

## Prerequisites

1. **Twilio Studio Flow** - Created and published
2. **Studio Function** - Deployed to Twilio Functions
3. **Environment Variables** - Set in your application
4. **Database** - Accessible and working

## Test Endpoints

### 1. Test Single Confirmation SMS

```bash
curl -X POST http://localhost:3000/api/studio/test-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "associateName": "John Doe",
    "jobTitle": "Event Setup",
    "workDate": "2024-01-15",
    "startTime": "09:00",
    "location": "Convention Center"
  }'
```

### 2. Test Batch Confirmation SMS

```bash
curl -X POST http://localhost:3000/api/studio/send-confirmations \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      {
        "associate_id": "test-123",
        "job_id": "test-456",
        "phone_number": "+1234567890",
        "first_name": "John Doe",
        "job_title": "Event Setup",
        "work_date": "2024-01-15",
        "start_time": "09:00",
        "location": "Convention Center"
      }
    ]
  }'
```

### 3. Test Confirmation Response Processing (Studio → HTTP Request)

```bash
curl -X POST http://localhost:3000/api/studio/confirm-response \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_choice": "1",
    "associate_id": "test-123",
    "job_id": "test-456",
    "contact_channel_address": "+1234567890",
    "flow_sid": "FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

## Testing Workflow

### Step 1: Test SMS Sending

1. Call the test endpoint with your phone number
2. Check your phone for the SMS message
3. Verify the message format and content
4. Check application logs for execution SID

### Step 2: Test SMS Response

1. Reply to the SMS with "1" (confirm)
2. Check your application logs for the Studio Function call
3. Verify the database was updated
4. Check for the confirmation response SMS

### Step 3: Test Invalid Response

1. Reply to the SMS with "invalid" or "maybe"
2. Verify you get the clarification message
3. Reply with "1" or "2" to test the flow

### Step 4: Test Decline Response

1. Send a new test SMS
2. Reply with "2" (decline)
3. Verify the database shows "Declined" status
4. Check for the decline confirmation SMS

## Expected SMS Messages

### Initial Confirmation Request

```
Hi John! You have an assignment on 2024-01-15 at 09:00 for Event Setup at Convention Center. Reply 1 to confirm or 2 to decline.
```

### Confirmation Response (Reply "1")

```
Thank you for confirming your assignment. We'll see you there!
```

### Decline Response (Reply "2")

```
Thank you for letting us know. We'll update your assignment status.
```

### Invalid Response (Reply anything else)

```
I didn't understand that response. Please reply 1 to confirm or 2 to decline.
```

## Troubleshooting

### SMS Not Sending

- Check Twilio credentials in environment variables
- Verify Studio Flow is published
- Check phone number format (+1234567890)
- Review Twilio Console logs

### Responses Not Processing

- Verify Studio Function is deployed
- Check function environment variables
- Review function logs in Twilio Console
- Verify API endpoint is accessible

### Database Not Updating

- Check API endpoint logs
- Verify database connection
- Review assignment repository
- Check confirmation status values

### Studio Flow Issues

- Verify flow is published
- Check flow configuration
- Review flow execution logs
- Test flow with Twilio Console

## Monitoring

### Application Logs

- Check console output for execution SIDs
- Review error messages
- Monitor API response times

### Twilio Console

- Studio Flow executions
- Function logs
- SMS delivery status
- Error rates

### Database

- Check assignment status updates
- Verify confirmation timestamps
- Review associate records

## Success Criteria

✅ **SMS Sending**: Test SMS received with correct format
✅ **Response Processing**: "1" and "2" responses processed correctly
✅ **Database Updates**: Confirmation status updated in database
✅ **Error Handling**: Invalid responses get clarification message
✅ **Batch Processing**: Multiple assignments processed successfully
✅ **Rate Limiting**: No Twilio rate limit errors
✅ **Logging**: All actions properly logged

## Next Steps

1. **Deploy to Production**: Set up production environment variables
2. **Monitor Performance**: Watch for rate limits and errors
3. **Scale Testing**: Test with larger batches
4. **User Feedback**: Gather feedback on SMS experience
5. **Optimization**: Fine-tune based on usage patterns
