/**
 * Returns the public clean application base URL for sharing with clients, salons and admins.
 * Works seamlessly across Vercel, Cloud Run, Localhost, or custom production domains.
 */
export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;

  // In Google Cloud Run / AIS Dev preview, convert ais-dev- to ais-pre- for public link sharing
  if (origin.includes('ais-dev-')) {
    return (origin + pathname).replace('ais-dev-', 'ais-pre-');
  }

  // Normal hosting (Vercel, Netlify, Custom Domain, etc.)
  return origin + pathname;
}
