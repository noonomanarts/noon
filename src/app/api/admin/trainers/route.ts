import { readSessionUserId } from '@/lib/sessionToken';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findTrainers, findTrainerProfiles } from '@/lib/db/trainers';
import { getSessionUserById } from '@/lib/db/users';

// GET: List all trainers with their profiles
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = readSessionUserId(cookieStore);

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getSessionUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Get all trainers
    const trainers = await findTrainers({ activeOnly });

    // Get trainer profiles
    const userIds = trainers.map(t => t.id);
    const profiles = await findTrainerProfiles(userIds);

    // Merge trainers with their profiles
    const trainersWithProfiles = trainers.map(trainer => {
      const profile = profiles.find(p => p.userId === trainer.id);
      return {
        ...trainer,
        profile: profile || null,
      };
    });

    return NextResponse.json({ trainers: trainersWithProfiles });
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}
