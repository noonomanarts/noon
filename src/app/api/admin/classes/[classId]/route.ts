import { NextRequest, NextResponse } from 'next/server';
import { findUniqueClass, updateClass, deleteClass, countClassBookings } from '@/lib/db/classes';
import { query } from '@/lib/db/pool';

function normalizePercent(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
}

type Params = {
  params: Promise<{ classId: string }>;
};

// GET: Get single class
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const classData = await findUniqueClass(
      { id: params.classId },
      { trainer: true, sessions: true, reviews: true }
    );

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get counts
    const countsResult = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM bookings WHERE class_id = $1) as bookings_count,
        (SELECT COUNT(*)::int FROM class_sessions WHERE class_id = $1) as sessions_count`,
      [params.classId]
    );

    return NextResponse.json({
      ...classData,
      _count: {
        bookings: countsResult.rows[0]?.bookings_count ?? 0,
        sessions: countsResult.rows[0]?.sessions_count ?? 0,
      },
    });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { slug: _, ...updateData } = body;

    const hasFinanceFields =
      updateData.trainerSharePercent !== undefined ||
      updateData.noonSharePercent !== undefined ||
      updateData.expenseSharePercent !== undefined;

    if (hasFinanceFields) {
      const existingClass = await findUniqueClass({ id: params.classId });
      if (!existingClass) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }

      const trainerSharePercent = normalizePercent(
        updateData.trainerSharePercent ?? existingClass.trainerSharePercent
      );
      const noonSharePercent = normalizePercent(
        updateData.noonSharePercent ?? existingClass.noonSharePercent
      );
      const expenseSharePercent = normalizePercent(
        updateData.expenseSharePercent ?? existingClass.expenseSharePercent
      );
      const totalPercent = Number((trainerSharePercent + noonSharePercent + expenseSharePercent).toFixed(2));

      if (
        !Number.isFinite(trainerSharePercent) ||
        !Number.isFinite(noonSharePercent) ||
        !Number.isFinite(expenseSharePercent) ||
        trainerSharePercent < 0 ||
        noonSharePercent < 0 ||
        expenseSharePercent < 0 ||
        Math.abs(totalPercent - 100) > 0.01
      ) {
        return NextResponse.json(
          { error: 'Trainer, Noon, and expense percentages must total exactly 100' },
          { status: 400 }
        );
      }

      updateData.trainerSharePercent = trainerSharePercent;
      updateData.noonSharePercent = noonSharePercent;
      updateData.expenseSharePercent = expenseSharePercent;
    }

    const updatedClass = await updateClass(params.classId, updateData);

    if (!updatedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get trainer info
    const trainerResult = await query(
      `SELECT id, full_name, profile_image FROM users WHERE id = $1`,
      [updatedClass.trainerId]
    );

    return NextResponse.json({
      ...updatedClass,
      trainer: trainerResult.rows[0] ? {
        id: trainerResult.rows[0].id,
        fullName: trainerResult.rows[0].full_name,
        profileImage: trainerResult.rows[0].profile_image,
      } : null,
    });
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
    const bookingsCount = await countClassBookings(params.classId);

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete class with existing bookings' },
        { status: 400 }
      );
    }

    const deleted = await deleteClass(params.classId);

    if (!deleted) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
