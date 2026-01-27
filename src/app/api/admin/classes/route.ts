import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET: List all classes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          trainer: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
          sessions: {
            where: {
              startDateTime: { gte: new Date() },
              isCancelled: false,
            },
            orderBy: { startDateTime: 'asc' },
            take: 5,
          },
          _count: {
            select: {
              bookings: true,
              reviews: true,
              sessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.class.count({ where }),
    ]);

    return NextResponse.json({
      classes,
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
    const existingClass = await prisma.class.findUnique({
      where: { slug },
    });

    if (existingClass) {
      return NextResponse.json(
        { error: 'A class with this title already exists' },
        { status: 400 }
      );
    }

    // Verify trainer exists
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, role: 'TRAINER' },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Invalid trainer ID' },
        { status: 400 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
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
        seatsAvailable: seatsTotal,
        durationMinutes,
        image,
        images: images || [],
        status: status || 'DRAFT',
        currency: currency || undefined,
        metaTitle,
        metaDescription,
      },
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

    return NextResponse.json(newClass, { status: 201 });
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
