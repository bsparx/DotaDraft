import { HERO_ID_LIST, HERO_IDS } from "./heroIds";

const STRATZ_API_URL = "https://api.stratz.com/graphql";

const QUERY = `
query GetHeroVsHeroMatchup($heroId: Short!) {
  heroStats {
    heroVsHeroMatchup(
      heroId: $heroId
      take: 130
      bracketBasicIds: [DIVINE_IMMORTAL]
    ) {
      disadvantage {
        heroId
        vs {
          heroId2
          synergy
          winsAverage
        }
      }
    }
  }
}
`;

const MAX_RETRIES = 10;
const MIN_REQUEST_GAP_MS = 260; // ~3.8 req/s, under the 4 req/s limit

let lastRequestAt = 0;

function apiKey() {
  const raw = process.env.STRATZ_API_KEY;
  if (!raw) throw new Error("STRATZ_API_KEY is not set");
  // Tolerate the value already containing the "Bearer " prefix, so the
  // request header doesn't end up as "Bearer Bearer <token>".
  return raw.replace(/^\s*Bearer\s+/i, "").trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enforceGap() {
  const elapsed = Date.now() - lastRequestAt;
  const wait = MIN_REQUEST_GAP_MS - elapsed;
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function isRateLimited(status: number, body: unknown): boolean {
  if (status === 429) return true;
  if (Array.isArray((body as { errors?: unknown })?.errors)) {
    const message = JSON.stringify((body as { errors: unknown[] }).errors);
    if (/rate limit|too many request|429/i.test(message)) return true;
  }
  return false;
}

interface MatchupVs {
  heroId2: number;
  synergy: number;
  winsAverage: number;
}
interface DisadvantageEntry {
  heroId: number;
  vs: MatchupVs[];
}

async function fetchHeroCounters(heroId: number): Promise<DisadvantageEntry[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await enforceGap();

    let response: Response;
    try {
      response = await fetch(STRATZ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
          "User-Agent": "STRATZ_API",
        },
        body: JSON.stringify({ query: QUERY, variables: { heroId } }),
      });
    } catch (err) {
      lastError = err;
      await sleep(1000 + Math.floor(Math.random() * 4000));
      continue;
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON response (e.g. a Cloudflare challenge page). Don't retry on
      // hard blocks; surface a descriptive error instead of a bare status code.
      if (!response.ok) {
        lastError =
          response.status === 403
            ? new Error(
                `HTTP 403 from STRATZ — likely Cloudflare bot protection blocking the request IP. ` +
                  `If this persists, run from a different network/Vercel. The API key is not the issue.`,
              )
            : new Error(`HTTP error: ${response.status}`);
        if (isRateLimited(response.status, null)) {
          await sleep(1000 + Math.floor(Math.random() * 4000));
          continue;
        }
        break;
      }
      lastError = new Error(`Non-JSON response with status 200`);
      continue;
    }

    if (isRateLimited(response.status, body)) {
      lastError = new Error("Rate limited");
      await sleep(1000 + Math.floor(Math.random() * 4000));
      continue;
    }

    const json = body as { errors?: unknown[]; data?: unknown };
    if (json.errors) {
      lastError = new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
      break;
    }

    const data = json.data as
      | { heroStats?: { heroVsHeroMatchup?: { disadvantage?: DisadvantageEntry[] } } }
      | undefined;
    const disadvantage = data?.heroStats?.heroVsHeroMatchup?.disadvantage;
    return disadvantage ?? [];
  }

  throw lastError ?? new Error(`Failed to fetch counters for hero ${heroId}`);
}

export interface IngestResult {
  fetched: number;
  failed: number;
  updatedAt: string;
  matchups: Record<string, DisadvantageEntry[]>;
}

export async function ingestAllMatchups(): Promise<IngestResult> {
  const results: Record<string, DisadvantageEntry[]> = {};
  let fetched = 0;
  let failed = 0;
  const total = HERO_ID_LIST.length;

  console.log(`[ingest] Starting for ${total} heroes...`);

  for (let i = 0; i < HERO_ID_LIST.length; i++) {
    const id = HERO_ID_LIST[i];
    const name = HERO_IDS[id];
    try {
      results[name] = await fetchHeroCounters(id);
      fetched++;
      console.log(`[ingest] ${i + 1}/${total} ✓ ${name} (${id})`);
    } catch (err) {
      failed++;
      console.error(`[ingest] ${i + 1}/${total} ✗ ${name} (${id}):`, (err as Error).message);
    }
  }

  console.log(`[ingest] Done — fetched=${fetched} failed=${failed}`);

  return {
    fetched,
    failed,
    updatedAt: new Date().toISOString(),
    matchups: results,
  };
}