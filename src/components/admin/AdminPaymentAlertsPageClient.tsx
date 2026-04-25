'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { PaymentAlertChannelKey, PaymentAlertSettings, PaymentAlertSourceKey } from '@/lib/paymentAlertSettings';

type PaymentAlertUser = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  profile_image?: string | null;
};

const sourceLabels: Record<PaymentAlertSourceKey, string> = {
  classBooking: 'Class bookings',
  eventBooking: 'Event bookings',
  shopOrder: 'Shop orders',
  walletTopup: 'Wallet top-ups',
};

const channelLabels: Record<PaymentAlertChannelKey, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  push: 'Push notification',
  inApp: 'In-app',
};

export default function AdminPaymentAlertsPageClient({
  initialSettings,
  users,
}: {
  initialSettings: PaymentAlertSettings;
  users: PaymentAlertUser[];
}) {
  const [settings, setSettings] = useState<PaymentAlertSettings>(initialSettings);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const haystack = [user.full_name, user.email ?? '', user.phone_number ?? '', user.role].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [search, users]);

  const selectedUsersCount = settings.recipients.length;

  const recipientMap = useMemo(
    () => new Map(settings.recipients.map((recipient) => [recipient.userId, recipient.channels])),
    [settings.recipients]
  );

  const updateSource = (source: PaymentAlertSourceKey, value: boolean) => {
    setSettings((current) => ({
      ...current,
      sources: {
        ...current.sources,
        [source]: value,
      },
    }));
  };

  const updateRecipientChannel = (userId: string, channel: PaymentAlertChannelKey, enabled: boolean) => {
    setSettings((current) => {
      const existing = current.recipients.find((recipient) => recipient.userId === userId);
      const nextChannels = {
        email: existing?.channels.email ?? false,
        whatsapp: existing?.channels.whatsapp ?? false,
        push: existing?.channels.push ?? false,
        inApp: existing?.channels.inApp ?? false,
        [channel]: enabled,
      };

      const nextRecipients = current.recipients.filter((recipient) => recipient.userId !== userId);
      if (Object.values(nextChannels).some(Boolean)) {
        nextRecipients.push({ userId, channels: nextChannels });
      }

      nextRecipients.sort((left, right) => left.userId.localeCompare(right.userId));

      return {
        ...current,
        recipients: nextRecipients,
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/payment-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; settings?: PaymentAlertSettings } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save payment alerts');
      }

      if (payload?.settings) {
        setSettings(payload.settings);
      }
      setInfo('Payment alert settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save payment alerts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Payment Alerts</h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
            Choose which users receive payment success alerts and decide which channels should be used for each person.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Global control</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Disable this switch if you want to stop all payment alerts without losing the selected recipients.
            </p>
          </div>

          <label className="inline-flex items-center gap-3 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Enable payment alerts
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Payment sources</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Pick which successful payment flows should trigger alerts.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(sourceLabels) as PaymentAlertSourceKey[]).map((source) => (
            <label
              key={source}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
            >
              <span>{sourceLabels[source]}</span>
              <input
                type="checkbox"
                checked={settings.sources[source]}
                onChange={(event) => updateSource(source, event.target.checked)}
                className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Recipients</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Any user with at least one enabled channel will receive payment alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {selectedUsersCount} selected
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="w-60 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(110px,1fr))] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400 md:grid">
            <span>User</span>
            <span>Email</span>
            <span>WhatsApp</span>
            <span>Push</span>
            <span>In-app</span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredUsers.map((user) => {
              const channels = recipientMap.get(user.id) ?? { email: false, whatsapp: false, push: false, inApp: false };
              const displayName = user.full_name?.trim() || user.email || user.phone_number || 'Unknown user';
              const userInitial = displayName.charAt(0).toUpperCase();

              return (
                <div key={user.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(110px,1fr))] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {user.profile_image ? (
                        <Image src={user.profile_image} alt={displayName} fill sizes="44px" className="object-cover" />
                      ) : (
                        userInitial
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{displayName}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.role}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email || user.phone_number || 'No contact details'}</p>
                    </div>
                  </div>

                  {(Object.keys(channelLabels) as PaymentAlertChannelKey[]).map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200 md:border-0 md:px-0 md:py-0"
                    >
                      <span className="md:hidden">{channelLabels[channel]}</span>
                      <input
                        type="checkbox"
                        checked={channels[channel]}
                        onChange={(event) => updateRecipientChannel(user.id, channel, event.target.checked)}
                        className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        aria-label={`${channelLabels[channel]} for ${displayName}`}
                      />
                    </label>
                  ))}
                </div>
              );
            })}

            {filteredUsers.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">No users matched your search.</div>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {info}
        </div>
      ) : null}
    </div>
  );
}