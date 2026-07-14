"use client";

import { heroPortraitUrl } from "@/lib/heroImages";
import { HERO_IDS } from "@/lib/heroIds";
import type { Priority, PriorityMap } from "@/lib/scoring";

interface DraftBoardProps {
  yourPicks: number[];
  enemyPicks: number[];
  activeTeam: "your" | "enemy";
  onActiveTeamChange: (t: "your" | "enemy") => void;
  onRemovePick: (team: "your" | "enemy", index: number) => void;
  onCyclePriority: (heroId: number) => void;
  priorities: PriorityMap;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  normal: "Normal priority — click to mark Important",
  important: "Important — weighted 2× — click for Less important",
  less: "Less important — weighted 0.5× — click for Normal",
};

const PRIORITY_BADGE: Record<Priority, { text: string; color: string }> = {
  normal: { text: "", color: "" },
  important: { text: "!", color: "var(--gold)" },
  less: { text: "↓", color: "var(--muted)" },
};

function Slot({
  heroId,
  team,
  priority,
  onCyclePriority,
  onRemove,
}: {
  heroId: number | null;
  team: "your" | "enemy";
  priority: Priority;
  onCyclePriority: () => void;
  onRemove: () => void;
}) {
  const accent = team === "your" ? "var(--radiant)" : "var(--dire)";
  const accentDim = team === "your" ? "var(--radiant-dim)" : "var(--dire-dim)";

  if (heroId === null) {
    return (
      <div
        className="flex aspect-[16/9] w-full items-center justify-center"
        style={{
          background: "var(--slate)",
          border: `1px solid ${accentDim}`,
          borderRadius: 3,
        }}
      >
        <span
          className="text-xs"
          style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          empty
        </span>
      </div>
    );
  }

  const badge = PRIORITY_BADGE[priority];
  const borderStyle =
    priority === "important"
      ? `2px solid ${accent}`
      : priority === "less"
        ? `1px dashed ${accentDim}`
        : `1px solid ${accent}`;

  return (
    <div
      className="group relative aspect-[16/9] w-full overflow-hidden"
      style={{
        border: borderStyle,
        borderRadius: 3,
        background: "var(--slate)",
      }}
    >
      <button
        onClick={onCyclePriority}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer"
        aria-label={`${HERO_IDS[heroId] ?? "hero"} — ${PRIORITY_LABEL[priority]}`}
        title={PRIORITY_LABEL[priority]}
      >
        <img
          src={heroPortraitUrl(heroId)}
          alt={HERO_IDS[heroId] ?? ""}
          loading="lazy"
          className="pointer-events-none h-full w-full object-cover"
          style={{
            opacity: priority === "less" ? 0.5 : 1,
            transition: "opacity 150ms",
          }}
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: `linear-gradient(to top, ${team === "your" ? "rgba(63,138,90,0.95)" : "rgba(158,59,59,0.95)"}, transparent)`,
            color: "var(--text)",
            fontFamily: "var(--font-body)",
          }}
        >
          {HERO_IDS[heroId] ?? ""}
        </span>
      </button>

      {/* Priority badge — top-right corner */}
      {priority !== "normal" && (
        <span
          className="absolute right-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: "var(--ink)",
            color: badge.color,
            border: `1px solid ${badge.color}`,
            fontFamily: "var(--font-mono)",
          }}
        >
          {badge.text}
        </span>
      )}

      {/* Remove button — top-left corner, visible on hover */}
      <button
        onClick={onRemove}
        className="absolute left-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: "var(--ink)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          fontFamily: "var(--font-mono)",
        }}
        aria-label={`Remove ${HERO_IDS[heroId] ?? "hero"}`}
      >
        ×
      </button>
    </div>
  );
}

export default function DraftBoard({
  yourPicks,
  enemyPicks,
  activeTeam,
  onActiveTeamChange,
  onRemovePick,
  onCyclePriority,
  priorities,
}: DraftBoardProps) {
  const yourSlots = Array.from({ length: 5 }, (_, i) => yourPicks[i] ?? null);
  const enemySlots = Array.from({ length: 5 }, (_, i) => enemyPicks[i] ?? null);

  return (
    <section className="px-5 pt-6 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1.5">
          <button
            onClick={() => onActiveTeamChange("your")}
            className="rounded-[3px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
            style={{
              fontFamily: "var(--font-display)",
              background: activeTeam === "your" ? "var(--radiant-dim)" : "transparent",
              color: activeTeam === "your" ? "var(--radiant)" : "var(--muted)",
              border: `1px solid ${activeTeam === "your" ? "var(--radiant)" : "var(--line)"}`,
            }}
          >
            Your team
          </button>
          <button
            onClick={() => onActiveTeamChange("enemy")}
            className="rounded-[3px] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
            style={{
              fontFamily: "var(--font-display)",
              background: activeTeam === "enemy" ? "var(--dire-dim)" : "transparent",
              color: activeTeam === "enemy" ? "var(--dire)" : "var(--muted)",
              border: `1px solid ${activeTeam === "enemy" ? "var(--dire)" : "var(--line)"}`,
            }}
          >
            Enemy
          </button>
        </div>
        <span
          className="hidden text-[10px] uppercase tracking-[0.14em] sm:inline"
          style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
        >
          click a hero to set priority · hover × to remove
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.16em] sm:hidden"
          style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
        >
          tap to prioritize
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {yourSlots.map((id, i) => (
            <Slot
              key={`y-${i}`}
              heroId={id}
              team="your"
              priority={id !== null ? (priorities.get(id) ?? "normal") : "normal"}
              onCyclePriority={() => id !== null && onCyclePriority(id)}
              onRemove={() => onRemovePick("your", i)}
            />
          ))}
        </div>

        <span
          className="px-1 text-sm font-bold tracking-[0.2em]"
          style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
        >
          VS
        </span>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {enemySlots.map((id, i) => (
            <Slot
              key={`e-${i}`}
              heroId={id}
              team="enemy"
              priority={id !== null ? (priorities.get(id) ?? "normal") : "normal"}
              onCyclePriority={() => id !== null && onCyclePriority(id)}
              onRemove={() => onRemovePick("enemy", i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
