"use client";

import { heroPortraitUrl } from "@/lib/heroImages";
import { HERO_IDS } from "@/lib/heroIds";
import type { HeroMatchupBreakdown } from "@/lib/scoring";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface HeroTooltipProps {
  heroId: number;
  breakdown: HeroMatchupBreakdown;
  children: React.ReactNode;
}

function winrateColor(wr: number): string {
  if (wr >= 0.55) return "var(--radiant)";
  if (wr <= 0.45) return "var(--dire)";
  return "var(--muted)";
}

function synergyColor(syn: number): string {
  if (syn > 1) return "var(--radiant)";
  if (syn < -1) return "var(--dire)";
  return "var(--muted)";
}

function priorityBadge(p: string): string {
  if (p === "important") return " ★";
  if (p === "less") return " ↓";
  return "";
}

function MatchupRow({
  heroId,
  name,
  winsAverage,
  synergy,
  priority,
  showWinrate,
}: {
  heroId: number;
  name: string;
  winsAverage: number;
  synergy: number;
  priority: string;
  showWinrate: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 py-0.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <img
        src={heroPortraitUrl(heroId)}
        alt={name}
        className="h-[18px] w-[32px] shrink-0 object-cover"
        style={{ borderRadius: 2 }}
      />
      <span
        className="min-w-0 flex-1 truncate text-[11px]"
        style={{
          color: "var(--text)",
          fontFamily: "var(--font-body)",
        }}
      >
        {name}
        {priorityBadge(priority)}
      </span>
      {showWinrate ? (
        <span
          className="shrink-0 text-[11px] tabular-nums"
          style={{
            color: winrateColor(winsAverage),
            fontFamily: "var(--font-mono)",
          }}
        >
          {(winsAverage * 100).toFixed(1)}%
        </span>
      ) : (
        <span
          className="shrink-0 text-[11px] tabular-nums"
          style={{
            color: synergyColor(synergy),
            fontFamily: "var(--font-mono)",
          }}
        >
          {synergy >= 0 ? "+" : ""}
          {synergy.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function HeroTooltip({
  heroId,
  breakdown,
  children,
}: HeroTooltipProps) {
  const hasEnemies = breakdown.vsEnemies.length > 0;
  const hasAllies = breakdown.withAllies.length > 0;
  const heroName = HERO_IDS[heroId] ?? `Hero ${heroId}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-block cursor-default">{children}</div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="max-w-[260px] border p-0"
        style={{
          background: "var(--slate)",
          borderColor: "var(--line)",
          borderRadius: 4,
          fontFamily: "var(--font-body)",
        }}
      >
        <div
          className="px-3 py-2"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
          >
            {heroName}
          </span>
        </div>

        <div className="px-3 py-2">
          {!hasEnemies && !hasAllies ? (
            <span
              className="text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              Pick heroes to see matchup details.
            </span>
          ) : (
            <>
              {hasEnemies && (
                <div className="mb-2">
                  <div
                    className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      color: "var(--dire)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Winrate vs enemy
                  </div>
                  {breakdown.vsEnemies.map((e) => (
                    <MatchupRow
                      key={`e-${e.heroId}`}
                      heroId={e.heroId}
                      name={e.name}
                      winsAverage={e.winsAverage}
                      synergy={e.synergy}
                      priority={e.priority}
                      showWinrate
                    />
                  ))}
                </div>
              )}

              {hasAllies && (
                <div>
                  <div
                    className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      color: "var(--radiant)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Synergy with allies
                  </div>
                  {breakdown.withAllies.map((a) => (
                    <MatchupRow
                      key={`a-${a.heroId}`}
                      heroId={a.heroId}
                      name={a.name}
                      winsAverage={a.winsAverage}
                      synergy={a.synergy}
                      priority={a.priority}
                      showWinrate={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
