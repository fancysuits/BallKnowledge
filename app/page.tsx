"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Chatbot } from "@/app/components/Chatbot";
import { EmptyState } from "@/app/components/EmptyState";
import { FilterBar } from "@/app/components/FilterBar";
import { Header } from "@/app/components/Header";
import { LoadingCards } from "@/app/components/LoadingCards";
import { MatchCard } from "@/app/components/MatchCard";
import { SportTabs } from "@/app/components/SportTabs";
import {
  isBasketballGameInFilter,
  isFootballMatchInFilter
} from "@/app/lib/statuses";
import type {
  BasketballGame,
  FootballMatch,
  MatchFilter,
  Sport,
  SportsApiResponse
} from "@/app/lib/types";

type FootballResponse = SportsApiResponse<FootballMatch, "matches">;
type BasketballResponse = SportsApiResponse<BasketballGame, "games">;

type LoadState = {
  error: string | null;
  lastUpdated: string | null;
  loading: boolean;
};

export default function Home() {
  const [activeSport, setActiveSport] = useState<Sport>("football");
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("all");
  const [footballMatches, setFootballMatches] = useState<FootballMatch[]>([]);
  const [basketballGames, setBasketballGames] = useState<BasketballGame[]>([]);
  const [footballState, setFootballState] = useState<LoadState>({
    error: null,
    lastUpdated: null,
    loading: true
  });
  const [basketballState, setBasketballState] = useState<LoadState>({
    error: null,
    lastUpdated: null,
    loading: false
  });
  const [basketballLoaded, setBasketballLoaded] = useState(false);

  useEffect(() => {
    void loadFootball();
  }, []);

  useEffect(() => {
    if (activeSport === "basketball" && !basketballLoaded) {
      void loadBasketball();
    }
  }, [activeSport, basketballLoaded]);

  const visibleFootballMatches = useMemo(
    () =>
      footballMatches.filter((match) =>
        isFootballMatchInFilter(match, activeFilter)
      ),
    [activeFilter, footballMatches]
  );
  const visibleBasketballGames = useMemo(
    () =>
      basketballGames.filter((game) =>
        isBasketballGameInFilter(game, activeFilter)
      ),
    [activeFilter, basketballGames]
  );

  const activeState =
    activeSport === "football" ? footballState : basketballState;
  const activeItems =
    activeSport === "football" ? visibleFootballMatches : visibleBasketballGames;

  async function loadFootball() {
    setFootballState((current) => ({ ...current, error: null, loading: true }));

    try {
      const response = await fetch("/api/sports/soccer", { cache: "no-store" });
      const data = (await response.json()) as FootballResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Football data could not be loaded.");
      }

      setFootballMatches(data.matches);
      setFootballState({
        error: null,
        lastUpdated: data.lastUpdated,
        loading: false
      });
    } catch (error) {
      setFootballState({
        error:
          error instanceof Error
            ? error.message
            : "Football data could not be loaded.",
        lastUpdated: null,
        loading: false
      });
    }
  }

  async function loadBasketball() {
    setBasketballState((current) => ({ ...current, error: null, loading: true }));

    try {
      const response = await fetch("/api/sports/basketball", {
        cache: "no-store"
      });
      const data = (await response.json()) as BasketballResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Basketball data could not be loaded.");
      }

      setBasketballGames(data.games);
      setBasketballLoaded(true);
      setBasketballState({
        error: null,
        lastUpdated: data.lastUpdated,
        loading: false
      });
    } catch (error) {
      setBasketballLoaded(true);
      setBasketballState({
        error:
          error instanceof Error
            ? error.message
            : "Basketball data could not be loaded.",
        lastUpdated: null,
        loading: false
      });
    }
  }

  function refreshActiveSport() {
    if (activeSport === "football") {
      void loadFootball();
      return;
    }

    void loadBasketball();
  }

  function renderMatches() {
    if (activeState.loading) {
      return <LoadingCards />;
    }

    if (activeState.error) {
      return (
        <div className="error-state">
          <AlertCircle size={24} aria-hidden="true" />
          <h3>Could not load {activeSport}</h3>
          <p>{activeState.error}</p>
          <button onClick={refreshActiveSport} type="button">
            Try again
          </button>
        </div>
      );
    }

    if (!activeItems.length) {
      return (
        <EmptyState
          title="No matches in this view"
          description="Try another status filter or refresh the current sport."
        />
      );
    }

    return (
      <div className="match-grid">
        {activeSport === "football"
          ? visibleFootballMatches.map((match) => (
              <MatchCard key={match.id} match={match} sport="football" />
            ))
          : visibleBasketballGames.map((game) => (
              <MatchCard key={game.id} match={game} sport="basketball" />
            ))}
      </div>
    );
  }

  return (
    <main className="app-shell dashboard-shell">
      <section className="dashboard-panel" aria-label="Sports match dashboard">
        <Header
          activeSport={activeSport}
          isRefreshing={activeState.loading}
          lastUpdated={activeState.lastUpdated}
          onRefresh={refreshActiveSport}
        />

        <div className="control-row">
          <SportTabs activeSport={activeSport} onChange={setActiveSport} />
          <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
        </div>

        {renderMatches()}
      </section>

      <Chatbot />
    </main>
  );
}
