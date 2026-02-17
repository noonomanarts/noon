type AdminEventPayload = Record<string, unknown>;

type AdminEventListener = (payload: string) => void;

const listeners = new Set<AdminEventListener>();

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
