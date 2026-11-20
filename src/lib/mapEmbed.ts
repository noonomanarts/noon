/**
 * Turn whatever map link an admin pasted into something an <iframe> can show.
 *
 * Google only allows its dedicated embed URLs inside a frame. A normal share
 * link (maps.app.goo.gl/..., google.com/maps/place/...) answers with
 * X-Frame-Options and the frame stays blank, which is what happened on the
 * contact page. Share links are resolved here (server side) to the place's
 * coordinates and rewritten to the keyless embed form.
 */

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);
const RESOLVE_TIMEOUT_MS = 4000;
const MAX_REDIRECTS = 5;
const SUCCESS_TTL_MS = 12 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { value: string; expiresAt: number }>();

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isGoogleHost(hostname: string): boolean {
  return hostname === "google.com" || hostname.endsWith(".google.com") || SHORT_LINK_HOSTS.has(hostname);
}

function isAlreadyEmbeddable(url: URL): boolean {
  if (url.hostname.endsWith("google.com")) {
    return url.pathname.startsWith("/maps/embed") || url.searchParams.get("output") === "embed";
  }
  return true; // another provider's embed URL: use as given
}

/** Follow a share link's redirects, never leaving Google's own hosts. */
async function expandShortLink(start: URL): Promise<URL | null> {
  let current = start;
  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    if (!SHORT_LINK_HOSTS.has(current.hostname)) return current;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; map-link-resolver)" },
      });
      const location = response.headers.get("location");
      if (!location) return null;
      const next = parseHttpsUrl(new URL(location, current).toString());
      if (!next || !isGoogleHost(next.hostname)) return null;
      current = next;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return SHORT_LINK_HOSTS.has(current.hostname) ? null : current;
}

function buildEmbedFromGoogleUrl(url: URL, language: string): string | null {
  const full = decodeURIComponent(url.pathname + url.search);

  // "!3d<lat>!4d<lng>" is the pin itself; "@lat,lng" is only the camera centre.
  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const camera = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coordinates = pin ?? camera;

  let query: string | null = null;
  if (coordinates) {
    query = `${coordinates[1]},${coordinates[2]}`;
  } else {
    const fromParams = url.searchParams.get("q") ?? url.searchParams.get("query");
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
    query = fromParams?.trim() || (place ? decodeURIComponent(place[1]).replace(/\+/g, " ") : null);
  }
  if (!query) return null;

  const params = new URLSearchParams({ q: query, z: "16", hl: language, output: "embed" });
  return `https://www.google.com/maps?${params.toString()}`;
}

/**
 * Returns an iframe-safe map URL, or "" when the link cannot be embedded
 * (the page then shows only the "open map" button).
 */
export async function resolveMapEmbedUrl(rawUrl: string | null | undefined, language = "en"): Promise<string> {
  const raw = (rawUrl ?? "").trim();
  if (!raw) return "";

  const cacheKey = `${language}|${raw}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const remember = (value: string) => {
    cache.set(cacheKey, { value, expiresAt: Date.now() + (value ? SUCCESS_TTL_MS : FAILURE_TTL_MS) });
    return value;
  };

  const url = parseHttpsUrl(raw);
  if (!url) return remember("");

  if (!isGoogleHost(url.hostname)) return remember(raw);
  if (!SHORT_LINK_HOSTS.has(url.hostname) && isAlreadyEmbeddable(url)) return remember(raw);

  const expanded = SHORT_LINK_HOSTS.has(url.hostname) ? await expandShortLink(url) : url;
  if (!expanded) return remember("");

  return remember(buildEmbedFromGoogleUrl(expanded, language) ?? "");
}
