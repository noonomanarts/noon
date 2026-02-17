type AdminEventPayload = Record<string, unknown>;

type AdminEventListener = (payload: string) => void;
type UserEventListener = (payload: string) => void;

const listeners = new Set<AdminEventListener>();
const userListeners = new Map<string, Set<UserEventListener>>();

export function subscribeAdminEvents(listener: AdminEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAdminEvent(event: string, data: AdminEventPayload) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  listeners.forEach((listener) => listener(payload));
}

export function subscribeUserEvents(userId: string, listener: UserEventListener): () => void {
  const existing = userListeners.get(userId) ?? new Set<UserEventListener>();
  existing.add(listener);
  userListeners.set(userId, existing);

  return () => {
    const current = userListeners.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      userListeners.delete(userId);
    }
  };
}

export function emitUserEvent(userId: string, event: string, data: AdminEventPayload) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const listenersForUser = userListeners.get(userId);
  if (!listenersForUser) return;
  listenersForUser.forEach((listener) => listener(payload));
}
