/**
 * Rate-limited HTTP fetcher for Bulgarian legislation.
 *
 * Source: Parliament of the Republic of Bulgaria API (parliament.bg).
 * Endpoint pattern: /api/v1/act/{id}
 */

export interface ParliamentActResponse {
  L_Act_id: number;
  L_Act_sign?: string;
  L_Act_date?: string;
  L_Act_date2?: string;
  L_Act_dv_iss?: string;
  L_Act_dv_year?: number;
  L_ActL_final: string;
  L_ActL_final_body: string;
}

const USER_AGENT = 'Ansvar-Law-MCP/1.0 (real-ingestion; hello@ansvar.eu)';
const MIN_DELAY_MS = 1200;

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function applyRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_DELAY_MS) {
    await sleep(MIN_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

async function fetchJson<T>(url: string, maxRetries = 2): Promise<T> {
  await applyRateLimit();

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 1500;
        await sleep(backoffMs);
        continue;
      }
    }
  }

  throw new Error(
    `Failed to fetch JSON from ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Fetch a promulgated law by parliament act ID.
 */
export async function fetchLegislation(actId: number): Promise<ParliamentActResponse> {
  const url = `https://www.parliament.bg/api/v1/act/${actId}`;
  const payload = await fetchJson<ParliamentActResponse>(url);

  if (!payload?.L_ActL_final_body || !payload?.L_ActL_final) {
    throw new Error(`Incomplete response for act ${actId}`);
  }

  return payload;
}
