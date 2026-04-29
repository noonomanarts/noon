const DEFAULT_PUBLIC_SITE_URL = 'https://noonomanarts.com';

function isUsablePublicOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (!host) return false;
    if (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1' || host === '::1') {
      return false;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (!host.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

export function getPublicSiteBaseUrl(requestOrigin?: string | null): string {
  const envCandidates = [
    process.env.PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];

  for (const candidate of envCandidates) {
    const normalized = candidate?.trim();
    if (normalized && isUsablePublicOrigin(normalized)) {
      return normalized.replace(/\/$/, '');
    }
  }

  if (isUsablePublicOrigin(requestOrigin)) {
    return (requestOrigin as string).replace(/\/$/, '');
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

export function buildPublicSiteUrl(path: string, requestOrigin?: string | null): string {
  const base = getPublicSiteBaseUrl(requestOrigin);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}