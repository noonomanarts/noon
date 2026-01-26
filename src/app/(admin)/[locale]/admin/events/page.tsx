import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export default async function AdminEventsPage() {
  const events = await prisma.eventBooking.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: events.length,
    new: events.filter((e) => e.status === 'NEW').length,
    pendingConfirmation: events.filter(
      (e) => e.status === 'PENDING_CLIENT_CONFIRMATION'
    ).length,
    confirmed: events.filter((e) => e.status === 'CLIENT_CONFIRMED').length,
    completed: events.filter((e) => e.status === 'COMPLETED').length,
  };

  const eventTypeLabels: Record<string, string> = {
    COOKING_COMPETITION: 'Cooking Competition',
    PRIVATE_CLASS: 'Private Class',
    BIRTHDAY_PARTY: 'Birthday Party',
  };

  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDING_CLIENT_CONFIRMATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    CLIENT_CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    PENDING_PAYMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    COMPLETED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Event Bookings
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage group bookings, competitions, and private events
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-md dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Event Booking
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="absolute right-2 top-2 opacity-5 transition-opacity group-hover:opacity-10">
            <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.total}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Total Events</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-blue-900/30 dark:from-blue-950/30 dark:to-cyan-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.new}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-500">New</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-orange-900/30 dark:from-orange-950/30 dark:to-amber-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{stats.pendingConfirmation}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-500">Pending</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-green-900/30 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.confirmed}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-500">Confirmed</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-zinc-100 bg-gradient-to-br from-zinc-50 to-slate-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:from-zinc-900/50 dark:to-slate-900/50">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-zinc-700 dark:text-zinc-400">{stats.completed}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">Completed</div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Booking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Participants
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {events.map((event) => (
                <tr key={event.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-4">
                    <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">{event.bookingNumber}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {eventTypeLabels[event.eventType]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-sm text-zinc-900 dark:text-white">{event.fullName}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{event.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                      {new Date(event.selectedDate).toLocaleDateString()}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                      {event.selectedTime}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {event.numberOfParticipants}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-zinc-900 dark:text-white">
                    {event.totalAmount
                      ? `${event.totalAmount} ${event.currency}`
                      : <span className="text-zinc-400 dark:text-zinc-600">-</span>}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        statusColors[event.status]
                      }`}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                        <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">No event bookings found</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Event bookings will appear here once created.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
