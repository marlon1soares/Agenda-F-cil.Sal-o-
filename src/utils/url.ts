/**
 * Returns the public clean application base URL for sharing with clients, salons and admins.
 * Works seamlessly across Dev preview, Cloud Run, Vercel, Localhost, or custom production domains.
 */
export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname || '/';

  // Ensure clean base URL without query strings or hashes
  let base = origin + pathname;
  if (!base.endsWith('/')) {
    base += '/';
  }
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
 * Checks if a specific action or boolean flag is present in URL
 */
export function hasUrlAction(...actionNames: string[]): boolean {
  for (const name of actionNames) {
    const val = getUrlParam(name);
    if (val !== null && val !== undefined) {
      if (val === 'true' || val === '1' || val === '' || actionNames.includes(val)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Builds a clean canonical URL with query parameters
 */
export function buildAppUrl(params: Record<string, string | number | boolean | undefined | null>): string {
  const base = getPublicAppUrl();
  const searchParams = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.set(k, String(v));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

