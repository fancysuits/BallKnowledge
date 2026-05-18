import { CalendarDays } from "lucide-react";
import { formatMatchDate, formatMatchTime } from "@/app/lib/format";
import type { BasketballGame, FootballMatch, Sport } from "@/app/lib/types";
import { StatusBadge } from "@/app/components/StatusBadge";

type MatchCardProps =
  | {
      sport: "football";
      match: FootballMatch;
    }
  | {
      sport: "basketball";
      match: BasketballGame;
    };

export function MatchCard({ sport, match }: MatchCardProps) {
  const score =
    sport === "football"
      ? formatScore(match.homeGoals, match.awayGoals)
      : formatScore(match.homeScore, match.awayScore);
  const meta =
    sport === "football"
      ? [match.league, match.country].filter(Boolean).join(" / ")
      : "NBA";

  return (
    <article className="match-card">
      <div className="match-card-meta">
        <span>{meta || (sport === "football" ? "Football" : "Basketball")}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="match-teams">
        <TeamLogo name={match.homeTeam} logo={match.homeLogo} sport={sport} />
        <div className="score-block">
          <strong>{score}</strong>
          <span>vs</span>
        </div>
        <TeamLogo name={match.awayTeam} logo={match.awayLogo} sport={sport} />
      </div>

      <div className="match-time">
        <CalendarDays size={15} aria-hidden="true" />
        <span>{formatMatchDate(match.date)}</span>
        <span>{formatMatchTime(match.date)}</span>
      </div>
    </article>
  );
}

function TeamLogo({
  logo,
  name,
  sport
}: {
  logo?: string;
  name: string;
  sport: Sport;
}) {
  return (
    <div className="team-lockup">
      <div className="team-logo" aria-hidden="true">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={logo} />
        ) : (
          <span className={sport}>{getInitials(name)}</span>
        )}
      </div>
      <strong>{name}</strong>
    </div>
  );
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
