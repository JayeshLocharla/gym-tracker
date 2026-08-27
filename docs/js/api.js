/**
 * Apps Script client.
 *
 * The one thing that matters here: POSTs go out as text/plain, not
 * application/json. Apps Script cannot answer a CORS preflight, and a
 * text/plain POST is a "simple request" so the browser never sends one.
 * Switch this to application/json and every write silently fails with a
 * CORS error. See apps-script/Code.gs for the other half of this.
 */

const LS_URL = 'gt.url';
const LS_TOKEN = 'gt.token';
const LS_PLAN = 'gt.plan';

export const creds = {
  get url() { return safeGet(LS_URL); },
  get token() { return safeGet(LS_TOKEN); },
  get configured() { return Boolean(this.url && this.token); },
  save(url, token) {
    safeSet(LS_URL, String(url).trim());
    safeSet(LS_TOKEN, String(token).trim());
  },
  clear() {
    safeRemove(LS_URL);
    safeRemove(LS_TOKEN);
    safeRemove(LS_PLAN);
  }
};

// localStorage throws outright in some privacy modes, so every access is guarded.
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function safeRemove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

export class ApiError extends Error {
  constructor(message, code, cause) {
    super(message);
    this.code = code;
    if (cause) this.cause = cause;
  }
}

/** One request. Retries twice on a network blip — phones drop packets in gyms. */
export async function call(action, params = {}, { retries = 2 } = {}) {
  if (!creds.configured) throw new ApiError('Not set up yet', 'SETUP');

  const payload = JSON.stringify({ action, token: creds.token, ...params });
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(creds.url, {
        method: 'POST',
        // Deliberately text/plain — see the note at the top of this file.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload,
        redirect: 'follow'
      });

      if (!res.ok) throw new ApiError(`Server returned ${res.status}`, 'HTTP');

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // Apps Script serves an HTML login page when the deployment is set to
        // anything other than "Anyone" — worth naming, it is a common misstep.
        if (text.includes('<html') || text.includes('accounts.google.com')) {
          throw new ApiError(
            'Got a Google sign-in page instead of data. Re-deploy the web app with "Who has access: Anyone".',
            'DEPLOY'
          );
        }
        throw new ApiError('Server sent something that was not JSON', 'PARSE');
      }

      if (data.ok === false) {
        throw new ApiError(
          data.code === 'AUTH' ? 'That token was rejected. Check it in Settings.' : (data.error || 'Request failed'),
          data.code || 'APP'
        );
      }
      return data;
    } catch (err) {
      lastErr = err;
      // A rejected token or a bad deployment will not fix itself on a retry.
      if (err instanceof ApiError && ['AUTH', 'DEPLOY', 'SETUP', 'PARSE'].includes(err.code)) throw err;
      if (attempt < retries) await sleep(400 * Math.pow(2, attempt));
    }
  }
  throw new ApiError(
    'Could not reach the server. Check your connection and try again.',
    'NETWORK',
    lastErr
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -- plan cache -------------------------------------------------------------
   The plan (exercises, ramp, targets, prose) barely changes. Caching it means
   the app paints instantly on open instead of waiting on a round trip, and
   still shows today's session when the signal in the gym is bad.
   Writes always need a connection — there is no offline queue by design.     */

export function cachedPlan() {
  try {
    const raw = safeGet(LS_PLAN);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function cachePlan(plan) {
  try { safeSet(LS_PLAN, JSON.stringify(plan)); } catch { /* quota — not fatal */ }
}

/** Cached plan first (instant paint), then refresh in the background. */
export async function loadPlan({ onFresh } = {}) {
  const cached = cachedPlan();
  const fetching = call('bootstrap')
    .then((plan) => {
      cachePlan(plan);
      if (onFresh) onFresh(plan);
      return plan;
    });

  if (cached) {
    fetching.catch(() => { /* stale cache is better than a blank screen */ });
    return { plan: cached, stale: true, fetching };
  }
  return { plan: await fetching, stale: false, fetching };
}
