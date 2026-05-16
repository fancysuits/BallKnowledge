import type {
  Fixture,
  League,
  MatchStatistic,
  Standing,
  TeamStatistic
} from "@/lib/types/sports";

export const basketballLeagues: League[] = [
  {
    id: "nba",
    name: "NBA",
    sport: "basketball",
    country: "United States",
    season: "2025-26"
  }
];

type BasketballBundle = {
  fixtures: Fixture[];
  standings: Standing[];
  teamStatistics: TeamStatistic[];
  matchStatistics: MatchStatistic[];
  providerNotes: string[];
};

export async function getBasketballBundle(
  question: string
): Promise<BasketballBundle> {
  const configured = Boolean(
    process.env.BASKETBALL_API_BASE_URL && process.env.BASKETBALL_API_KEY
  );

  if (!configured) {
    return getPlaceholderBasketballBundle(question);
  }

  // Provider integration placeholder:
  // 1. Detect requested team/date from the question.
  // 2. Fetch NBA live scores, fixtures, standings, team stats, and box score data.
  // 3. Normalize provider-specific payloads into the shared app types.
  return getPlaceholderBasketballBundle(question, [
    "Basketball provider credentials are present, but the provider adapter is still a placeholder."
  ]);
}

function getPlaceholderBasketballBundle(
  _question: string,
  extraNotes: string[] = []
): BasketballBundle {
  return {
    fixtures: [
      {
        id: "nba-bos-den",
        leagueId: "nba",
        startsAt: "2026-05-17T23:30:00.000Z",
        homeTeam: "Boston Celtics",
        awayTeam: "Denver Nuggets",
        venue: "TD Garden",
        status: "scheduled"
      },
      {
        id: "nba-lal-nyk",
        leagueId: "nba",
        startsAt: "2026-05-19T00:00:00.000Z",
        homeTeam: "Los Angeles Lakers",
        awayTeam: "New York Knicks",
        venue: "Crypto.com Arena",
        status: "scheduled"
      }
    ],
    standings: [
      {
        leagueId: "nba",
        rank: 1,
        team: "Boston Celtics",
        played: 82,
        wins: 61,
        losses: 21,
        points: 0,
        differential: 10.4
      },
      {
        leagueId: "nba",
        rank: 2,
        team: "Denver Nuggets",
        played: 82,
        wins: 58,
        losses: 24,
        points: 0,
        differential: 7.8
      }
    ],
    teamStatistics: [
      {
        leagueId: "nba",
        team: "Boston Celtics",
        form: "W-W-L-W-W",
        scoringAverage: 119.7,
        concededAverage: 109.3,
        notes: ["Top-tier spacing", "Switchable half-court defense"]
      },
      {
        leagueId: "nba",
        team: "Denver Nuggets",
        form: "W-L-W-W-L",
        scoringAverage: 116.2,
        concededAverage: 108.4,
        notes: ["Efficient half-court offense", "Strong defensive rebounding"]
      }
    ],
    matchStatistics: [
      {
        fixtureId: "nba-bos-den",
        rebounds: { home: 45, away: 43 },
        assists: { home: 29, away: 27 }
      }
    ],
    providerNotes: [
      "Using placeholder basketball data. Add BASKETBALL_API_BASE_URL and BASKETBALL_API_KEY, then replace lib/services/basketball.ts with provider calls.",
      ...extraNotes
    ]
  };
}
