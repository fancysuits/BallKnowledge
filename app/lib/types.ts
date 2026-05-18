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
  status?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export type BasketballGame = {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  date?: string | null;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
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
