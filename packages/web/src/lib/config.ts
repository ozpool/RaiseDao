/** Web runtime config. Only NEXT_PUBLIC_* vars reach the browser, so the API
 *  base URL is inlined at build time with a dev-friendly default. The SIWE
 *  domain/uri are derived from window.location at sign-in (see lib/siwe), so
 *  they always match wherever the app is served — no extra env to keep in sync. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
