import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { defaultClassFinanceAdminSettings, getAdminSettingsByKey, type ClassFinanceAdminSettings } from '@/lib/db/adminSettings';
import { getUserById, updateUser } from '@/lib/db/users';
import { getTrainerProfile, upsertTrainerProfile } from '@/lib/db/trainers';

const USER_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

const isValidSocialLinks = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.values(value).every(
    (url) => typeof url === 'string' && (url.length === 0 || /^https?:\/\//i.test(url))
  );
};

const sanitizeShareTiers = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;

  const tiers = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const minParticipants = Math.max(0, Math.trunc(Number(row.minParticipants ?? 0) || 0));
      const rawMax = row.maxParticipants;
      const maxParticipants = rawMax === null || rawMax === undefined || rawMax === '' ? null : Math.max(minParticipants, Math.trunc(Number(rawMax) || 0));
      const percent = Math.min(100, Math.max(0, Number(row.percent ?? 0) || 0));

      return {
        minParticipants,
        maxParticipants,
        percent: Number(percent.toFixed(2)),
      };
    })
    .filter(
      (item): item is { minParticipants: number; maxParticipants: number | null; percent: number } => Boolean(item)
    )
    .sort((left, right) => left.minParticipants - right.minParticipants);

  return tiers;
};

// GET: Get trainer details with profile
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    // Get user
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'TRAINER') {
      return NextResponse.json({ error: 'User is not a trainer' }, { status: 400 });
    }

    // Get trainer profile
    const profile = await getTrainerProfile(id);

    return NextResponse.json({
      ...user,
      profile,
    });
  } catch (error) {
    console.error('Error fetching trainer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainer' },
      { status: 500 }
    );
  }
}

// PATCH: Update trainer profile  
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : undefined;
    const profileImage = typeof body.profileImage === 'string' ? body.profileImage.trim() : undefined;
    const status = typeof body.status === 'string' ? body.status.toUpperCase() : undefined;
    const bio = typeof body.bio === 'string' ? body.bio.trim() : undefined;
    const experience =
      typeof body.experience === 'number' && Number.isFinite(body.experience)
        ? Math.max(0, Math.floor(body.experience))
        : undefined;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;
    const shareTiers = sanitizeShareTiers(body.shareTiers);

    if (status && !USER_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid user status' }, { status: 400 });
    }

    if (experience !== undefined && experience > 60) {
      return NextResponse.json({ error: 'Experience must be between 0 and 60' }, { status: 400 });
    }

    if (body.socialLinks !== undefined && !isValidSocialLinks(body.socialLinks)) {
      return NextResponse.json({ error: 'Invalid social links format' }, { status: 400 });
    }

    if (body.shareTiers !== undefined && !shareTiers) {
      return NextResponse.json({ error: 'Invalid trainer share tiers format' }, { status: 400 });
    }

    const expertise = Array.isArray(body.expertise)
      ? body.expertise
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : undefined;

    // Get user
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user basic info if provided
    if (
      fullName !== undefined ||
      phoneNumber !== undefined ||
      profileImage !== undefined ||
      status !== undefined
    ) {
      await updateUser(id, {
        full_name: fullName,
        phone_number: phoneNumber,
        profile_image: profileImage,
        status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | undefined,
      });
    }

    // Promote to trainer if not already
    if (user.role !== 'TRAINER') {
      await updateUser(id, { role: 'TRAINER' });
    }

    const savedClassFinance = await getAdminSettingsByKey<ClassFinanceAdminSettings>('class-finance');
    const defaultShareTiers =
      savedClassFinance?.defaultTrainerShareTiers?.length
        ? savedClassFinance.defaultTrainerShareTiers
        : defaultClassFinanceAdminSettings.defaultTrainerShareTiers;

    // Update or create trainer profile
    const profile = await upsertTrainerProfile({
      userId: id,
      bio,
      expertise,
      experience,
      socialLinks: (body.socialLinks as Record<string, string> | undefined),
      shareTiers: shareTiers ?? defaultShareTiers,
      isActive,
    });

    // Fetch updated user
    const updatedUser = await getUserById(id);

    return NextResponse.json({
      ...updatedUser,
      profile,
    });
  } catch (error) {
    console.error('Error updating trainer:', error);
    return NextResponse.json(
      { error: 'Failed to update trainer' },
      { status: 500 }
    );
  }
}
