import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { findCalendarEvents } from '@/lib/db/events';
import { getUserById } from '@/lib/db/users';

type CalendarEventRecord = {
  id: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  title: string;
  description?: string;
  isBlocked?: boolean;
  blockReason?: string;
  internalNotes?: string;
  visibleToTrainers?: boolean;
  visibleTrainerIds?: string[];
  appointmentContactName?: string;
  appointmentContactPhone?: string;
  color?: string;
  classSession?: {
    class?: {
      trainer?: {
        id?: string;
        fullName?: string;
      } | null;
    } | null;
  } | null;
};

async function requireTrainerUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'TRAINER') return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const trainer = await requireTrainerUser();
    if (!trainer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const events = (await findCalendarEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })) as CalendarEventRecord[];

    const filtered = events
      .filter((event) => {
        const classTrainerId = event.classSession?.class?.trainer?.id;
        const assignedToTrainer = classTrainerId === trainer.id;

        const visibleIds = Array.isArray(event.visibleTrainerIds) ? event.visibleTrainerIds : [];
        const trainerAllowedByVisibility =
          Boolean(event.visibleToTrainers) &&
          (visibleIds.length === 0 || visibleIds.includes(trainer.id));

        return assignedToTrainer || trainerAllowedByVisibility;
      })
      .map((event) => ({
        id: event.id,
        type: event.type,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        title: event.title,
        description: event.description,
        isBlocked: Boolean(event.isBlocked),
        blockReason: event.blockReason,
        internalNotes: event.internalNotes,
        appointmentContactName: event.appointmentContactName,
        appointmentContactPhone: event.appointmentContactPhone,
        color: event.color,
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching trainer calendar:', error);
    return NextResponse.json({ error: 'Failed to fetch trainer calendar' }, { status: 500 });
  }
}
