"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { formatMatchDate, formatMatchTime } from "@/app/lib/format";
import type { BasketballGame, FootballMatch, Sport } from "@/app/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";

type MatchDetailModalProps = {
  match: FootballMatch | BasketballGame;
  sport: Sport;
  onClose: () => void;
};

type InsightResponse = {
  insight?: string;
  error?: string;
};

export function MatchDetailModal({
  match,
  onClose,
  sport
}: MatchDetailModalProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score =
    sport === "football"
      ? formatScore((match as FootballMatch).homeGoals, (match as FootballMatch).awayGoals)
      : formatScore((match as BasketballGame).homeScore, (match as BasketballGame).awayScore);

  async function generateInsight() {
    if (isLoadingInsight) {
      return;
    }

    setIsLoadingInsight(true);
    setError(null);

    try {
      const response = await fetch("/api/match-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ match, sport })
      });
      const data = (await response.json()) as InsightResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Insight could not be generated.");
      }

      setInsight(data.insight || "No insight returned.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Insight could not be generated."
      );
    } finally {
      setIsLoadingInsight(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label={`${match.homeTeam} vs ${match.awayTeam} details`}
        aria-modal="true"
        className="match-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">{sport === "football" ? "Match center" : "Game center"}</p>
            <h2>{match.homeTeam} vs {match.awayTeam}</h2>
          </div>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal-score-row">
          <TeamLogo logo={match.homeLogo} name={match.homeTeam} />
          <div>
            <strong>{score}</strong>
            <StatusBadge status={match.status} />
          </div>
          <TeamLogo logo={match.awayLogo} name={match.awayTeam} />
        </div>

        <dl className="detail-grid">
          <Detail label="Date" value={`${formatMatchDate(match.date)} ${formatMatchTime(match.date)}`} />
          <Detail label="Minute" value={match.minute ? `${match.minute}'` : "Unavailable"} />
          <Detail label="Venue" value={match.venue || "Unavailable"} />
          <Detail label="League" value={sport === "football" ? `${(match as FootballMatch).league || "Football"} ${(match as FootballMatch).country ? `/ ${(match as FootballMatch).country}` : ""}` : "NBA"} />
          <Detail label="Possession" value={formatPair(match.stats?.possession, "%")} />
          <Detail label="Shots" value={formatPair(match.stats?.shots)} />
          <Detail label="xG" value={formatPair(match.stats?.expectedGoals)} />
          <Detail label="H2H" value={formatH2H(match.stats?.headToHead)} />
        </dl>

        <div className="insight-box">
          <button
            className="icon-button"
            disabled={isLoadingInsight}
            onClick={generateInsight}
            type="button"
          >
            {isLoadingInsight ? (
              <Loader2 size={17} aria-hidden="true" />
            ) : (
              <Sparkles size={17} aria-hidden="true" />
            )}
            AI Insight
          </button>
          {error ? <p className="chat-error">{error}</p> : null}
          {insight ? <p>{insight}</p> : null}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TeamLogo({ logo, name }: { logo?: string; name: string }) {
  return (
    <div className="modal-team">
      <div className="team-logo" aria-hidden="true">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={logo} />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      <strong>{name}</strong>
    </div>
  );
}

function formatPair(pair?: { home: number; away: number }, suffix = ""): string {
  if (!pair) {
    return "Unavailable";
  }

  return `${pair.home}${suffix} - ${pair.away}${suffix}`;
}

function formatH2H(
  h2h?: FootballMatch["stats"] extends infer T
    ? T extends { headToHead?: infer H }
      ? H
      : never
    : never
): string {
  if (!h2h) {
    return "Unavailable";
  }

  return `${h2h.games} games, home ${h2h.homeWins}, draw ${h2h.draws}, away ${h2h.awayWins}`;
}

function formatScore(
  homeScore: number | null | undefined,
  awayScore: number | null | undefined
): string {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return "-";
  }

  return `${homeScore} - ${awayScore}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
