import { HERO_IDS, HERO_ATTRS } from "./heroIds";

export interface MatchupVs {
  heroId2: number;
  synergy: number;
  winsAverage: number;
}

interface DisadvantageEntry {
  heroId: number;
  vs: MatchupVs[];
}

// Parsed shape of the JSON stored in the database.
export interface StoredMatchups {
  fetched: number;
  failed: number;
  updatedAt: string;
  matchups: Record<string, DisadvantageEntry[]>;
}

// heroId -> opponentHeroId -> { synergy, winsAverage }
export type MatchupIndex = Map<number, Map<number, MatchupVs>>;

export interface ScoredCandidate {
  heroId: number;
  name: string;
  attr: string;
  total: number;
  synergy: number;
  synergyNorm: number;
  winrate: number;
  winrateNorm: number;
}

export interface ScoreOptions {
  /** 0..100 — weight given to synergy; winrate gets the remainder. 0 = winrate only. */
  synergyWeight: number;
}

export type Priority = "normal" | "important" | "less";
export type PriorityMap = Map<number, Priority>;

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  normal: 1,
  important: 2,
  less: 0.5,
};

export const PRIORITY_CYCLE: Priority[] = ["normal", "important", "less"];

const SYNERGY_SCALE = 10; // raw synergy swings roughly ±15; /10 lands it near ±1

export function buildIndex(stored: StoredMatchups): MatchupIndex {
  const index: MatchupIndex = new Map();
  for (const [, entries] of Object.entries(stored.matchups)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const heroId = entry.heroId;
      if (typeof heroId !== "number") continue;
      const inner: Map<number, MatchupVs> = new Map();
      for (const m of entry.vs ?? []) {
        if (typeof m.heroId2 === "number") inner.set(m.heroId2, m);
      }
      index.set(heroId, inner);
    }
  }
  return index;
}

function weightedMean(vals: number[], weights: number[]): number {
  if (vals.length === 0) return 0;
  let s = 0, wSum = 0;
  for (let i = 0; i < vals.length; i++) {
    s += vals[i] * weights[i];
    wSum += weights[i];
  }
  return wSum > 0 ? s / wSum : 0;
}

function priorityWeight(id: number, priorities?: PriorityMap): number {
  if (!priorities) return 1;
  return PRIORITY_WEIGHTS[priorities.get(id) ?? "normal"];
}

export function scoreCandidate(
  index: MatchupIndex,
  heroId: number,
  yourPicks: number[],
  enemyPicks: number[],
  opts: ScoreOptions,
  priorities?: PriorityMap,
): ScoredCandidate {
  const row = index.get(heroId) ?? new Map<number, MatchupVs>();

  const synergyVals: number[] = [];
  const synergyWeights: number[] = [];
  for (const p of yourPicks) {
    if (p === heroId) continue;
    const m = row.get(p);
    if (m) {
      synergyVals.push(m.synergy);
      synergyWeights.push(priorityWeight(p, priorities));
    }
  }
  const winrateVals: number[] = [];
  const winrateWeights: number[] = [];
  for (const e of enemyPicks) {
    if (e === heroId) continue;
    const m = row.get(e);
    if (m && typeof m.winsAverage === "number") {
      winrateVals.push(m.winsAverage - 0.5);
      winrateWeights.push(priorityWeight(e, priorities));
    }
  }

  const synergyRaw = weightedMean(synergyVals, synergyWeights);
  const winrateRaw = weightedMean(winrateVals, winrateWeights);
  const synergyNorm = synergyRaw / SYNERGY_SCALE;
  const winrateNorm = winrateRaw;

  const wSyn = opts.synergyWeight / 100;
  const total = wSyn * synergyNorm + (1 - wSyn) * winrateNorm;

  return {
    heroId,
    name: HERO_IDS[heroId] ?? `Hero ${heroId}`,
    attr: HERO_ATTRS[heroId] ?? "uni",
    total,
    synergy: synergyRaw,
    synergyNorm,
    winrate: winrateRaw + 0.5,
    winrateNorm,
  };
}

export function rankCandidates(
  index: MatchupIndex,
  yourPicks: number[],
  enemyPicks: number[],
  opts: ScoreOptions,
  priorities?: PriorityMap,
): ScoredCandidate[] {
  const picked = new Set([...yourPicks, ...enemyPicks]);
  const out: ScoredCandidate[] = [];
  for (const id of Object.keys(HERO_IDS).map(Number)) {
    if (picked.has(id)) continue;
    out.push(scoreCandidate(index, id, yourPicks, enemyPicks, opts, priorities));
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

export interface MatchupDetail {
  heroId: number;
  name: string;
  synergy: number;
  winsAverage: number;
  priority: Priority;
}

export interface HeroMatchupBreakdown {
  vsEnemies: MatchupDetail[];
  withAllies: MatchupDetail[];
}

export function getHeroBreakdown(
  index: MatchupIndex,
  heroId: number,
  yourPicks: number[],
  enemyPicks: number[],
  priorities?: PriorityMap,
): HeroMatchupBreakdown {
  const row = index.get(heroId) ?? new Map<number, MatchupVs>();

  const vsEnemies: MatchupDetail[] = [];
  for (const e of enemyPicks) {
    if (e === heroId) continue;
    const m = row.get(e);
    vsEnemies.push({
      heroId: e,
      name: HERO_IDS[e] ?? `Hero ${e}`,
      synergy: m?.synergy ?? 0,
      winsAverage: m?.winsAverage ?? 0.5,
      priority: priorities?.get(e) ?? "normal",
    });
  }

  const withAllies: MatchupDetail[] = [];
  for (const a of yourPicks) {
    if (a === heroId) continue;
    const m = row.get(a);
    withAllies.push({
      heroId: a,
      name: HERO_IDS[a] ?? `Hero ${a}`,
      synergy: m?.synergy ?? 0,
      winsAverage: m?.winsAverage ?? 0.5,
      priority: priorities?.get(a) ?? "normal",
    });
  }

  return { vsEnemies, withAllies };
}

export interface TeamScore {
  synergy: number;
  synergyNorm: number;
  winrate: number;
  winrateNorm: number;
  total: number;
}

function teamSynergy(
  index: MatchupIndex,
  picks: number[],
  priorities?: PriorityMap,
): { vals: number[]; weights: number[] } {
  const vals: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < picks.length; i++) {
    const row = index.get(picks[i]);
    if (!row) continue;
    const wi = priorityWeight(picks[i], priorities);
    for (let j = 0; j < picks.length; j++) {
      if (i === j) continue;
      const m = row.get(picks[j]);
      if (m) {
        vals.push(m.synergy);
        weights.push(wi);
      }
    }
  }
  return { vals, weights };
}

function teamWinrate(
  index: MatchupIndex,
  picks: number[],
  opponents: number[],
  priorities?: PriorityMap,
): { vals: number[]; weights: number[] } {
  const vals: number[] = [];
  const weights: number[] = [];
  for (const h of picks) {
    const row = index.get(h);
    if (!row) continue;
    for (const o of opponents) {
      const m = row.get(o);
      if (m && typeof m.winsAverage === "number") {
        vals.push(m.winsAverage - 0.5);
        weights.push(priorityWeight(o, priorities));
      }
    }
  }
  return { vals, weights };
}

export function scoreTeam(
  index: MatchupIndex,
  picks: number[],
  opponents: number[],
  opts: ScoreOptions,
  priorities?: PriorityMap,
): TeamScore {
  const syn = teamSynergy(index, picks, priorities);
  const wr = teamWinrate(index, picks, opponents, priorities);

  const synergyRaw = weightedMean(syn.vals, syn.weights);
  const winrateRaw = weightedMean(wr.vals, wr.weights);
  const synergyNorm = synergyRaw / SYNERGY_SCALE;
  const winrateNorm = winrateRaw;

  const wSyn = opts.synergyWeight / 100;
  const total = wSyn * synergyNorm + (1 - wSyn) * winrateNorm;

  return {
    synergy: synergyRaw,
    synergyNorm,
    winrate: winrateRaw + 0.5,
    winrateNorm,
    total,
  };
}
