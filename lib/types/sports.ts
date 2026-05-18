export type Sport = "soccer" | "basketball";

export type LeagueId = "premier-league" | "la-liga" | "nba";

export type League = {
  id: LeagueId;
  name: string;
  sport: Sport;
  country: string;
  season: string;
  providerId?: number;
};

export type Fixture = {
  id: string;
  leagueId: LeagueId;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
  status: "scheduled" | "live" | "final";
  minute?: number | null;
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
  homeScoringAverage?: number;
  homeConcededAverage?: number;
  awayScoringAverage?: number;
  awayConcededAverage?: number;
  recentGoalsFor?: number[];
  recentGoalsAgainst?: number[];
  notes: string[];
};

export type MatchStatistic = {
  fixtureId: string;
  source?: "live" | "recent" | "head-to-head" | "provider";
  liveMinute?: number;
  headToHead?: {
    games: number;
    homeWins: number;
    awayWins: number;
    draws: number;
    averageGoals: number;
  };
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

export type PredictionConfidence = "Low" | "Medium" | "High";

export type MatchPrediction = {
  fixture?: Fixture;
  homeTeam: string;
  awayTeam: string;
  type: "pre-match prediction" | "live prediction";
  homeWinProbability: number;
  drawProbability?: number;
  awayWinProbability: number;
  projectedScore: {
    home: number;
    away: number;
  };
  confidence: PredictionConfidence;
  keyReasons: string[];
  unavailable: string[];
};
