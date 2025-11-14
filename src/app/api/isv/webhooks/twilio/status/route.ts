// Webhook endpoint for Twilio message status callbacks
import { NextRequest, NextResponse } from 'next/server';
import { ISVMessageDao } from '@/lib/isv/dao/ISVMessageDao';
import { WebhookEventDao } from '@/lib/isv/dao/WebhookEventDao';

/**
 * POST /api/isv/webhooks/twilio/status
 * Handle message status callbacks from Twilio
 */
export async function POST(request: NextRequest) {
  const messageDao = new ISVMessageDao();
  const webhookDao = new WebhookEventDao();

  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;

    // Store webhook event
    await webhookDao.create({
      event_type: 'status_callback',
      event_payload: {
        MessageSid: messageSid,
        MessageStatus: messageStatus,
        ErrorCode: errorCode,
        ErrorMessage: errorMessage,
      },
    });

    // Update message status
    if (messageSid) {
      await messageDao.updateByTwilioSid(messageSid, {
        status: messageStatus,
        error_code: errorCode || undefined,
        error_message: errorMessage || undefined,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing status callback:', error);
    return NextResponse.json(
      { error: 'Failed to process status callback' },
      { status: 500 }
    );
  }
}

