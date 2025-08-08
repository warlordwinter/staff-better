import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Check if user has completed setup
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has completed setup by looking at user metadata
    const hasCompletedSetup = user.user_metadata?.company_setup_completed === true;
    
    return NextResponse.json({ 
      hasCompletedSetup,
      userId: user.id 
    });
  } catch (error) {
    console.error('Error checking user setup status:', error);
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}

// Mark user as having completed setup
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update user metadata to mark setup as completed
    const { error: updateError } = await supabase.auth.updateUser({
      data: { company_setup_completed: true }
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json({ error: 'Failed to update setup status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking user setup as complete:', error);
    return NextResponse.json({ error: 'Failed to mark setup as complete' }, { status: 500 });
  }
} 