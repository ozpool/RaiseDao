import { API_BASE_URL } from './config';

/** The session claims the API derives from the bearer token. */
export interface Session {
  address: string;
  roles: string[];
}

/** What `/auth/verify` returns: the session plus the JWT to store. */
export interface VerifyResult extends Session {
  token: string;
}

/** A non-2xx response, carrying the status and the API's `{ error }` message so
 *  callers can branch on it (e.g. 401 → re-challenge) without re-parsing. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Bearer token for authenticated endpoints; omit for public ones. */
  token?: string;
}

/** One typed fetch wrapper for every call: JSON in/out, bearer auth when given,
 *  and a thrown ApiError (never a silent failure) on any non-2xx. */
async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Typed client, grouped by domain. Public calls take no token; authenticated
 *  ones take the JWT the auth store holds. */
export const api = {
  auth: {
    nonce: (address: string) =>
      apiFetch<{ nonce: string }>('/auth/nonce', { method: 'POST', body: { address } }),
    verify: (message: string, signature: string) =>
      apiFetch<VerifyResult>('/auth/verify', { method: 'POST', body: { message, signature } }),
    me: (token: string) => apiFetch<Session>('/auth/me', { token }),
  },
  drafts: {
    create: (input: DraftPayload, token: string) =>
      apiFetch<DraftRecord>('/drafts', { method: 'POST', body: input, token }),
  },
};

/** The draft payload the create wizard sends (percent already converted to bps). */
export interface DraftPayload {
  title: string;
  summary: string;
  raiseTarget: string;
  fundingDurationDays: number;
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  milestones: { title: string; pctBps: number }[];
}

/** A saved draft as returned by the API. */
export interface DraftRecord extends DraftPayload {
  id: string;
  founder: string;
  status: 'draft';
}
