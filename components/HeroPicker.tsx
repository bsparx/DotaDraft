"use client";

import { useMemo, useState } from "react";
import { heroPortraitUrl } from "@/lib/heroImages";
import { HERO_IDS, HERO_ID_LIST, HERO_ATTRS, type Attr } from "@/lib/heroIds";
import type { HeroMatchupBreakdown, MatchupIndex, PriorityMap } from "@/lib/scoring";
import HeroTooltip from "@/components/HeroTooltip";

interface HeroPickerProps {
  pickedIds: Set<number>;
  onPick: (heroId: number) => void;
  index: MatchupIndex;
  yourPicks: number[];
  enemyPicks: number[];
  priorities: PriorityMap;
}

type Filter = "all" | Attr;

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: "all", label: "All", color: "var(--gold)" },
  { key: "str", label: "Str", color: "var(--str)" },
  { key: "agi", label: "Agi", color: "var(--agi)" },
  { key: "int", label: "Int", color: "var(--int)" },
  { key: "uni", label: "Uni", color: "var(--uni)" },
];

function attrColorOf(attr: string): string {
  if (attr === "str") return "var(--str)";
  if (attr === "agi") return "var(--agi)";
  if (attr === "int") return "var(--int)";
  return "var(--uni)";
}

export default function HeroPicker({
  pickedIds,
  onPick,
  index,
  yourPicks,
  enemyPicks,
  priorities,
}: HeroPickerProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HERO_ID_LIST.filter((id) => {
      if (filter !== "all" && HERO_ATTRS[id] !== filter) return false;
      if (q && !(HERO_IDS[id] ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filter, search]);

  function getBreakdown(heroId: number): HeroMatchupBreakdown {
    const row = index.get(heroId) ?? new Map();
    const vsEnemies = enemyPicks
      .filter((e) => e !== heroId)
      .map((e) => {
        const m = row.get(e);
        return {
          heroId: e,
          name: HERO_IDS[e] ?? `Hero ${e}`,
          synergy: m?.synergy ?? 0,
          winsAverage: m?.winsAverage ?? 0.5,
          priority: priorities.get(e) ?? "normal" as const,
        };
      });
    const withAllies = yourPicks
      .filter((a) => a !== heroId)
      .map((a) => {
        const m = row.get(a);
        return {
          heroId: a,
          name: HERO_IDS[a] ?? `Hero ${a}`,
          synergy: m?.synergy ?? 0,
          winsAverage: m?.winsAverage ?? 0.5,
          priority: priorities.get(a) ?? "normal" as const,
        };
      });
    return { vsEnemies, withAllies };
  }

  return (
    <section className="px-5 pt-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
        >
          Add a hero
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="rounded-[3px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: active ? f.color : "var(--muted)",
                    border: `1px solid ${active ? f.color : "var(--line)"}`,
                    background: active ? `${f.color}1a` : "transparent",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search heroes"
              aria-label="Search heroes"
              className="w-36 rounded-[3px] px-2.5 py-1 text-xs outline-none sm:w-44"
              style={{
                background: "var(--slate)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="mt-4 grid max-h-[340px] grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6 sm:gap-2 lg:grid-cols-8"
        style={{ borderRadius: 4 }}
      >
        {list.map((id) => {
          const picked = pickedIds.has(id);
          const attr = HERO_ATTRS[id] ?? "uni";
          const attrColor = attrColorOf(attr);
          return (
            <HeroTooltip
              key={id}
              heroId={id}
              breakdown={getBreakdown(id)}
            >
              <button
                onClick={() => onPick(id)}
                disabled={picked}
                className="group relative aspect-[16/9] w-full overflow-hidden"
                style={{
                  borderRadius: 3,
                  border: `1px solid ${picked ? "var(--line)" : "var(--slate-2)"}`,
                  background: "var(--slate)",
                  opacity: picked ? 0.35 : 1,
                  transition: "opacity 120ms, border-color 120ms",
                }}
                aria-label={picked ? `${HERO_IDS[id]} (picked)` : `Pick ${HERO_IDS[id]}`}
              >
                <img
                  src={heroPortraitUrl(id)}
                  alt={HERO_IDS[id] ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute left-0 top-0 h-full w-[3px]"
                  style={{ background: attrColor }}
                />
                <span
                  className="absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-[9px] font-medium"
                  style={{
                    background: "linear-gradient(to top, rgba(10,16,24,0.92), transparent)",
                    color: "var(--text)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {HERO_IDS[id] ?? ""}
                </span>
              </button>
            </HeroTooltip>
          );
        })}
        {list.length === 0 && (
          <div
            className="col-span-full py-10 text-center text-xs"
            style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}
          >
            No heroes match &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>
    </section>
  );
}
