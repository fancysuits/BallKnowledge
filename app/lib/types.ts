export type Sport = "football" | "basketball";

export type MatchFilter = "all" | "live" | "upcoming" | "finished";

export type FootballMatch = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  league?: string;
  country?: string;
  date?: string | null;
  venue?: string;
  status?: string;
  minute?: number | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  stats?: MatchDetailStats;
};

export type BasketballGame = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  date?: string | null;
  venue?: string;
  status?: string;
  minute?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  stats?: MatchDetailStats;
};

export type MatchDetailStats = {
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
  headToHead?: {
    games: number;
    homeWins: number;
    awayWins: number;
    draws: number;
    averageGoals: number;
  };
};

export type SportsApiResponse<TItem, TKey extends string> = {
  error: string | null;
  lastUpdated: string | null;
} & Record<TKey, TItem[]>;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isPrediction?: boolean;
};
