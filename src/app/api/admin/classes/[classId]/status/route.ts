import { NextResponse } from 'next/server';
import { updateClass } from '@/lib/db/classes';

const VALID_STATUSES = ['PUBLISHED', 'DRAFT', 'CANCELLED', 'COMPLETED'] as const;
type AllowedStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status as AllowedStatus)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const nextStatus = status as AllowedStatus;
    const updatedClass = await updateClass(classId, {
      status: nextStatus,
      publishedAt: nextStatus === 'PUBLISHED' ? new Date() : null,
    });

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
