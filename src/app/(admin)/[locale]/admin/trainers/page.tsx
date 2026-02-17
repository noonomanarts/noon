'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Trainer {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    bio: string | null;
    expertise: string[];
    experience: number | null;
    socialLinks: Record<string, string> | null;
    isActive: boolean;
  } | null;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminTrainersPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'trainers' | 'all-users'>('trainers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTrainers(), fetchAllUsers()]);
      setLoading(false);
    };

    load();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/admin/trainers');
      if (!response.ok) {
        throw new Error('Failed to fetch trainers');
      }
      const data = await response.json();
      setTrainers(Array.isArray(data?.trainers) ? data.trainers : []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setTrainers([]);
      setFeedback({ type: 'error', message: 'Failed to load trainers list.' });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setAllUsers(Array.isArray(data) ? data : data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
      setFeedback({ type: 'error', message: 'Failed to load users list.' });
    }
  };

  const handlePromoteToTrainer = async (userId: string) => {
    try {
      setPromotingUserId(userId);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
          expertise: [],
        }),
      });

      if (response.ok) {
        await fetchTrainers();
        await fetchAllUsers();
        setShowPromoteModal(false);
        setSelectedUser(null);
        setFeedback({ type: 'success', message: 'User promoted to trainer successfully.' });
      } else {
        const payload = await response.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: typeof payload?.error === 'string' ? payload.error : 'Failed to promote user.',
        });
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      setFeedback({ type: 'error', message: 'Error promoting user to trainer.' });
    } finally {
      setPromotingUserId(null);
    }
  };

  const filteredUsers = useMemo(
    () =>
      allUsers.filter(
        (user) =>
          user.role !== 'TRAINER' &&
          (user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [allUsers, searchTerm]
  );

  const filteredTrainers = useMemo(
    () =>
      trainers.filter(
        (trainer) =>
          trainer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [trainers, searchTerm]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Trainers Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage trainers and their profiles
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setView('trainers')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === 'trainers'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Trainers ({trainers.length})
        </button>
        <button
          onClick={() => setView('all-users')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === 'all-users'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          All Users
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-500"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
          </div>
        </div>
      ) : view === 'trainers' ? (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Trainer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredTrainers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No trainers found
                    </td>
                  </tr>
                ) : (
                  filteredTrainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            {trainer.profileImage ? (
                              <img
                                src={trainer.profileImage}
                                alt={trainer.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white">
                                {trainer.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-white">
                              {trainer.fullName}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {trainer.profile?.expertise.slice(0, 2).join(', ') || 'No expertise set'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-zinc-900 dark:text-white">{trainer.email}</div>
                          <div className="text-zinc-500 dark:text-zinc-400">{trainer.phoneNumber || 'No phone'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-900 dark:text-white">
                          {trainer.profile?.experience ? `${trainer.profile.experience} years` : 'Not set'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            trainer.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {trainer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/${locale}/admin/trainers/${trainer.id}/edit`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {user.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-zinc-900 dark:text-white">{user.email}</div>
                          <div className="text-zinc-500 dark:text-zinc-400">{user.phoneNumber || 'No phone'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedUser(user.id);
                            setShowPromoteModal(true);
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Promote to Trainer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Promote to Trainer
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to promote this user to a trainer? You'll be able to edit their profile afterward.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                disabled={promotingUserId === selectedUser}
                onClick={() => handlePromoteToTrainer(selectedUser)}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promotingUserId === selectedUser ? 'Promoting...' : 'Promote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
