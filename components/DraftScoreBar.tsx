"use client";

import type { TeamScore } from "@/lib/scoring";

interface DraftScoreBarProps {
  yourScore: TeamScore;
  enemyScore: TeamScore;
  yourCount: number;
  enemyCount: number;
}

function TeamSide({
  label,
  color,
  score,
  count,
  winning,
}: {
  label: string;
  color: string;
  score: TeamScore;
  count: number;
  winning: boolean;
}) {
  const winPct = (score.winrate * 100).toFixed(1);
  const synStr = `${score.synergy >= 0 ? "+" : ""}${score.synergy.toFixed(2)}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color, fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-bold tabular-nums leading-none sm:text-3xl"
        style={{
          color: winning ? color : "var(--muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {count > 0 ? (50 + score.total * 50).toFixed(0) : "—"}
      </span>
      <div className="flex gap-3 text-[10px] tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
        <span style={{ color: "var(--radiant)" }}>
          syn {count > 0 ? synStr : "—"}
        </span>
        <span style={{ color: "var(--gold)" }}>
          wr {count > 0 ? `${winPct}%` : "—"}
        </span>
      </div>
    </div>
  );
}

export default function DraftScoreBar({
  yourScore,
  enemyScore,
  yourCount,
  enemyCount,
}: DraftScoreBarProps) {
  const hasAny = yourCount > 0 || enemyCount > 0;
  const bothSides = yourCount > 0 && enemyCount > 0;
  const youWin = bothSides && yourScore.total > enemyScore.total;
  const enemyWin = bothSides && enemyScore.total > yourScore.total;
  const tied = bothSides && !youWin && !enemyWin;

  let verdict = "Draft not started";
  let verdictColor = "var(--muted)";
  if (!hasAny) {
    verdict = "Draft not started";
    verdictColor = "var(--muted)";
  } else if (!bothSides) {
    verdict = "Pick heroes on both sides to compare";
    verdictColor = "var(--muted)";
  } else if (youWin) {
    verdict = "Your draft is ahead";
    verdictColor = "var(--radiant)";
  } else if (enemyWin) {
    verdict = "Enemy draft is ahead";
    verdictColor = "var(--dire)";
  } else if (tied) {
    verdict = "Draft is even";
    verdictColor = "var(--gold)";
  }

  // Bar fill proportions — based on each team's total relative to the sum
  const yourAbs = hasAny ? Math.max(0, yourScore.total) : 0;
  const enemyAbs = hasAny ? Math.max(0, enemyScore.total) : 0;
  const sum = yourAbs + enemyAbs;
  const yourPct = sum > 0 ? (yourAbs / sum) * 100 : 50;
  const enemyPct = sum > 0 ? (enemyAbs / sum) * 100 : 50;

  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-4 sm:px-8"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex w-full max-w-lg items-center justify-between gap-4">
        <TeamSide
          label="Your team"
          color="var(--radiant)"
          score={yourScore}
          count={yourCount}
          winning={youWin}
        />
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)", fontFamily: "var(--font-display)" }}
          >
            Draft score
          </span>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: verdictColor, fontFamily: "var(--font-display)" }}
          >
            {verdict}
          </span>
        </div>
        <TeamSide
          label="Enemy"
          color="var(--dire)"
          score={enemyScore}
          count={enemyCount}
          winning={enemyWin}
        />
      </div>

      {hasAny && yourCount > 0 && enemyCount > 0 && (
        <div
          className="flex h-1 w-full max-w-lg overflow-hidden"
          style={{ borderRadius: 1, background: "var(--slate-2)" }}
        >
          <div
            style={{
              width: `${yourPct}%`,
              background: "var(--radiant)",
              transition: "width 300ms",
            }}
          />
          <div
            style={{
              width: `${enemyPct}%`,
              background: "var(--dire)",
              transition: "width 300ms",
            }}
          />
        </div>
      )}
    </div>
  );
}
