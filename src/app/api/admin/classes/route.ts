import { NextRequest, NextResponse } from 'next/server';
import { findManyClassesPaginated, createClass, findUniqueClass } from '@/lib/db/classes';
import { verifyTrainer } from '@/lib/db/trainers';
import { query } from '@/lib/db/pool';

// GET: List all classes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, string> = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const { classes, total } = await findManyClassesPaginated({
      where: where as { category?: 'COOKING' | 'ARTS_CRAFTS'; status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' },
      include: { trainer: true, sessions: true },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    // For each class, get sessions and counts
    const classesWithDetails = await Promise.all(
      classes.map(async (cls) => {
        // Get upcoming sessions
        const sessionsResult = await query(
          `SELECT * FROM class_sessions 
           WHERE class_id = $1 AND start_date_time >= $2 AND is_cancelled = false
           ORDER BY start_date_time ASC LIMIT 5`,
          [cls.id, new Date()]
        );

        // Get counts
        const countsResult = await query(
          `SELECT 
            (SELECT COUNT(*)::int FROM bookings WHERE class_id = $1) as bookings_count,
            (SELECT COUNT(*)::int FROM reviews WHERE class_id = $1) as reviews_count,
            (SELECT COUNT(*)::int FROM class_sessions WHERE class_id = $1) as sessions_count`,
          [cls.id]
        );

        return {
          ...cls,
          sessions: sessionsResult.rows.map(s => ({
            id: s.id,
            startDateTime: s.start_date_time,
            endDateTime: s.end_date_time,
            seatsTotal: s.seats_total,
            seatsBooked: s.seats_booked,
            isCancelled: s.is_cancelled,
          })),
          _count: {
            bookings: countsResult.rows[0]?.bookings_count ?? 0,
            reviews: countsResult.rows[0]?.reviews_count ?? 0,
            sessions: countsResult.rows[0]?.sessions_count ?? 0,
          },
        };
      })
    );

    return NextResponse.json({
      classes: classesWithDetails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

// POST: Create a new class
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      titleAr,
      description,
      descriptionAr,
      category,
      subCategory,
      trainerId,
      price,
      seatsTotal,
      durationMinutes,
      image,
      images,
      status,
      metaTitle,
      metaDescription,
      currency,
    } = body;

    if (!title || !description || !category || !subCategory || !trainerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(seatsTotal) || seatsTotal < 1) {
      return NextResponse.json(
        { error: 'Invalid seats total' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    const validCategories = ['COOKING', 'ARTS_CRAFTS'];
    const validSubCategories = [
      'APPETIZERS_SNACKS',
      'MAIN_DISHES',
      'DESSERTS_BAKING',
      'MOM_AND_KID',
      'PAINTING',
      'POTTERY',
      'CRAFTS',
      'MIXED',
    ];
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    if (!validSubCategories.includes(subCategory)) {
      return NextResponse.json(
        { error: 'Invalid sub-category' },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    if (currency && currency !== 'OMR') {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingClass = await findUniqueClass({ slug });

    if (existingClass) {
      return NextResponse.json(
        { error: 'A class with this title already exists' },
        { status: 400 }
      );
    }

    // Verify trainer exists
    const isTrainer = await verifyTrainer(trainerId);

    if (!isTrainer) {
      return NextResponse.json(
        { error: 'Invalid trainer ID' },
        { status: 400 }
      );
    }

    const newClass = await createClass({
      slug,
      title,
      titleAr,
      description,
      descriptionAr,
      category,
      subCategory,
      trainerId,
      price,
      seatsTotal,
      durationMinutes,
      image,
      images: images || [],
      status: status || 'DRAFT',
      currency: currency || 'OMR',
      metaTitle,
      metaDescription,
    });

    // Get trainer info
    const trainerResult = await query(
      `SELECT id, full_name, profile_image FROM users WHERE id = $1`,
      [trainerId]
    );

    return NextResponse.json({
      ...newClass,
      trainer: trainerResult.rows[0] ? {
        id: trainerResult.rows[0].id,
        fullName: trainerResult.rows[0].full_name,
        profileImage: trainerResult.rows[0].profile_image,
      } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create class';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
