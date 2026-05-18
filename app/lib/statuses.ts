import type {
  BasketballGame,
  FootballMatch,
  MatchFilter
} from "@/app/lib/types";

const LIVE_STATUSES = new Set(["live", "1h", "2h", "ht", "q1", "q2", "q3", "q4", "ot"]);
const FINISHED_STATUSES = new Set(["final", "ft", "aet", "pen", "finished"]);
const UPCOMING_STATUSES = new Set(["scheduled", "not started", "ns", "tbd", "postponed"]);

export function getStatusLabel(status?: string): string {
  const normalized = normalizeStatus(status);

  if (LIVE_STATUSES.has(normalized)) {
    return "Live";
  }

  if (FINISHED_STATUSES.has(normalized)) {
    return "Finished";
  }

  if (UPCOMING_STATUSES.has(normalized)) {
    return "Upcoming";
  }

  return status || "Scheduled";
}

export function getStatusTone(status?: string): "live" | "finished" | "upcoming" {
  const normalized = normalizeStatus(status);

  if (LIVE_STATUSES.has(normalized)) {
    return "live";
  }

  if (FINISHED_STATUSES.has(normalized)) {
    return "finished";
  }

  return "upcoming";
}

export function isFootballMatchInFilter(
  match: FootballMatch,
  filter: MatchFilter
): boolean {
  return isStatusInFilter(match.status, filter);
}

export function isBasketballGameInFilter(
  game: BasketballGame,
  filter: MatchFilter
): boolean {
  return isStatusInFilter(game.status, filter);
}

function isStatusInFilter(status: string | undefined, filter: MatchFilter): boolean {
  if (filter === "all") {
    return true;
  }

  const tone = getStatusTone(status);
  return tone === filter;
}

function normalizeStatus(status?: string): string {
  return status?.trim().toLowerCase() || "scheduled";
}
