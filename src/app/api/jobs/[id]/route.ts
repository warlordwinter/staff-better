
import { NextRequest, NextResponse } from 'next/server';
import { updateJob, deleteJob } from '@/lib/dao/JobsDao';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const updates = await request.json();

        const updatedJob = await updateJob(id, updates);
        return NextResponse.json(updatedJob[0]);
    } catch (error) {
        console.error('Failed to update job:', error);
        return NextResponse.json({ error: 'Faild to update job' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = params;

        await deleteJob(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete job:', error);
        return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }
}