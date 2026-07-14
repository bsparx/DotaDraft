"use client";

import { useEffect, useState } from "react";

interface TopBarProps {
  synergyWeight: number;
  onSynergyWeightChange: (v: number) => void;
  updatedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "no data yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "no data yet";
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "updated just now";
  if (m < 60) return `updated ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `updated ${h}h ago`;
  return `updated ${Math.floor(h / 24)}d ago`;
}

export default function TopBar({
  synergyWeight,
  onSynergyWeightChange,
  updatedAt,
  onRefresh,
  refreshing,
}: TopBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const winrateWeight = 100 - synergyWeight;

  return (
    <header
      className="sticky top-0 z-30 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3 sm:px-8"
      style={{ background: "var(--ink)", borderBottom: "1px solid var(--line)" }}
    >
      <div
        className="flex items-baseline gap-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span
          className="text-base font-bold tracking-[0.18em] sm:text-lg"
          style={{ color: "var(--gold)" }}
        >
          DRAFT
        </span>
        <span className="text-base font-semibold tracking-[0.18em] text-[var(--text)] sm:text-lg">
          CONSOLE
        </span>
      </div>

      <div className="order-3 flex w-full items-center gap-3 sm:order-2 sm:w-auto sm:flex-1 sm:max-w-md">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--radiant)", fontFamily: "var(--font-display)" }}
        >
          Syn {synergyWeight}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={synergyWeight}
          onChange={(e) => onSynergyWeightChange(Number(e.target.value))}
          aria-label="Synergy weight"
          className="draft-slider w-full"
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
        >
          Wr {winrateWeight}
        </span>
      </div>

      <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
        <span
          className="text-[11px] tabular-nums"
          style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
        >
          {relativeTime(updatedAt, now)}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-[3px] border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
          style={{
            borderColor: "var(--line)",
            color: "var(--text)",
            fontFamily: "var(--font-display)",
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </div>

      <style>{`
        .draft-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          background: var(--line);
          border-radius: 1px;
          cursor: pointer;
        }
        .draft-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--gold);
          border: 2px solid var(--ink);
        }
        .draft-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--gold);
          border: 2px solid var(--ink);
        }
      `}</style>
    </header>
  );
}
