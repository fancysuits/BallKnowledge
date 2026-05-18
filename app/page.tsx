"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Chatbot } from "@/app/components/Chatbot";
import { EmptyState } from "@/app/components/EmptyState";
import { FilterBar } from "@/app/components/FilterBar";
import { Header } from "@/app/components/Header";
import { LoadingCards } from "@/app/components/LoadingCards";
import { MatchCard } from "@/app/components/MatchCard";
import { MatchDetailModal } from "@/app/components/MatchDetailModal";
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
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<
    | { sport: "football"; match: FootballMatch }
    | { sport: "basketball"; match: BasketballGame }
    | null
  >(null);
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
    const stored = window.localStorage.getItem("ballknowledge:favorites");
    if (stored) {
      setFavoriteTeams(JSON.parse(stored) as string[]);
    }
  }, []);

  useEffect(() => {
    if (activeSport === "basketball" && !basketballLoaded) {
      void loadBasketball();
    }
  }, [activeSport, basketballLoaded]);

  const visibleFootballMatches = useMemo(
    () =>
      sortFavorites(
        footballMatches.filter((match) =>
          isFootballMatchInFilter(match, activeFilter) &&
          isInLeague(match, leagueFilter) &&
          matchesSearch(match, searchQuery)
        ),
        favoriteTeams
      ),
    [activeFilter, favoriteTeams, footballMatches, leagueFilter, searchQuery]
  );
  const visibleBasketballGames = useMemo(
    () =>
      sortFavorites(
        basketballGames.filter((game) =>
          isBasketballGameInFilter(game, activeFilter) &&
          matchesSearch(game, searchQuery)
        ),
        favoriteTeams
      ),
    [activeFilter, basketballGames, favoriteTeams, searchQuery]
  );
  const leagueOptions = useMemo(
    () =>
      Array.from(
        new Set(footballMatches.map((match) => match.league).filter(Boolean))
      ) as string[],
    [footballMatches]
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

  function toggleFavoriteTeam(teamName: string) {
    setFavoriteTeams((current) => {
      const next = current.includes(teamName)
        ? current.filter((team) => team !== teamName)
        : [...current, teamName];
      window.localStorage.setItem("ballknowledge:favorites", JSON.stringify(next));
      return next;
    });
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
              <MatchCard
                key={match.id}
                match={match}
                onSelect={(match) => setSelectedMatch({ sport: "football", match })}
                sport="football"
              />
            ))
          : visibleBasketballGames.map((game) => (
              <MatchCard
                key={game.id}
                match={game}
                onSelect={(match) => setSelectedMatch({ sport: "basketball", match })}
                sport="basketball"
              />
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

        <div className="dashboard-tools">
          <label>
            <span>Search team</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Arsenal, Celtics..."
              type="search"
              value={searchQuery}
            />
          </label>
          {activeSport === "football" ? (
            <label>
              <span>League</span>
              <select
                onChange={(event) => setLeagueFilter(event.target.value)}
                value={leagueFilter}
              >
                <option value="all">All leagues</option>
                {leagueOptions.map((league) => (
                  <option key={league} value={league}>
                    {league}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="favorite-strip" aria-label="Favorite teams">
            {activeSport === "football"
              ? footballMatches.slice(0, 4).map((match) => (
                  <button
                    aria-pressed={favoriteTeams.includes(match.homeTeam)}
                    key={match.homeTeam}
                    onClick={() => toggleFavoriteTeam(match.homeTeam)}
                    type="button"
                  >
                    {match.homeTeam}
                  </button>
                ))
              : basketballGames.slice(0, 4).map((game) => (
                  <button
                    aria-pressed={favoriteTeams.includes(game.homeTeam)}
                    key={game.homeTeam}
                    onClick={() => toggleFavoriteTeam(game.homeTeam)}
                    type="button"
                  >
                    {game.homeTeam}
                  </button>
                ))}
          </div>
        </div>

        {renderMatches()}
      </section>

      <Chatbot />
      {selectedMatch ? (
        <MatchDetailModal
          match={selectedMatch.match}
          onClose={() => setSelectedMatch(null)}
          sport={selectedMatch.sport}
        />
      ) : null}
    </main>
  );
}

function matchesSearch(
  match: Pick<FootballMatch | BasketballGame, "awayTeam" | "homeTeam">,
  query: string
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  return (
    match.homeTeam.toLowerCase().includes(trimmed) ||
    match.awayTeam.toLowerCase().includes(trimmed)
  );
}

function isInLeague(match: FootballMatch, leagueFilter: string): boolean {
  return leagueFilter === "all" || match.league === leagueFilter;
}

function sortFavorites<T extends Pick<FootballMatch | BasketballGame, "awayTeam" | "homeTeam">>(
  matches: T[],
  favoriteTeams: string[]
): T[] {
  return [...matches].sort((left, right) => {
    const leftFavorite =
      favoriteTeams.includes(left.homeTeam) || favoriteTeams.includes(left.awayTeam);
    const rightFavorite =
      favoriteTeams.includes(right.homeTeam) || favoriteTeams.includes(right.awayTeam);

    return Number(rightFavorite) - Number(leftFavorite);
  });
}
