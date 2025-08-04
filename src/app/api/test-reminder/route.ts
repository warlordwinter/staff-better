import { NextRequest, NextResponse } from 'next/server';
import { ReminderService } from '@/lib/services/reminderService';

export async function POST(request: NextRequest) {
  try {
    const { jobId, associateId } = await request.json();
    
    const reminderService = new ReminderService();
    const result = await reminderService.sendTestReminder(jobId, associateId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Reminder test error:', error);
    return NextResponse.json(
      { error: 'Failed to send test reminder' },
      { status: 500 }
    );
  }
}