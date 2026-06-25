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
  // FormData carries its own multipart boundary, so we must NOT set
  // Content-Type ourselves (the browser appends the boundary) nor JSON-encode it.
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
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
  campaigns: {
    list: (filters: CampaignFilters = {}) => {
      const qs = new URLSearchParams();
      if (filters.q) qs.set('q', filters.q);
      if (filters.city) qs.set('city', filters.city);
      if (filters.category) qs.set('category', filters.category);
      if (filters.status) qs.set('status', filters.status);
      if (filters.verified) qs.set('verified', 'true');
      const suffix = qs.toString() ? `?${qs}` : '';
      return apiFetch<{ campaigns: CampaignSummary[] }>(`/campaigns${suffix}`);
    },
    get: (vault: string) => apiFetch<CampaignDetail>(`/campaigns/${vault}`),
    create: (input: CampaignCreatePayload, token: string) =>
      apiFetch<CampaignDetail>('/campaigns', { method: 'POST', body: input, token }),
  },
  evidence: {
    list: (campaignId: number) =>
      apiFetch<{ evidence: EvidenceRecord[] }>(`/evidence?campaignId=${campaignId}`),
    upload: (input: EvidenceUploadInput, token: string) => {
      const form = new FormData();
      form.append('file', input.file);
      form.append('campaignId', String(input.campaignId));
      form.append('milestoneIndex', String(input.milestoneIndex));
      return apiFetch<EvidencePinResult>('/evidence', { method: 'POST', body: form, token });
    },
  },
};

export interface CampaignFilters {
  q?: string;
  city?: string;
  category?: string;
  status?: string;
  verified?: boolean;
}

/** A campaign card's data from the browse endpoint. */
export interface CampaignSummary {
  campaignId: number;
  vault: string;
  founder: string;
  status: string;
  title: string;
  summary: string;
  city: string;
  category: string;
  verified: boolean;
  featured: boolean;
  demo: boolean;
  raiseTarget: string;
  totalRaised: string;
  fundingDeadline: number;
  milestoneCount: number;
}

export interface CampaignMilestone {
  index: number;
  pctBps: number;
  status: string;
  deadline: number;
}

/** Full campaign for the detail page. */
export interface CampaignDetail extends CampaignSummary {
  token: string;
  governor: string;
  milestones: CampaignMilestone[];
}

/** What the founder's client posts to persist a freshly-deployed campaign (#27):
 *  the on-chain addresses from the deploy receipt plus the draft's display
 *  metadata. The API sets founder from the session; the indexer (#30) later
 *  reconciles the financials. */
export interface CampaignCreatePayload {
  campaignId: number;
  vault: string;
  token: string;
  governor: string;
  title: string;
  summary: string;
  raiseTarget: string;
  fundingDeadline: number;
  milestones: { pctBps: number; deadline: number }[];
}

/** One pinned milestone-evidence file as the investor-facing list returns it. */
export interface EvidenceRecord {
  campaignId: number;
  milestoneIndex: number;
  cid: string;
  provider: string;
  filename: string;
  size: number;
  uploadedBy: string;
  createdAt?: string;
}

/** Result of a successful pin (#28): the CID is the durable handle a later
 *  on-chain proposal (#29) references. */
export interface EvidencePinResult {
  cid: string;
  provider: string;
  campaignId: number;
  milestoneIndex: number;
}

/** What the founder's client sends to pin a file against a milestone. */
export interface EvidenceUploadInput {
  file: File;
  campaignId: number;
  milestoneIndex: number;
}

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
