# Twilio Studio SMS Confirmation System

This directory contains the new Twilio Studio-based SMS confirmation system that integrates with your existing reminder system.

## Overview

The new system uses Twilio Studio to send SMS messages to associates for confirmations and process their text responses. This integrates with your existing cron job reminder system to provide a seamless confirmation workflow.

## Architecture

```
Cron Job (15 min) → Reminder Service → Studio Service → Twilio Studio Flow → SMS to Associate
                                                                                    ↓
Associate SMS Response → Studio Function → Your API → Database Update
```

## Components

### 1. API Endpoints

- **`/api/studio/initiate-confirmation`** - Initiates a single confirmation SMS
- **`/api/studio/send-confirmations`** - Batch endpoint for cron job integration
- **`/api/studio/confirm-assignment`** - Receives confirmation results from Studio

### 2. Services

- **`StudioService`** - Handles communication with Twilio Studio
- **`StudioReminderService`** - Integrates with existing reminder system
- **`ServiceContainer`** - Updated to include Studio services

### 3. Studio Components

- **`ConfirmationStudioFunction.js`** - Twilio Function to call your API
- **`StudioFlowGuide.md`** - Complete setup guide for Studio Flow

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_STUDIO_FLOW_SID=your_flow_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 2. Deploy Twilio Function

1. Go to Twilio Console > Functions and Assets > Functions
2. Create a new function named "confirmation-function"
3. Copy the code from `ConfirmationStudioFunction.js`
4. Set the environment variable `YOUR_API_DOMAIN` to your application's domain
5. Deploy the function

### 3. Create Studio Flow

Follow the detailed guide in `StudioFlowGuide.md` to create your Studio Flow.

### 4. Install Twilio SDK

```bash
npm install twilio
```

## Usage

### Cron Job Integration

Your existing cron job can now call the batch endpoint to send confirmation SMS:

```javascript
// From your cron job or reminder service
const response = await fetch("/api/studio/send-confirmations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    assignments: [
      {
        associate_id: "associate123",
        job_id: "job456",
        phone_number: "+1234567890",
        first_name: "John Doe",
        job_title: "Event Setup",
        work_date: "2024-01-15",
        start_time: "09:00",
        location: "Convention Center",
      },
      // ... more assignments
    ],
    batchSize: 10, // Optional, defaults to 10
  }),
});

const result = await response.json();
console.log("SMS batch processed:", result.summary);
```

### Single Confirmation SMS

```javascript
// For individual confirmations
const response = await fetch("/api/studio/initiate-confirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    associateId: "associate123",
    jobId: "job456",
    phoneNumber: "+1234567890",
    associateName: "John Doe",
    jobTitle: "Event Setup",
    workDate: "2024-01-15",
    startTime: "09:00",
    location: "Convention Center",
  }),
});

const result = await response.json();
console.log("SMS initiated:", result.data.executionSid);
```

### Receiving Confirmation Results

The Studio Function automatically calls your `/api/studio/confirm-assignment` endpoint with the results.

## Benefits Over Previous System

1. **More Reliable** - SMS through Studio with structured responses
2. **Professional** - Clean, branded SMS experience
3. **Structured Data** - Clean, structured responses instead of parsing text
4. **Better UX** - Guided interaction with clear options
5. **Cron Integration** - Seamlessly integrates with your existing reminder system
6. **Batch Processing** - Efficient handling of multiple confirmations

## Migration from SMS

The old SMS system has been completely removed:

- ❌ `/api/twilio/webhook` - SMS webhook endpoint
- ❌ `IncomingMessageService` - SMS message processing
- ❌ `ConfirmationHandler` - SMS confirmation handler
- ❌ `HelpHandler` - SMS help handler
- ❌ `OptOutHandler` - SMS opt-out handler

## Testing

1. **Test Studio Function**: Use Twilio Console to test the function
2. **Test API Endpoints**: Use your application or Postman
3. **Test Complete Flow**: Send a test SMS to your Twilio number
4. **Test Cron Integration**: Call the batch endpoint with test data
5. **Verify Database**: Check that confirmations are properly recorded

## Troubleshooting

### Common Issues

1. **Function not calling API**: Check environment variables and API domain
2. **Studio Flow not working**: Verify flow configuration and function URL
3. **Database not updating**: Check API endpoint logs and database connection
4. **SMS not sending**: Verify phone numbers and Twilio account settings
5. **Cron job not working**: Check batch endpoint logs and assignment data format

### Debugging

- Check Twilio Console logs for Studio executions
- Check your application logs for API calls
- Use Twilio's debugger for function issues
- Verify environment variables are set correctly

## Next Steps

1. Deploy the Studio Function
2. Create the Studio Flow
3. Test the complete system
4. Update your application to use the new confirmation system
5. Remove any remaining SMS-related code
