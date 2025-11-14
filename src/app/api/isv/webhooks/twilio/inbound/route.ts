// Webhook endpoint for inbound Twilio messages
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { ISVMessageDao } from '@/lib/isv/dao/ISVMessageDao';
import { ISVNumberDao } from '@/lib/isv/dao/ISVNumberDao';
import { OptOutDao } from '@/lib/isv/dao/OptOutDao';
import { WebhookEventDao } from '@/lib/isv/dao/WebhookEventDao';

const MessagingResponse = twilio.twiml.MessagingResponse;

/**
 * POST /api/isv/webhooks/twilio/inbound
 * Handle inbound messages from Twilio
 */
export async function POST(request: NextRequest) {
  const messageDao = new ISVMessageDao();
  const numberDao = new ISVNumberDao();
  const optOutDao = new OptOutDao();
  const webhookDao = new WebhookEventDao();

  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    // Store webhook event
    await webhookDao.create({
      event_type: 'inbound_message',
      event_payload: {
        From: from,
        To: to,
        Body: body,
        MessageSid: messageSid,
      },
    });

    // Find customer by phone number
    const number = await numberDao.findByPhoneNumber(to);
    if (!number) {
      console.warn(`No customer found for number: ${to}`);
      const response = new MessagingResponse();
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Check for opt-out keywords
    const normalizedBody = body?.toUpperCase().trim();
    if (normalizedBody === 'STOP' || normalizedBody === 'STOPALL' || normalizedBody === 'UNSUBSCRIBE') {
      await optOutDao.create({
        customer_id: number.customer_id,
        phone_number: from,
        opt_out_type: 'SMS',
        opt_out_method: 'STOP',
      });

      const response = new MessagingResponse();
      response.message('You have been unsubscribed. You will no longer receive messages.');
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Check opt-in keywords
    if (normalizedBody === 'START' || normalizedBody === 'YES' || normalizedBody === 'UNSTOP') {
      await optOutDao.remove(number.customer_id, from, 'SMS');
      
      const response = new MessagingResponse();
      response.message('You have been resubscribed. You will receive messages again.');
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Check if sender is opted out
    const isOptedOut = await optOutDao.isOptedOut(number.customer_id, from);
    if (isOptedOut) {
      const response = new MessagingResponse();
      // Don't send a response to opted-out users
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Store inbound message
    await messageDao.create({
      customer_id: number.customer_id,
      direction: 'inbound',
      to_number: to,
      from_number: from,
      body: body || '',
      status: 'received',
      twilio_sid: messageSid,
    });

    // Return empty TwiML (no auto-response)
    const response = new MessagingResponse();
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing inbound webhook:', error);
    
    // Always return valid TwiML to avoid Twilio retries
    const response = new MessagingResponse();
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

