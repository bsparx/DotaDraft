"use client";

import { heroPortraitUrl } from "@/lib/heroImages";
import { HERO_IDS } from "@/lib/heroIds";
import type {
  ScoredCandidate,
  HeroMatchupBreakdown,
  MatchupIndex,
  PriorityMap,
} from "@/lib/scoring";
import HeroTooltip from "@/components/HeroTooltip";

interface RecommendationProps {
  ranked: ScoredCandidate[];
  yourPicks: number[];
  enemyPicks: number[];
  synergyWeight: number;
  onPick: (heroId: number) => void;
  index: MatchupIndex;
  priorities: PriorityMap;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function matchScore(total: number): number {
  return Math.round(clamp(50 + total * 50, 0, 100));
}

function SplitBar({
  value,
  color,
  label,
  display,
}: {
  value: number;
  color: string;
  label: string;
  display: string;
}) {
  const v = clamp(value, -1, 1);
  const half = Math.abs(v) * 50;
  const fillStyle =
    v >= 0
      ? { left: "50%", width: `${half}%`, background: color }
      : { right: "50%", width: `${half}%`, background: color };

  return (
    <div className="flex items-center gap-3">
      <span
        className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
      <div
        className="relative h-1.5 flex-1"
        style={{ background: "var(--slate-2)", borderRadius: 1 }}
      >
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: "50%", background: "var(--line)" }}
        />
        <div
          className="absolute top-0 h-full"
          style={{ ...fillStyle, borderRadius: 1, transition: "all 200ms" }}
        />
      </div>
      <span
        className="w-16 shrink-0 text-right text-xs tabular-nums"
        style={{ color, fontFamily: "var(--font-mono)" }}
      >
        {display}
      </span>
    </div>
  );
}

function attrColor(attr: string): string {
  if (attr === "str") return "var(--str)";
  if (attr === "agi") return "var(--agi)";
  if (attr === "int") return "var(--int)";
  return "var(--uni)";
}

function makeBreakdown(
  index: MatchupIndex,
  heroId: number,
  yourPicks: number[],
  enemyPicks: number[],
  priorities: PriorityMap,
): HeroMatchupBreakdown {
  const row = index.get(heroId) ?? new Map();
  return {
    vsEnemies: enemyPicks
      .filter((e) => e !== heroId)
      .map((e) => {
        const m = row.get(e);
        return {
          heroId: e,
          name: HERO_IDS[e] ?? `Hero ${e}`,
          synergy: m?.synergy ?? 0,
          winsAverage: m?.winsAverage ?? 0.5,
          priority: priorities.get(e) ?? ("normal" as const),
        };
      }),
    withAllies: yourPicks
      .filter((a) => a !== heroId)
      .map((a) => {
        const m = row.get(a);
        return {
          heroId: a,
          name: HERO_IDS[a] ?? `Hero ${a}`,
          synergy: m?.synergy ?? 0,
          winsAverage: m?.winsAverage ?? 0.5,
          priority: priorities.get(a) ?? ("normal" as const),
        };
      }),
  };
}

function FeaturedCard({
  c,
  onPick,
  index,
  yourPicks,
  enemyPicks,
  priorities,
}: {
  c: ScoredCandidate;
  onPick: (id: number) => void;
  index: MatchupIndex;
  yourPicks: number[];
  enemyPicks: number[];
  priorities: PriorityMap;
}) {
  const score = matchScore(c.total);
  return (
    <button
      onClick={() => onPick(c.heroId)}
      className="slot-fill relative w-full overflow-hidden text-left"
      style={{
        background: "var(--slate)",
        border: "1px solid var(--line)",
        borderRadius: 4,
      }}
      aria-label={`Pick ${c.name}`}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: "var(--gold)" }}
      />
      <div className="flex gap-4 p-4 pl-5">
        <div className="shrink-0">
          <HeroTooltip
            heroId={c.heroId}
            breakdown={makeBreakdown(index, c.heroId, yourPicks, enemyPicks, priorities)}
          >
            <img
              src={heroPortraitUrl(c.heroId)}
              alt={c.name}
              loading="lazy"
              className="h-auto w-[120px] cursor-help object-cover sm:w-[150px]"
              style={{ borderRadius: 3, border: "1px solid var(--line)" }}
            />
          </HeroTooltip>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
              >
                #1 Recommended
              </div>
              <h3
                className="mt-1 truncate text-lg font-bold uppercase tracking-[0.04em] sm:text-xl"
                style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}
              >
                {c.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="text-3xl font-bold tabular-nums leading-none sm:text-4xl"
                style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}
              >
                {score}
              </div>
              <div
                className="text-[10px] uppercase tracking-[0.1em]"
                style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
              >
                match score
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SplitBar
              value={c.synergyNorm}
              color="var(--radiant)"
              label="Synergy"
              display={`${c.synergy >= 0 ? "+" : ""}${c.synergy.toFixed(2)}`}
            />
            <SplitBar
              value={c.winrateNorm * 5}
              color="var(--gold)"
              label="Wr vs enemy"
              display={`${(c.winrate * 100).toFixed(1)}%`}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function RankedRow({
  c,
  rank,
  onPick,
  index,
  yourPicks,
  enemyPicks,
  priorities,
}: {
  c: ScoredCandidate;
  rank: number;
  onPick: (id: number) => void;
  index: MatchupIndex;
  yourPicks: number[];
  enemyPicks: number[];
  priorities: PriorityMap;
}) {
  const score = matchScore(c.total);
  return (
    <button
      onClick={() => onPick(c.heroId)}
      className="slot-fill flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
      style={{ borderBottom: "1px solid var(--line)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--slate-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
      aria-label={`Pick ${c.name}`}
    >
      <span
        className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums"
        style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
      >
        {rank}
      </span>
      <span
        className="h-full w-[3px] shrink-0 self-stretch"
        style={{ background: attrColor(c.attr) }}
      />
      <HeroTooltip
        heroId={c.heroId}
        breakdown={makeBreakdown(index, c.heroId, yourPicks, enemyPicks, priorities)}
      >
        <img
          src={heroPortraitUrl(c.heroId)}
          alt={c.name}
          loading="lazy"
          className="h-[28px] w-[50px] shrink-0 cursor-help object-cover"
          style={{ borderRadius: 2 }}
        />
      </HeroTooltip>
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium"
        style={{ color: "var(--text)", fontFamily: "var(--font-body)" }}
      >
        {c.name}
      </span>
      <div
        className="hidden h-1 w-20 shrink-0 sm:block"
        style={{ background: "var(--slate-2)", borderRadius: 1 }}
      >
        <div
          className="h-full"
          style={{
            width: `${score}%`,
            background: "var(--gold)",
            borderRadius: 1,
            transition: "width 200ms",
          }}
        />
      </div>
      <span
        className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums"
        style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}
      >
        {score}
      </span>
    </button>
  );
}

export default function Recommendation({
  ranked,
  yourPicks,
  enemyPicks,
  synergyWeight,
  onPick,
  index,
  priorities,
}: RecommendationProps) {
  const hasPicks = yourPicks.length > 0 || enemyPicks.length > 0;
  const top = ranked.slice(0, 12);

  const mode =
    synergyWeight === 0
      ? "winrate only"
      : synergyWeight >= 100
        ? "synergy only"
        : "synergy + winrate";

  return (
    <section className="px-5 pt-7 sm:px-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
        >
          Recommended next pick
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.12em]"
          style={{ color: "var(--gold-dim)", fontFamily: "var(--font-display)" }}
        >
          {mode}
        </span>
      </div>

      {!hasPicks ? (
        <div
          className="mt-4 rounded-[4px] p-8 text-center"
          style={{ background: "var(--slate)", border: "1px dashed var(--line)" }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--text)", fontFamily: "var(--font-body)" }}
          >
            Pick heroes for your team and the enemy to see the next best pick.
          </p>
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}
          >
            Synergy scores your team. Winrate scores against the enemy.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <FeaturedCard
            c={ranked[0]}
            onPick={onPick}
            index={index}
            yourPicks={yourPicks}
            enemyPicks={enemyPicks}
            priorities={priorities}
          />
          <div
            className="mt-3 rounded-[4px]"
            style={{ background: "var(--slate)", border: "1px solid var(--line)" }}
          >
            {top.slice(1).map((c, i) => (
              <RankedRow
                key={c.heroId}
                c={c}
                rank={i + 2}
                onPick={onPick}
                index={index}
                yourPicks={yourPicks}
                enemyPicks={enemyPicks}
                priorities={priorities}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
