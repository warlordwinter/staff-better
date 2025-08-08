// app/api/reminders/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ReminderService } from '@/lib/services/reminderService';

export async function POST(request: NextRequest) {
  try {
    const { jobId, associateId } = await request.json();

    if (!jobId || !associateId) {
      return NextResponse.json(
        { error: 'jobId and associateId are required' },
        { status: 400 }
      );
    }

    const reminderService = new ReminderService();
    const result = await reminderService.sendTestReminder(jobId, associateId);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Test reminder error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Create test data endpoint
export async function PUT(request: NextRequest) {
  try {
    const { phone_number } = await request.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: 'phone_number is required' },
        { status: 400 }
      );
    }

    // This would create test data in your database
    // You'll need to implement this based on your DAO layer
    const testData = await createTestJobAssignment(phone_number);

    return NextResponse.json({
      success: true,
      message: 'Test data created',
      data: testData
    });

  } catch (error) {
    console.error('Create test data error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to create test data
async function createTestJobAssignment(phoneNumber: string) {
  // You'll need to implement this with your Supabase client
  // This is pseudocode showing what data you'd need
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const testJob = {
    id: 'test-job-id',
    job_title: 'Test Cleaning Job',
    customer_name: 'Test Customer',
    job_status: 'Upcoming' as const,
    start_date: tomorrow
  };

  const testAssociate = {
    id: 'test-associate-id',
    first_name: 'Test',
    last_name: 'User',
    work_date: tomorrow,
    start_time: '09:00',
    phone_number: phoneNumber,
    email_address: 'test@example.com'
  };

  const testAssignment = {
    job_id: testJob.id,
    associate_id: testAssociate.id,
    confirmation_status: 'Pending' as const,
    last_confirmation_time: null,
    work_date: tomorrow,
    start_time: '09:00',
    num_reminders: 3
  };

  // Insert into your database here
  // await supabase.from('Jobs').insert(testJob);
  // await supabase.from('Associates').insert(testAssociate);
  // await supabase.from('JobAssignments').insert(testAssignment);

  return {
    job: testJob,
    associate: testAssociate,
    assignment: testAssignment
  };
}