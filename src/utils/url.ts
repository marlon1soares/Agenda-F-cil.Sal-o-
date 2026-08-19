export const DEFAULT_PRODUCTION_URL = 'https://agenda-f-cil-sal-o.vercel.app';

/**
 * Returns the public clean application base URL for sharing with clients, salons and admins.
 * Automatically resolves to the production Vercel URL (https://agenda-f-cil-sal-o.vercel.app)
 * when running inside dev/preview environments or when configured, ensuring shared links
 * can be opened by anyone on WhatsApp, Instagram, or external devices without 404 errors.
 */
export function getPublicAppUrl(forceProductionVercel = false): string {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTION_URL + '/';

  if (forceProductionVercel) {
    return DEFAULT_PRODUCTION_URL + '/';
  }

  // 1. Check if custom production URL was explicitly set by user/admin
  try {
    const custom = localStorage.getItem('salaoCustomProductionUrl');
    if (custom && custom.trim().startsWith('http')) {
      let trimmed = custom.trim();
      if (!trimmed.endsWith('/')) trimmed += '/';
      return trimmed;
    }
  } catch {}

  // 2. Use current active domain/origin so Computer <-> Mobile connect to the same live sync server
  const origin = window.location.origin;
  const pathname = window.location.pathname || '/';
  let base = origin + pathname;
  if (!base.endsWith('/')) base += '/';
  return base;
}

/**
 * Extracts a query or hash parameter safely from the current window location.
 * Checks both standard query search (?key=val) and hash routing (#/?key=val or #key=val).
 */
export function getUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check standard query search string
    const searchParams = new URLSearchParams(window.location.search);
    const searchVal = searchParams.get(key);
    if (searchVal !== null && searchVal !== undefined) {
      return searchVal;
    }

    // 2. Check hash if present (e.g. #/?role=cliente or #role=cliente)
    if (window.location.hash) {
      const hash = window.location.hash;
      const qIdx = hash.indexOf('?');
      if (qIdx !== -1) {
        const hashParams = new URLSearchParams(hash.substring(qIdx));
        const hashVal = hashParams.get(key);
        if (hashVal !== null && hashVal !== undefined) {
          return hashVal;
        }
      } else {
        // e.g. #role=cliente&salon=parcas
        const cleanHash = hash.replace(/^#\/?/, '');
        const hashParams = new URLSearchParams(cleanHash);
        const hashVal = hashParams.get(key);
        if (hashVal !== null && hashVal !== undefined) {
          return hashVal;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading URL param:', key, err);
  }

  return null;
}

/**
 * Checks if a specific action or boolean flag is present in URL.
 * Checks ?action=val, ?acao=val, ?act=val, ?modal=..., ?tab=..., ?role=..., direct boolean flags like ?comprar-licenca,
 * as well as window.location.hash and window.location.pathname.
 */
export function hasUrlAction(...actionNames: string[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const rawSearch = window.location.search.toLowerCase();
    const rawHash = window.location.hash.toLowerCase();
    const rawPath = window.location.pathname.toLowerCase();

    // 1. Direct sub-string check in search or hash
    for (const name of actionNames) {
      const lowerName = name.toLowerCase();
      if (rawSearch.includes(lowerName) || rawHash.includes(lowerName) || rawPath.includes(lowerName)) {
        return true;
      }
    }

    // 2. Check standard URLSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const actionKeys = ['action', 'acao', 'act', 'modal', 'tab', 'open', 'view', 'page', 'role', 'p', 'comprar'];
    for (const key of actionKeys) {
      const val = searchParams.get(key);
      if (val) {
        const lower = val.toLowerCase().trim();
        if (actionNames.some(a => a.toLowerCase() === lower || lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower))) {
          return true;
        }
      }
    }

    // 3. Check direct parameter flags
    for (const name of actionNames) {
      if (searchParams.has(name)) {
        return true;
      }
      const val = getUrlParam(name);
      if (val !== null && val !== undefined) {
        if (val === 'true' || val === '1' || val === '' || actionNames.some(a => a.toLowerCase() === val.toLowerCase())) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('Error in hasUrlAction:', err);
  }

  return false;
}

/**
 * Builds a clean canonical URL with query parameters
 */
export function buildAppUrl(
  params: Record<string, string | number | boolean | undefined | null>,
  baseUrl?: string
): string {
  const base = baseUrl || getPublicAppUrl();
  const searchParams = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.set(k, String(v));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

