import { NextRequest, NextResponse, after } from 'next/server';
import { findManyClassesPaginated, createClass, findUniqueClass } from '@/lib/db/classes';
import { verifyTrainer } from '@/lib/db/trainers';
import { query } from '@/lib/db/pool';
import { isQuarterHourDateTimeValue } from '@/lib/dateTime';

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

    // For each class, get counts
    const classesWithDetails = await Promise.all(
      classes.map(async (cls) => {
        // Get counts
        const countsResult = await query(
          `SELECT 
            (SELECT COUNT(*)::int FROM bookings
             WHERE class_id = $1
               AND payment_status = 'PAID'
               AND status IN ('CONFIRMED', 'COMPLETED')) as bookings_count,
            (SELECT COUNT(*)::int FROM reviews WHERE class_id = $1) as reviews_count`,
          [cls.id]
        );

        return {
          ...cls,
          _count: {
            bookings: countsResult.rows[0]?.bookings_count ?? 0,
            reviews: countsResult.rows[0]?.reviews_count ?? 0,
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
      categories,
      subCategories,
      audienceGender,
      trainerId,
      coTrainerId,
      venue,
      price,
      seatsTotal,
      durationMinutes,
      image,
      images,
      status,
      metaTitle,
      metaDescription,
      registrationMessage,
      registrationMessageAr,
      finalRecipeTitle,
      finalRecipePdf,
      finalRecipeBrief,
      finalRecipeTitleAr,
      finalRecipePdfAr,
      finalRecipeBriefAr,
      finalRecipeVisibleToCustomers,
      currency,
      minimumAge,
      maximumAge,
      showMinimumAge,
      startDateTime,
      endDateTime,
      registrationCloseAt,
      scheduleSessions,
    } = body;

    const isDraft = status === 'DRAFT';

    // For non-draft classes, require all fields
    if (!isDraft) {
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
    } else {
      // For draft, require at least a title for identification
      if (!title?.trim()) {
        return NextResponse.json(
          { error: 'Title is required even for drafts' },
          { status: 400 }
        );
      }
    }

    const validCategories = ['COOKING', 'ARTS_CRAFTS'];
    const validSubCategories = [
      'APPETIZERS_SNACKS',
      'MAIN_DISHES',
      'DESSERTS_BAKING',
      'MOM_AND_KID',
      'SUMMER_CAMP',
      'PAINTING',
      'POTTERY',
      'CRAFTS',
      'MIXED',
    ];
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
    const validAudienceGenders = ['MALE_ONLY', 'FEMALE_ONLY', 'MIXED'];

    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    if (categories !== undefined && (!Array.isArray(categories) || categories.some((item: unknown) => !validCategories.includes(String(item))))) {
      return NextResponse.json(
        { error: 'Invalid categories' },
        { status: 400 }
      );
    }

    if (subCategory && !validSubCategories.includes(subCategory)) {
      return NextResponse.json(
        { error: 'Invalid sub-category' },
        { status: 400 }
      );
    }

    if (subCategories !== undefined && (!Array.isArray(subCategories) || subCategories.some((item: unknown) => !validSubCategories.includes(String(item))))) {
      return NextResponse.json(
        { error: 'Invalid sub-categories' },
        { status: 400 }
      );
    }

    if (venue !== undefined && venue !== null && !['KITCHEN', 'OUTSIDE'].includes(venue)) {
      return NextResponse.json(
        { error: 'Invalid venue' },
        { status: 400 }
      );
    }

    if (coTrainerId && coTrainerId === trainerId) {
      return NextResponse.json(
        { error: 'Co-trainer must be different from the main trainer' },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    if (audienceGender && !validAudienceGenders.includes(audienceGender)) {
      return NextResponse.json(
        { error: 'Invalid audience gender' },
        { status: 400 }
      );
    }

    if (currency && currency !== 'OMR') {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    if (startDateTime && !isQuarterHourDateTimeValue(startDateTime)) {
      return NextResponse.json(
        { error: 'Start date & time minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (endDateTime && !isQuarterHourDateTimeValue(endDateTime)) {
      return NextResponse.json(
        { error: 'End date & time minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (registrationCloseAt && !isQuarterHourDateTimeValue(registrationCloseAt)) {
      return NextResponse.json(
        { error: 'Registration close minutes must be 00, 15, 30, or 45' },
        { status: 400 }
      );
    }

    if (minimumAge != null && (!Number.isInteger(minimumAge) || minimumAge < 1 || minimumAge > 99)) {
      return NextResponse.json(
        { error: 'Minimum age must be an integer between 1 and 99' },
        { status: 400 }
      );
    }

    if (maximumAge != null && (!Number.isInteger(maximumAge) || maximumAge < 1 || maximumAge > 99)) {
      return NextResponse.json(
        { error: 'Maximum age must be an integer between 1 and 99' },
        { status: 400 }
      );
    }

    if (minimumAge != null && maximumAge != null && maximumAge < minimumAge) {
      return NextResponse.json(
        { error: 'Maximum age cannot be lower than minimum age' },
        { status: 400 }
      );
    }

    // For drafts, use defaults for required DB fields when not provided
    const resolvedCategories: string[] = Array.isArray(categories) && categories.length > 0
      ? Array.from(new Set(categories.map((item: unknown) => String(item))))
      : (category ? [category] : ['COOKING']);
    const resolvedSubCategories: string[] = Array.isArray(subCategories) && subCategories.length > 0
      ? Array.from(new Set(subCategories.map((item: unknown) => String(item))))
      : (subCategory ? [subCategory] : ['MIXED']);
    const resolvedCategory = resolvedCategories[0];
    const resolvedSubCategory = resolvedSubCategories[0];
    const resolvedTrainerId = trainerId || null;
    const resolvedCoTrainerId = coTrainerId || null;
    const resolvedPrice = typeof price === 'number' ? price : 0;
    const resolvedSeatsTotal = Number.isInteger(seatsTotal) && seatsTotal > 0 ? seatsTotal : 12;
    const resolvedDurationMinutes = Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : 120;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists, append random suffix if needed
    let finalSlug = slug;
    const existingClass = await findUniqueClass({ slug: finalSlug });
    if (existingClass) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    // For drafts, skip trainer verification if no trainer selected
    if (!isDraft || resolvedTrainerId) {
      if (resolvedTrainerId) {
        const isTrainer = await verifyTrainer(resolvedTrainerId);
        if (!isTrainer) {
          return NextResponse.json(
            { error: 'Invalid trainer ID' },
            { status: 400 }
          );
        }
      }
    }

    if (resolvedCoTrainerId) {
      const isCoTrainer = await verifyTrainer(resolvedCoTrainerId);
      if (!isCoTrainer) {
        return NextResponse.json(
          { error: 'Invalid co-trainer ID' },
          { status: 400 }
        );
      }
    }

    const newClass = await createClass({
      slug: finalSlug,
      title,
      titleAr: titleAr || '',
      description: description || '',
      descriptionAr: descriptionAr || '',
      category: resolvedCategory as 'COOKING' | 'ARTS_CRAFTS',
      subCategory: resolvedSubCategory as Parameters<typeof createClass>[0]['subCategory'],
      categories: resolvedCategories as ('COOKING' | 'ARTS_CRAFTS')[],
      subCategories: resolvedSubCategories as Parameters<typeof createClass>[0]['subCategories'],
      audienceGender: audienceGender || 'FEMALE_ONLY',
      trainerId: resolvedTrainerId,
      coTrainerId: resolvedCoTrainerId,
      venue: venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
      price: resolvedPrice,
      seatsTotal: resolvedSeatsTotal,
      durationMinutes: resolvedDurationMinutes,
      image,
      images: images || [],
      status: status || 'DRAFT',
      currency: currency || 'OMR',
      metaTitle,
      metaDescription,
      registrationMessage,
      registrationMessageAr,
      minimumAge: minimumAge ?? null,
      maximumAge: maximumAge ?? null,
      showMinimumAge: Boolean(showMinimumAge),
      finalRecipeTitle,
      finalRecipePdf,
      finalRecipeBrief,
      finalRecipeTitleAr,
      finalRecipePdfAr,
      finalRecipeBriefAr,
      finalRecipeVisibleToCustomers,
      trainerSharePercent: 0,
      noonSharePercent: 0,
      expenseSharePercent: 0,
      startDateTime: startDateTime || null,
      endDateTime: endDateTime || null,
      registrationCloseAt: registrationCloseAt || null,
      scheduleSessions: Array.isArray(scheduleSessions) ? scheduleSessions : [],
    });

    // Create calendar event if date/time is set (kitchen workshops block the
    // venue; a 3-hour cleaning block follows kitchen cooking workshops)
    if (startDateTime) {
      try {
        const { syncClassCalendarEvents } = await import('@/lib/db/events');
        await syncClassCalendarEvents(newClass.id as string);
      } catch (calError) {
        console.error('Error creating calendar event for class:', calError);
      }
    }

    // Notify pending repeat requesters when a workshop is created directly as published
    if (newClass.status === 'PUBLISHED') {
      after(async () => {
        try {
          const { notifyRepeatRequestersForPublishedClass } = await import('@/lib/db/classRepeatRequests');
          await notifyRepeatRequestersForPublishedClass({ classId: newClass.id as string });
        } catch (error) {
          console.error('[classes/create] notifyRepeatRequestersForPublishedClass failed:', error);
        }
      });
    }

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
