"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import DraftScoreBar from "@/components/DraftScoreBar";
import DraftBoard from "@/components/DraftBoard";
import HeroPicker from "@/components/HeroPicker";
import Recommendation from "@/components/Recommendation";
import {
  buildIndex,
  rankCandidates,
  scoreTeam,
  PRIORITY_CYCLE,
  type StoredMatchups,
  type MatchupIndex,
  type PriorityMap,
} from "@/lib/scoring";

const MAX_PICKS = 5;

export default function Home() {
  const [data, setData] = useState<StoredMatchups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [yourPicks, setYourPicks] = useState<number[]>([]);
  const [enemyPicks, setEnemyPicks] = useState<number[]>([]);
  const [activeTeam, setActiveTeam] = useState<"your" | "enemy">("your");
  const [synergyWeight, setSynergyWeight] = useState(30);
  const [priorities, setPriorities] = useState<PriorityMap>(new Map());

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/ingest", { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw = typeof json.data === "string" ? JSON.parse(json.data) : json.data;
    return raw as StoredMatchups;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await fetchData();
        if (!active) return;
        setData(raw);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const raw = await fetchData();
      setData(raw);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const index: MatchupIndex = useMemo(
    () => (data ? buildIndex(data) : new Map()),
    [data],
  );

  const ranked = useMemo(
    () => rankCandidates(index, yourPicks, enemyPicks, { synergyWeight }, priorities),
    [index, yourPicks, enemyPicks, synergyWeight, priorities],
  );

  const yourTeamScore = useMemo(
    () => scoreTeam(index, yourPicks, enemyPicks, { synergyWeight }, priorities),
    [index, yourPicks, enemyPicks, synergyWeight, priorities],
  );

  const enemyTeamScore = useMemo(
    () => scoreTeam(index, enemyPicks, yourPicks, { synergyWeight }, priorities),
    [index, enemyPicks, yourPicks, synergyWeight, priorities],
  );

  const pickedIds = useMemo(
    () => new Set([...yourPicks, ...enemyPicks]),
    [yourPicks, enemyPicks],
  );

  const addPick = useCallback(
    (heroId: number) => {
      if (pickedIds.has(heroId)) return;
      if (activeTeam === "your") {
        setYourPicks((prev) =>
          prev.length < MAX_PICKS ? [...prev, heroId] : prev,
        );
      } else {
        setEnemyPicks((prev) =>
          prev.length < MAX_PICKS ? [...prev, heroId] : prev,
        );
      }
    },
    [activeTeam, pickedIds],
  );

  const removePick = useCallback(
    (team: "your" | "enemy", i: number) => {
      const list = team === "your" ? yourPicks : enemyPicks;
      const removed = list[i];
      if (team === "your") {
        setYourPicks((prev) => prev.filter((_, idx) => idx !== i));
      } else {
        setEnemyPicks((prev) => prev.filter((_, idx) => idx !== i));
      }
      if (removed !== undefined) {
        setPriorities((prev) => {
          const next = new Map(prev);
          next.delete(removed);
          return next;
        });
      }
    },
    [yourPicks, enemyPicks],
  );

  const cyclePriority = useCallback((heroId: number) => {
    setPriorities((prev) => {
      const next = new Map(prev);
      const current = next.get(heroId) ?? "normal";
      const idx = PRIORITY_CYCLE.indexOf(current);
      const newPriority = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
      if (newPriority === "normal") {
        next.delete(heroId);
      } else {
        next.set(heroId, newPriority);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        synergyWeight={synergyWeight}
        onSynergyWeightChange={setSynergyWeight}
        updatedAt={data?.updatedAt ?? null}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {!loading && !error && data && (
        <DraftScoreBar
          yourScore={yourTeamScore}
          enemyScore={enemyTeamScore}
          yourCount={yourPicks.length}
          enemyCount={enemyPicks.length}
        />
      )}

      {loading ? (
        <div
          className="flex flex-1 items-center justify-center p-10 text-sm"
          style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}
        >
          Loading draft data…
        </div>
      ) : error && !data ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <p className="text-sm" style={{ color: "var(--dire)" }}>
            Couldn’t load matchup data: {error}
          </p>
          <button
            onClick={fetchData}
            className="rounded-[3px] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{
              border: "1px solid var(--line)",
              color: "var(--text)",
              fontFamily: "var(--font-display)",
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 pb-16">
          <DraftBoard
            yourPicks={yourPicks}
            enemyPicks={enemyPicks}
            activeTeam={activeTeam}
            onActiveTeamChange={setActiveTeam}
            onRemovePick={removePick}
            onCyclePriority={cyclePriority}
            priorities={priorities}
          />

          <div className="mt-2 grid gap-0 lg:grid-cols-[1fr_420px] lg:gap-6 lg:px-5">
            <div className="lg:px-3">
              <HeroPicker
                pickedIds={pickedIds}
                onPick={addPick}
                index={index}
                yourPicks={yourPicks}
                enemyPicks={enemyPicks}
                priorities={priorities}
              />
            </div>
            <div
              className="lg:sticky lg:top-[60px] lg:self-start lg:px-3"
            >
              <Recommendation
                ranked={ranked}
                yourPicks={yourPicks}
                enemyPicks={enemyPicks}
                synergyWeight={synergyWeight}
                onPick={addPick}
                index={index}
                priorities={priorities}
              />
            </div>
          </div>
        </main>
      )}

      <footer
        className="px-5 py-4 text-center text-[10px] sm:px-8"
        style={{
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.1em",
        }}
      >
        DIVINE / IMMORTAL · POWERED BY STRATZ
      </footer>
    </div>
  );
}
