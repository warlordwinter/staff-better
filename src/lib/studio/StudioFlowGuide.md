# Twilio Studio Flow Configuration Guide

This guide explains how to set up your Twilio Studio Flow to handle SMS assignment confirmations.

## Studio Flow Setup

### 1. Create a New Studio Flow

1. Go to Twilio Console > Studio > Flows
2. Click "Create new Flow"
3. Choose "Start from scratch"
4. Name it "Assignment Confirmation SMS Flow"

### 2. Flow Configuration

#### Trigger Widget

- **Widget Type**: Trigger
- **Trigger Type**: Incoming Message
- **Name**: "Incoming SMS Trigger"

#### Send Message Widget

- **Widget Type**: Send Message
- **Name**: "Confirmation Request"
- **Message Body**: "Hi {{flow.data.associate_name}}! You have an assignment on {{flow.data.work_date}} at {{flow.data.start_time}} for {{flow.data.job_title}} at {{flow.data.location}}. Reply 1 to confirm or 2 to decline."

#### Split Based On Widget

- **Widget Type**: Split Based On
- **Name**: "Route Confirmation"
- **Variable to Test**: `{{trigger.message.Body}}`
- **Conditions**:
  - If `{{trigger.message.Body}}` equals "1" → Go to "Process Confirmation" widget
  - If `{{trigger.message.Body}}` equals "2" → Go to "Process Confirmation" widget
  - Otherwise → Go to "Invalid Response" widget

#### Make HTTP Request Widget (preferred)

- **Widget Type**: Make HTTP Request
- **Name**: "Process Confirmation"
- **Method**: POST
- **Request URL**: `https://YOUR_DOMAIN/api/studio/confirm-response`
- **Content Type**: `application/json`
- **Body**:
  ```json
  {
    "confirmation_choice": "{{widgets.confirm_appt.inbound.Body | strip | downcase}}",
    "associate_id": "{{flow.data.associate_id}}",
    "job_id": "{{flow.data.job_id}}",
    "contact_channel_address": "{{trigger.message.From}}",
    "flow_sid": "{{flow.sid}}"
  }
  ```

#### Send Message Widgets for Responses

- **Widget Type**: Send Message
- **Name**: "Confirmed Response"
- **Message Body**: "Thank you for confirming your assignment. We'll see you there!"

- **Widget Type**: Send Message
- **Name**: "Declined Response"
- **Message Body**: "Thank you for letting us know. We'll update your assignment status."

- **Widget Type**: Send Message
- **Name**: "Invalid Response"
- **Message Body**: "I didn't understand that response. Please reply 1 to confirm or 2 to decline."

### 3. Flow Variables

Set these variables in your Studio Flow:

- `job_id`: The job ID for the assignment
- `associate_id`: The associate's ID
- `associate_name`: The associate's name
- `job_title`: The job title
- `work_date`: The work date
- `start_time`: The start time
- `location`: The work location

### 4. Connecting to Your Application

#### From Your Application

To initiate a confirmation SMS, make an API call to your application:

```javascript
// Call your application's API endpoint
const response = await fetch("/api/studio/initiate-confirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    associateId: "associate456",
    jobId: "job123",
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

#### Environment Variables

In your Twilio Function, set:

- `YOUR_API_DOMAIN`: Your application's domain (e.g., `yourapp.com`)

### 5. Testing

1. Deploy your Studio Function
2. Test the flow by sending an SMS to your Twilio number
3. Check your application logs to verify the API calls are working
4. Verify the database is being updated correctly

### 6. Error Handling

The flow includes error handling for:

- Invalid user input
- API connection failures
- Missing required data
- Network timeouts

### 7. Flow Diagram

```
Incoming SMS → Send Confirmation Request → Wait for Response → Split Based On
                                                                      ↓
                                                              ┌─────────────────┐
                                                              │  Route Choice   │
                                                              └─────────────────┘
                                                                      ↓
                                                              ┌─────────────────┐
                                                              │ Process Confirmation │
                                                              │ (Run Function)  │
                                                              └─────────────────┘
                                                                      ↓
                                                              ┌─────────────────┐
                                                              │  Response       │
                                                              │  (Send Message) │
                                                              └─────────────────┘
```

## Next Steps

1. Deploy the Studio Function to Twilio
2. Create the Studio Flow using the configuration above
3. Update your application to initiate Studio Flows instead of sending SMS
4. Test the complete flow end-to-end
