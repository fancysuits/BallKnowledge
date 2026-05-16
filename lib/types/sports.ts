export type Sport = "soccer" | "basketball";

export type LeagueId = "premier-league" | "la-liga" | "nba";

export type League = {
  id: LeagueId;
  name: string;
  sport: Sport;
  country: string;
  season: string;
};

export type Fixture = {
  id: string;
  leagueId: LeagueId;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  status: "scheduled" | "live" | "final";
  score?: {
    home: number;
    away: number;
  };
};

export type Standing = {
  leagueId: LeagueId;
  rank: number;
  team: string;
  played: number;
  wins: number;
  draws?: number;
  losses: number;
  points: number;
  differential: number;
};

export type TeamStatistic = {
  team: string;
  leagueId: LeagueId;
  form: string;
  scoringAverage: number;
  concededAverage: number;
  notes: string[];
};

export type MatchStatistic = {
  fixtureId: string;
  possession?: {
    home: number;
    away: number;
  };
  shots?: {
    home: number;
    away: number;
  };
  expectedGoals?: {
    home: number;
    away: number;
  };
  rebounds?: {
    home: number;
    away: number;
  };
  assists?: {
    home: number;
    away: number;
  };
};

export type SportsContext = {
  leagues: League[];
  fixtures: Fixture[];
  standings: Standing[];
  teamStatistics: TeamStatistic[];
  matchStatistics: MatchStatistic[];
  providerNotes: string[];
};
