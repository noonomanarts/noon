'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  title: string;
  description?: string;
  isBlocked: boolean;
  classSession?: {
    class: {
      id: string;
      title: string;
      category: string;
      trainer: {
        fullName: string;
      };
    };
  };
  eventBooking?: {
    id: string;
    bookingNumber: string;
    eventType: string;
    fullName: string;
    status: string;
  };
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const url = `/api/admin/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      console.log('Fetching events from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      // Check if response is successful and data is an array
      if (response.ok && Array.isArray(data)) {
        setEvents(data);
        setError(null);
      } else if (!response.ok && data?.error) {
        console.error('API error:', data.error);
        setError(data.error);
        setEvents([]);
      } else {
        console.error('Invalid response format:', data);
        setError('Received invalid data format from server');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const eventTypeColors: Record<string, string> = {
    CLASS: 'bg-blue-600 dark:bg-blue-500',
    PRIVATE_SESSION: 'bg-green-600 dark:bg-green-500',
    COMPETITION: 'bg-purple-600 dark:bg-purple-500',
    BIRTHDAY_PARTY: 'bg-pink-600 dark:bg-pink-500',
    BLOCKED: 'bg-zinc-600 dark:bg-zinc-500',
    CLEANING: 'bg-yellow-600 dark:bg-yellow-500',
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const date = new Date(event.startDateTime).toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(event);
    });
    return grouped;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const groupedEvents = groupEventsByDate();
  const daysInMonth = getDaysInMonth();

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Calendar & Timetable
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage class schedules, events, and blocked times
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Block Time
          </button>
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-cyan-700 hover:shadow-md dark:from-blue-500 dark:to-cyan-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule Class
          </Link>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[200px] px-4 py-1 text-center text-lg font-semibold text-zinc-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={nextMonth}
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            Today
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView('day')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'day'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'week'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'month'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {Object.entries(eventTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${color}`}></div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {type.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading calendar...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 py-12 dark:border-red-900/50 dark:bg-red-900/10">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">Failed to load calendar</p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={fetchEvents}
              className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="border border-zinc-200 bg-zinc-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/30" />;
              }

              const dateStr = day.toDateString();
              const dayEvents = groupedEvents[dateStr] || [];
              const isToday =
                day.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] border border-zinc-200 p-2 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                    isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div
                    className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`group cursor-pointer rounded px-2 py-1 text-xs text-white transition-all hover:shadow-sm ${eventTypeColors[event.type]}`}
                        title={event.title}
                      >
                        <div className="truncate font-semibold">
                          {new Date(event.startDateTime).toLocaleTimeString(
                            'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </div>
                        <div className="truncate opacity-90 group-hover:opacity-100">{event.title}</div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events List */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">Upcoming Events</h2>
        <div className="space-y-3">
          {events
            .filter(
              (e) => new Date(e.startDateTime) >= new Date()
            )
            .slice(0, 10)
            .map((event) => (
              <div
                key={event.id}
                className="group flex items-center gap-4 rounded-lg border border-zinc-200 p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                <div
                  className={`h-12 w-1 rounded-full ${eventTypeColors[event.type]}`}
                />
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900 dark:text-white">{event.title}</div>
                  <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(event.startDateTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(event.endDateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {event.type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          {events.filter((e) => new Date(e.startDateTime) >= new Date()).length === 0 && (
            <div className="py-8 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">No upcoming events</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Schedule classes and events to see them here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
