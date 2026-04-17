export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type User = {
  id: string;
  email: string;
  name: string;
  tier: string;
  is_admin?: boolean;
  country_code?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  preferred_radius_km?: number;
  cross_border_enabled?: boolean;
  auth_methods?: string[];
};

export type AuthProviders = {
  email_password: boolean;
  google: boolean;
};

export type SearchSpec = {
  ID: number;
  UserID?: string;
  ProfileID?: number;
  Name: string;
  Query: string;
  MarketplaceID: string;
  CountryCode?: string;
  City?: string;
  PostalCode?: string;
  RadiusKm?: number;
  CategoryID: number;
  MaxPrice: number;
  MinPrice: number;
  Condition: string[];
  OfferPercentage: number;
  AutoMessage: boolean;
  MessageTemplate: string;
  Attributes?: Record<string, string>;
  Enabled: boolean;
  CheckInterval?: string | number;
  PriorityClass?: number;
  NextRunAt?: string;
  LastRunAt?: string;
  LastSignalAt?: string;
  ConsecutiveEmptyRuns?: number;
  ConsecutiveFailures?: number;
};

export type RecommendedAction = 'buy' | 'negotiate' | 'ask_seller' | 'skip';

// MustHaveStatus is the EXHAUSTIVE set of per-must-have match statuses emitted
// by the backend scorer (XOL-18, v0.8). Any other value is invalid envelope
// data; presenter falls through to the "unknown" visual.
export type MustHaveStatus = 'met' | 'missed' | 'unknown';

// MustHave is one entry in the `MustHaves` array on a scored listing. The
// backend emits PascalCase keys directly; do not remap.
export type MustHave = {
  Text: string;
  Status: MustHaveStatus;
};

export type Listing = {
  ItemID: string;
  ProfileID?: number;
  Title: string;
  Price: number;
  PriceType?: string;
  Condition?: string;
  URL?: string;
  ImageURLs?: string[];
  MarketplaceID?: string;
  Score?: number;
  FairPrice?: number;
  OfferPrice?: number;
  Confidence?: number;
  Reason?: string;
  RiskFlags?: string[];
  // RecommendedAction is the backend-emitted 4-way verdict (XOL-11).
  // Kept optional + widened to string for backward-compat on old cached
  // responses; renderer defaults unknown/missing values to `ask_seller`.
  RecommendedAction?: RecommendedAction | string;
  // ComparablesCount is the number of comparable deals the scorer consulted
  // when producing the verdict (XOL-16, v0.8). Emitted directly by the Go
  // backend as PascalCase `ComparablesCount`. Optional — older cached
  // responses may omit it; renderer treats missing as 0 (hide chip).
  ComparablesCount?: number;
  // ComparablesMedianAgeDays is the median age in days of the comparable
  // deals used by the scorer (XOL-16, v0.8). 0 when no comparables had a
  // valid LastSeen timestamp. Renderer caps display at "365d+".
  ComparablesMedianAgeDays?: number;
  // MustHaves is the per-must-have match status array emitted by the backend
  // scorer (XOL-18, v0.8). Empty array when the mission has no RequiredFeatures.
  // Optional on the type for backward-compat with older cached responses;
  // renderer coalesces missing/null to `[]` (chip row hidden).
  MustHaves?: MustHave[];
  // CurrencyStatus signals how the Price field reached its EUR-cents value.
  // Emitted by the backend on the /matches envelope (PascalCase from Go).
  // Wire values:
  //   "eur_native"          — listing was scraped in EUR; no conversion
  //   "converted_from_bgn"  — OLX BG listing converted BGN → EUR at ingest
  //   "unknown"             — backend couldn't determine (defensive)
  //   ""                    — field absent on pre-M2 rows or non-OLX markets
  // Renderer uses "converted_from_bgn" to show an "≈ from BGN" caption.
  CurrencyStatus?: 'eur_native' | 'converted_from_bgn' | 'unknown' | '';
  Feedback?: '' | 'approved' | 'dismissed';
};

export type MatchFeedbackAction = 'approve' | 'dismiss' | 'clear';

export type MatchesPage = {
  items: Listing[];
  limit: number;
  offset: number;
  total: number;
};

export type MatchesSort = 'newest' | 'score' | 'price_asc' | 'price_desc';
export type MatchesMarket = 'all' | 'marktplaats' | 'vinted_nl' | 'vinted_dk' | 'olxbg';
export type MatchesCondition = 'all' | 'new' | 'like_new' | 'good' | 'fair';

export type MatchesListParams = {
  limit: number;
  offset: number;
  mission_id?: number;
  sort?: MatchesSort;
  market?: MatchesMarket;
  condition?: MatchesCondition;
  min_score?: number;
};

export type Mission = {
  ID?: number;
  UserID?: string;
  Name: string;
  TargetQuery?: string;
  CategoryID?: number;
  BudgetMax?: number;
  BudgetStretch?: number;
  PreferredCondition?: string[];
  RequiredFeatures?: string[];
  NiceToHave?: string[];
  SearchQueries?: string[];
  Status?: 'active' | 'paused' | 'completed';
  Urgency?: 'urgent' | 'flexible' | 'no-rush';
  AvoidFlags?: string[];
  TravelRadius?: number;
  CountryCode?: string;
  Region?: string;
  City?: string;
  PostalCode?: string;
  CrossBorderEnabled?: boolean;
  MarketplaceScope?: string[];
  Category?: 'phone' | 'laptop' | 'camera' | 'other' | string;
  Active?: boolean;
  MatchCount?: number;
  LastMatchAt?: string;
};

export type ShoppingProfile = Mission;

export type AssistantSession = {
  UserID: string;
  PendingIntent: string;
  PendingQuestion: string;
  DraftMission?: Mission | null;
  LastAssistantMsg: string;
  UpdatedAt?: string;
};

export type Recommendation = {
  Listing: Listing;
  Mission?: Mission;
  Label: string;
  Verdict: string;
  Concerns: string[];
  NextQuestions?: string[];
  SuggestedOffer?: number;
  Scored?: {
    Score: number;
    FairPrice: number;
    OfferPrice: number;
    Confidence?: number;
  };
};

export type ShortlistEntry = {
  ID: number;
  MissionID?: number;
  ItemID: string;
  Title: string;
  URL: string;
  RecommendationLabel: string;
  RecommendationScore: number;
  AskPrice: number;
  FairPrice: number;
  Verdict: string;
  Concerns: string[];
  SuggestedQuestions: string[];
  Status: string;
};

export type AssistantReply = {
  Message: string;
  Expecting: boolean;
  Intent?: string;
  Mission?: Mission | null;
  Recommendations?: Recommendation[];
};

// Marketplace enum / country wiring lives in `./marketplace` so pure
// presenters can import it from the Node --test harness without pulling
// in the whole /api.ts surface. Re-exported here for backward compatibility
// with existing callers (`import { MARKETPLACE_OPTIONS } from '../lib/api'`).
export type { MarketplaceOption } from './marketplace';
export {
  SUPPORTED_COUNTRIES,
  MARKETPLACE_OPTIONS,
  marketplaceCandidates,
  marketplaceCountryCode,
} from './marketplace';

type ErrorPayload = {
  error?: string;
  message?: string;
  detail?: string;
};

export function clearToken() {
  // Cookie-based auth: no local token state to clear.
}

async function normalizeApiError(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await res.json()) as ErrorPayload;
      return payload.error || payload.message || payload.detail || fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const text = (await res.text()).trim();
    if (!text) return fallback;
    try {
      const payload = JSON.parse(text) as ErrorPayload;
      return payload.error || payload.message || payload.detail || text;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

async function rawFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers || {});
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res = await rawFetch(path, options);
  if (
    res.status === 401 &&
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    path !== '/auth/register'
  ) {
    const refreshRes = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refreshRes.ok) {
      res = await rawFetch(path, options);
    }
  }
  if (!res.ok) {
    throw new Error(await normalizeApiError(res));
  }
  return res.json();
}

export const api = {
  auth: {
    providers: async () => apiFetch<AuthProviders>('/auth/providers'),
    googleStart: (returnTo = '/missions') =>
      `${API_BASE}/auth/google/start?return_to=${encodeURIComponent(returnTo)}`,
    login: async (email: string, password: string) => {
      const response = await apiFetch<{ access_token: string; refresh_token?: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      return response;
    },
    register: async (email: string, password: string, name: string) => {
      const response = await apiFetch<{ access_token: string; refresh_token?: string; user: User }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        },
      );
      return response;
    },
    me: async () => apiFetch<User>('/users/me'),
    refresh: async () => {
      const response = await apiFetch<{ access_token: string; refresh_token?: string; user: User }>(
        '/auth/refresh',
        { method: 'POST' },
      );
      return response;
    },
    logout: async () => {
      const response = await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
      clearToken();
      return response;
    },
  },
  users: {
    update: async (user: Partial<User>) =>
      apiFetch<User>('/users/me', { method: 'PUT', body: JSON.stringify(user) }),
  },
  searches: {
    list: async () => apiFetch<{ searches: SearchSpec[] }>('/searches'),
    create: async (spec: Partial<SearchSpec>) =>
      apiFetch<SearchSpec>('/searches', { method: 'POST', body: JSON.stringify(spec) }),
    update: async (id: number, spec: Partial<SearchSpec>) =>
      apiFetch<{ ok: boolean }>(`/searches/${id}`, { method: 'PUT', body: JSON.stringify(spec) }),
    delete: async (id: number) =>
      apiFetch<{ ok: boolean }>(`/searches/${id}`, { method: 'DELETE' }),
    run: async (id: number) =>
      apiFetch<{ ok: boolean; message: string }>(`/searches/${id}/run`, { method: 'POST' }),
    runAll: async () =>
      apiFetch<{ ok: boolean; message: string }>('/searches/run', { method: 'POST' }),
    generate: async (topic: string) =>
      apiFetch<{ searches: Array<Record<string, unknown>>; warning?: string }>(
        '/searches/generate',
        {
          method: 'POST',
          body: JSON.stringify({ topic }),
        },
      ),
  },
  listings: {
    feed: async (missionID?: number) => {
      const query = missionID && missionID > 0 ? `?mission_id=${missionID}` : '';
      return apiFetch<{ listings: Listing[]; user_id: string }>(`/listings/feed${query}`);
    },
  },
  matches: {
    list: async ({
      limit,
      offset,
      mission_id,
      sort,
      market,
      condition,
      min_score,
    }: MatchesListParams) => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (mission_id && mission_id > 0) params.set('mission_id', String(mission_id));
      // Defaults-omission rule: only emit a filter param when it differs from
      // the backend default (sort=newest, market=all, condition=all,
      // min_score=0). Keeps the "no filter touched" request footprint
      // byte-identical to the Phase 2 baseline.
      if (sort && sort !== 'newest') params.set('sort', sort);
      if (market && market !== 'all') params.set('market', market);
      if (condition && condition !== 'all') params.set('condition', condition);
      if (typeof min_score === 'number' && min_score > 0) {
        params.set('min_score', String(min_score));
      }
      return apiFetch<MatchesPage>(`/matches?${params.toString()}`);
    },
    feedback: async (itemID: string, action: MatchFeedbackAction) =>
      apiFetch<{ ok: boolean; feedback: string }>('/matches/feedback', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemID, action }),
      }),
    analyze: async (url: string, missionID?: number) =>
      apiFetch<{
        listing: Listing;
        reasoning_source: string;
        search_advice: string;
        comparables?: Array<{
          ItemID: string;
          Title: string;
          Price: number;
          Similarity: number;
          MatchReason: string;
        }>;
        market_average: number;
      }>('/matches/analyze', {
        method: 'POST',
        body: JSON.stringify({ url, mission_id: missionID && missionID > 0 ? missionID : 0 }),
      }),
  },
  missions: {
    list: async () => apiFetch<{ missions: Mission[] }>('/missions'),
    create: async (mission: Partial<Mission>) =>
      apiFetch<Mission>('/missions', { method: 'POST', body: JSON.stringify(mission) }),
    get: async (id: number) => apiFetch<Mission>(`/missions/${id}`),
    update: async (id: number, mission: Partial<Mission>) =>
      apiFetch<Mission>(`/missions/${id}`, { method: 'PUT', body: JSON.stringify(mission) }),
    updateStatus: async (id: number, status: 'active' | 'paused' | 'completed') =>
      apiFetch<Mission>(`/missions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    delete: async (id: number) =>
      apiFetch<{ ok: boolean }>(`/missions/${id}`, { method: 'DELETE' }),
    matches: async (id: number, params?: { limit?: number }) => {
      const limit = params?.limit ? `?limit=${params.limit}` : '';
      return apiFetch<{ mission: Mission; listings: Listing[] }>(`/missions/${id}/matches${limit}`);
    },
  },
  shortlist: {
    get: async () => apiFetch<{ shortlist: ShortlistEntry[] }>('/shortlist'),
    add: async (itemID: string) =>
      apiFetch<ShortlistEntry>(`/shortlist/${itemID}`, { method: 'POST' }),
    remove: async (itemID: string) =>
      apiFetch<{ ok: boolean }>(`/shortlist/${itemID}`, { method: 'DELETE' }),
    draftOffer: async (itemID: string) =>
      apiFetch<{ Content: string; ItemID: string }>(
        `/shortlist/${encodeURIComponent(itemID)}/draft`,
        { method: 'POST' },
      ),
  },
  assistant: {
    converse: async (message: string) =>
      apiFetch<AssistantReply>('/assistant/converse', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    session: async () => apiFetch<{ session: AssistantSession | null }>('/assistant/session'),
  },
  billing: {
    createCheckout: async (priceID: string) =>
      apiFetch<{ url: string; id: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ price_id: priceID }),
      }),
    portal: async () => apiFetch<{ url: string }>('/billing/portal'),
  },
  admin: {
    stats: async (days = 30) =>
      apiFetch<{ stats: AdminAIStats; days: number }>(`/admin/stats?days=${days}`),
    users: async () => apiFetch<{ users: AdminUser[] }>('/admin/users'),
    usage: async (days = 7) =>
      apiFetch<{ entries: AdminUsageEntry[]; days: number }>(`/admin/usage?days=${days}`),
  },
};

export type AdminAIStats = {
  TotalCalls: number;
  TotalTokens: number;
  TotalPrompt: number;
  TotalCompletion: number;
  FailedCalls: number;
  EstimatedCostUSD: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  tier: string;
  is_admin: boolean;
  created_at: string;
  mission_count: number;
  search_count: number;
  ai_call_count: number;
  ai_tokens: number;
};

export type AdminUsageEntry = {
  ID: number;
  UserID: string;
  CallType: string;
  Model: string;
  PromptTokens: number;
  CompletionTokens: number;
  TotalTokens: number;
  LatencyMs: number;
  Success: boolean;
  ErrorMsg: string;
  CreatedAt: string;
};
