import { NextRequest, NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import { findUniqueClass, updateClass, deleteClass, countClassBookings } from '@/lib/db/classes';
import { cleanupClosedClassSettlement } from '@/lib/db/classFinance';
import { notifyRepeatRequestersForPublishedClass } from '@/lib/db/classRepeatRequests';
import { query } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { isQuarterHourDateTimeValue } from '@/lib/dateTime';

type Params = {
  params: Promise<{ classId: string }>;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Get single class
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    if (!UUID_RE.test(params.classId)) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classData = await findUniqueClass(
      { id: params.classId },
      { trainer: true, reviews: true }
    );

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get counts (active paid bookings only)
    const countsResult = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM bookings
         WHERE class_id = $1
           AND payment_status = 'PAID'
           AND status IN ('CONFIRMED', 'COMPLETED')) as bookings_count`,
      [params.classId]
    );

    return NextResponse.json({
      ...classData,
      _count: {
        bookings: countsResult.rows[0]?.bookings_count ?? 0,
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
    if (!UUID_RE.test(params.classId)) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { slug: _, ...updateData } = body;

    if (updateData.venue !== undefined && !['KITCHEN', 'OUTSIDE'].includes(updateData.venue)) {
      return NextResponse.json(
        { error: 'Invalid venue' },
        { status: 400 }
      );
    }

    if (updateData.categories !== undefined) {
      if (!Array.isArray(updateData.categories) || updateData.categories.length === 0) {
        return NextResponse.json({ error: 'Invalid categories' }, { status: 400 });
      }
      updateData.categories = Array.from(new Set(updateData.categories.map((item: unknown) => String(item))));
      updateData.category = updateData.categories[0];
    }

    if (updateData.subCategories !== undefined) {
      if (!Array.isArray(updateData.subCategories) || updateData.subCategories.length === 0) {
        return NextResponse.json({ error: 'Invalid sub-categories' }, { status: 400 });
      }
      updateData.subCategories = Array.from(new Set(updateData.subCategories.map((item: unknown) => String(item))));
      updateData.subCategory = updateData.subCategories[0];
    }

    if (updateData.startDateTime && !isQuarterHourDateTimeValue(updateData.startDateTime)) {
      return NextResponse.json(
        { error: 'Start date & time minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (updateData.endDateTime && !isQuarterHourDateTimeValue(updateData.endDateTime)) {
      return NextResponse.json(
        { error: 'End date & time minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (updateData.registrationCloseAt && !isQuarterHourDateTimeValue(updateData.registrationCloseAt)) {
      return NextResponse.json(
        { error: 'Registration close minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (updateData.minimumAge != null && (!Number.isInteger(updateData.minimumAge) || updateData.minimumAge < 1 || updateData.minimumAge > 99)) {
      return NextResponse.json(
        { error: 'Minimum age must be an integer between 1 and 99' },
        { status: 400 }
      );
    }

    if (updateData.maximumAge != null && (!Number.isInteger(updateData.maximumAge) || updateData.maximumAge < 1 || updateData.maximumAge > 99)) {
      return NextResponse.json(
        { error: 'Maximum age must be an integer between 1 and 99' },
        { status: 400 }
      );
    }

    if (
      updateData.minimumAge != null
      && updateData.maximumAge != null
      && updateData.maximumAge < updateData.minimumAge
    ) {
      return NextResponse.json(
        { error: 'Maximum age cannot be lower than minimum age' },
        { status: 400 }
      );
    }

    if (Array.isArray(updateData.scheduleSessions)) {
      for (const session of updateData.scheduleSessions) {
        if (
          !session
          || typeof session !== 'object'
          || !isQuarterHourDateTimeValue((session as { startDateTime?: string }).startDateTime)
          || !isQuarterHourDateTimeValue((session as { endDateTime?: string }).endDateTime)
        ) {
          return NextResponse.json(
            { error: 'Summer camp schedule session minutes must be 00, 15, 30, or 45' },
            { status: 400 }
          );
        }
      }
    }

    const existingClass = await findUniqueClass({ id: params.classId });
    const previousStatus = existingClass?.status ?? null;

    if (updateData.coTrainerId !== undefined && updateData.coTrainerId !== null) {
      const resolvedTrainerId = updateData.trainerId ?? existingClass?.trainerId ?? null;
      if (updateData.coTrainerId === resolvedTrainerId) {
        return NextResponse.json(
          { error: 'Co-trainer must be different from the main trainer' },
          { status: 400 }
        );
      }
    }

    const updatedClass = await updateClass(params.classId, updateData);

    if (!updatedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Keep the calendar in sync with the class schedule and venue
    try {
      const { syncClassCalendarEvents } = await import('@/lib/db/events');
      await syncClassCalendarEvents(params.classId);
    } catch (calError) {
      console.error('Error syncing calendar events for class:', calError);
    }

    // Notify repeat requesters when this class becomes published
    if (previousStatus !== 'PUBLISHED' && updatedClass.status === 'PUBLISHED') {
      after(async () => {
        try {
          await notifyRepeatRequestersForPublishedClass({ classId: params.classId });
        } catch (error) {
          console.error('[classes/update] notifyRepeatRequestersForPublishedClass failed:', error);
        }
      });
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
    const message = error instanceof Error ? error.message : 'Failed to update class';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE: Delete class
export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    if (!UUID_RE.test(params.classId)) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classData = await findUniqueClass({ id: params.classId });
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if class has any bookings
    const bookingsCount = await countClassBookings(params.classId);

    if (bookingsCount > 0 && classData.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot delete class with existing bookings' },
        { status: 400 }
      );
    }

    if (classData.status === 'COMPLETED') {
      await cleanupClosedClassSettlement({ classId: params.classId });
      await query(`DELETE FROM bookings WHERE class_id = $1`, [params.classId]);
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
