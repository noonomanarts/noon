import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type Params = {
  params: Promise<{ classId: string }>;
};

// GET: Get single class
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
      include: {
        trainer: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            email: true,
          },
        },
        sessions: {
          orderBy: { startDateTime: 'asc' },
          include: {
            bookings: {
              select: {
                id: true,
                status: true,
                numberOfParticipants: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            bookings: true,
            sessions: true,
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

// PUT: Update class
export async function PUT(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const body = await request.json();
    const { slug: _, ...updateData } = body; // Remove slug from updates

    const updatedClass = await prisma.class.update({
      where: { id: params.classId },
      data: updateData,
      include: {
        trainer: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

// DELETE: Delete class
export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    // Check if class has any bookings
    const bookingsCount = await prisma.booking.count({
      where: { classId: params.classId },
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete class with existing bookings' },
        { status: 400 }
      );
    }

    await prisma.class.delete({
      where: { id: params.classId },
    });

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
