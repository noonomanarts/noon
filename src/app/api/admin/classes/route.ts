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
    } = body;

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
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}
