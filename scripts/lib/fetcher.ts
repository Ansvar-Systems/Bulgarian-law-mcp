/**
 * Rate-limited HTTP fetchers for Bulgarian legislation from parliament.bg.
 *
 * Official endpoints used:
 * - /api/v1/archive-list/bg/L_Acts_fn/1/0
 * - /api/v1/archive-period/bg/L_Acts_fn/{year}/{month}/1/0
 * - /api/v1/act/{id}
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

export interface ArchiveMonth {
  t_month: number;
  C_18n_value?: string;
}

export interface ArchiveYear {
  t_year: number;
  t_month_list: ArchiveMonth[];
}

export interface ArchiveLawEntry {
  t_id: number;
  t_date: string;
  t_label: string;
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
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await applyRateLimit();

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
 * Fetch archive year/month index for promulgated laws.
 */
export async function fetchArchiveYears(): Promise<ArchiveYear[]> {
  return fetchJson<ArchiveYear[]>('https://www.parliament.bg/api/v1/archive-list/bg/L_Acts_fn/1/0');
}

/**
 * Fetch all promulgated law entries for one year/month bucket.
 */
export async function fetchArchivePeriod(year: number, month: number): Promise<ArchiveLawEntry[]> {
  const url = `https://www.parliament.bg/api/v1/archive-period/bg/L_Acts_fn/${year}/${month}/1/0`;
  return fetchJson<ArchiveLawEntry[]>(url);
}

/**
 * Fetch one promulgated law by parliament act ID.
 */
export async function fetchLegislation(actId: number): Promise<ParliamentActResponse> {
  const url = `https://www.parliament.bg/api/v1/act/${actId}`;
  const payload = await fetchJson<ParliamentActResponse>(url);

  if (!payload?.L_ActL_final_body || !payload?.L_ActL_final) {
    throw new Error(`Incomplete response for act ${actId}`);
  }

  return payload;
}
