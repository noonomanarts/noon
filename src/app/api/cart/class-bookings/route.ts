import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addClassBookingToCart, CART_COOKIE_NAME, parseCartCookie, serializeCartCookie } from '@/lib/cart';
import { query } from '@/lib/db/pool';

type Participant = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
  gender: 'MALE' | 'FEMALE';
};

function parseParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Participant => Boolean(
      item
      && typeof item === 'object'
      && typeof (item as Participant).fullName === 'string'
      && typeof (item as Participant).dateOfBirth === 'string'
      && ((item as Participant).preferredLanguage === 'en' || (item as Participant).preferredLanguage === 'ar')
      && ((item as Participant).gender === 'MALE' || (item as Participant).gender === 'FEMALE')
    ))
    .slice(0, 20)
    .map((item) => ({
      fullName: item.fullName.trim(),
      dateOfBirth: item.dateOfBirth.trim(),
      preferredLanguage: item.preferredLanguage,
      gender: item.gender,
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      classId?: string;
      numberOfParticipants?: number;
      participants?: Participant[];
      freePartners?: Participant[];
      specialRequests?: string;
    };

    const classId = typeof body.classId === 'string' ? body.classId.trim() : '';
    const numberOfParticipants = Number(body.numberOfParticipants);
    const participants = parseParticipants(body.participants);
    const freePartners = parseParticipants(body.freePartners);
    const specialRequests = typeof body.specialRequests === 'string' ? body.specialRequests.trim().slice(0, 3000) : '';

    if (!classId || !Number.isInteger(numberOfParticipants) || numberOfParticipants < 1) {
      return NextResponse.json({ error: 'Invalid class booking draft' }, { status: 400 });
    }

    if (participants.length !== numberOfParticipants) {
      return NextResponse.json({ error: 'Participants data is incomplete' }, { status: 400 });
    }

    const partnerKeys = freePartners.map((partner) => `${partner.fullName.trim().toLowerCase()}|${partner.dateOfBirth.trim()}`);
    if (new Set(partnerKeys).size !== partnerKeys.length) {
      return NextResponse.json(
        { error: 'Each partner can only be linked to one child. A partner cannot be registered with two children.' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT id, slug, title, title_ar, image, start_date_time, price, currency, status, audience_gender, sub_category
       FROM classes
       WHERE id = $1
       LIMIT 1`,
      [classId]
    );

    const classRow = result.rows[0];
    if (!classRow || classRow.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Class not available' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const currentCart = parseCartCookie(cartCookie);
    const nextCart = addClassBookingToCart(currentCart, {
      classId: String(classRow.id),
      slug: String(classRow.slug),
      title: String(classRow.title),
      titleAr: typeof classRow.title_ar === 'string' ? classRow.title_ar : null,
      image: typeof classRow.image === 'string' ? classRow.image : null,
      startDateTime: classRow.start_date_time ? String(classRow.start_date_time) : null,
      price: Number(classRow.price ?? 0),
      currency: String(classRow.currency || 'OMR'),
      numberOfParticipants,
      participants,
      freePartners,
      specialRequests,
      audienceGender: classRow.audience_gender === 'MALE_ONLY' || classRow.audience_gender === 'FEMALE_ONLY' || classRow.audience_gender === 'MIXED'
        ? classRow.audience_gender
        : null,
      subCategory: typeof classRow.sub_category === 'string' ? classRow.sub_category : null,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(nextCart), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('Error adding class booking to cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}