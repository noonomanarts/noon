import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { status },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Failed to update class status:', error);
    return NextResponse.json(
      { error: 'Failed to update class status' },
      { status: 500 }
    );
  }
}
