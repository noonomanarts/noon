import { NextResponse } from 'next/server';
import { updateClass } from '@/lib/db/classes';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!['PUBLISHED', 'DRAFT', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updatedClass = await updateClass(classId, { status });

    if (!updatedClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Failed to update class status:', error);
    return NextResponse.json(
      { error: 'Failed to update class status' },
      { status: 500 }
    );
  }
}
