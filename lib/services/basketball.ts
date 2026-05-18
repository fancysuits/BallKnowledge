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
    season: "2025-2026",
    providerId: 12
  }
];

type BasketballBundle = {
  fixtures: Fixture[];
  standings: Standing[];
  teamStatistics: TeamStatistic[];
  matchStatistics: MatchStatistic[];
  providerNotes: string[];
};

type ApiSportsBasketballGame = {
  id: number;
  date: string;
  status: {
    short: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo?: string;
    };
    away: {
      id: number;
      name: string;
      logo?: string;
    };
  };
  scores: {
    home?: {
      total?: number | null;
    };
    away?: {
      total?: number | null;
    };
  };
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

  try {
    return await getApiSportsBasketballBundle(question);
  } catch (error) {
    console.error("Basketball provider request failed", error);
    return getPlaceholderBasketballBundle(question, [
      "Basketball provider request failed, so placeholder data is being used."
    ]);
  }
}

async function getApiSportsBasketballBundle(
  question: string
): Promise<BasketballBundle> {
  const gamesPayload = await fetchBasketballApi<{ response?: ApiSportsBasketballGame[] }>(
    buildBasketballGamesPath(question)
  );
  const games = (gamesPayload.response || []).slice(0, 8);
  const fixtures = games.map(normalizeBasketballGame);
  const teamStatistics = await buildTeamStatisticsFromRecentGames(games, fixtures);

  return {
    fixtures,
    standings: [],
    teamStatistics,
    matchStatistics: [],
    providerNotes: [
      "Using API-Sports basketball data. Logos are mapped from teams.home.logo and teams.away.logo.",
      "Basketball predictions use current score for live games and recent scoring averages when available."
    ]
  };
}

function buildBasketballGamesPath(question: string): string {
  const searchParams = new URLSearchParams();
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("live") || lowerQuestion.includes("praegu")) {
    searchParams.set("live", "all");
    return `/games?${searchParams.toString()}`;
  }

  searchParams.set("league", String(basketballLeagues[0].providerId));
  searchParams.set("season", basketballLeagues[0].season);

  if (lowerQuestion.includes("today") || lowerQuestion.includes("täna")) {
    searchParams.set("date", new Date().toISOString().slice(0, 10));
  }

  return `/games?${searchParams.toString()}`;
}

function normalizeBasketballGame(game: ApiSportsBasketballGame): Fixture {
  const homeScore = game.scores.home?.total ?? null;
  const awayScore = game.scores.away?.total ?? null;

  return {
    id: String(game.id),
    leagueId: "nba",
    startsAt: game.date,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    homeLogo: game.teams.home.logo,
    awayLogo: game.teams.away.logo,
    status: normalizeBasketballStatus(game.status.short),
    score:
      homeScore === null || awayScore === null
        ? undefined
        : {
            home: homeScore,
            away: awayScore
          }
  };
}

async function buildTeamStatisticsFromRecentGames(
  providerGames: ApiSportsBasketballGame[],
  fixtures: Fixture[]
): Promise<TeamStatistic[]> {
  const teams = new Map<number, { name: string; fallback: Fixture[] }>();

  providerGames.forEach((game, index) => {
    teams.set(game.teams.home.id, {
      name: game.teams.home.name,
      fallback: [fixtures[index]]
    });
    teams.set(game.teams.away.id, {
      name: game.teams.away.name,
      fallback: [fixtures[index]]
    });
  });

  return Promise.all(
    Array.from(teams.entries()).map(async ([teamId, team]) => {
      const recentGames = await fetchRecentTeamGames(teamId);
      const sourceGames = recentGames.length ? recentGames : team.fallback;
      return buildTeamStatistic(team.name, teamId, sourceGames);
    })
  );
}

async function fetchRecentTeamGames(teamId: number): Promise<Fixture[]> {
  try {
    const payload = await fetchBasketballApi<{ response?: ApiSportsBasketballGame[] }>(
      `/games?team=${teamId}&season=${basketballLeagues[0].season}`
    );

    return (payload.response || [])
      .filter((game) => normalizeBasketballStatus(game.status.short) === "final")
      .slice(-5)
      .map(normalizeBasketballGame);
  } catch (error) {
    console.error("Recent basketball games request failed", error);
    return [];
  }
}

function buildTeamStatistic(
  teamName: string,
  teamId: number,
  fixtures: Fixture[]
): TeamStatistic {
  const teams = new Map<string, { for: number[]; against: number[]; results: string[] }>();

  fixtures.forEach((fixture) => {
    const homeScore = fixture.score?.home ?? 0;
    const awayScore = fixture.score?.away ?? 0;
    const home = teams.get(fixture.homeTeam) || { for: [], against: [], results: [] };
    const away = teams.get(fixture.awayTeam) || { for: [], against: [], results: [] };

    home.for.push(homeScore);
    home.against.push(awayScore);
    home.results.push(resultFor(homeScore, awayScore));
    away.for.push(awayScore);
    away.against.push(homeScore);
    away.results.push(resultFor(awayScore, homeScore));
    teams.set(fixture.homeTeam, home);
    teams.set(fixture.awayTeam, away);
  });

  const stats = teams.get(teamName) || { for: [], against: [], results: [] };

  return {
    team: teamName,
    leagueId: "nba",
    form: stats.results.slice(-5).join("-") || "TBD",
    scoringAverage: average(stats.for) || 110,
    concededAverage: average(stats.against) || 110,
    recentGoalsFor: stats.for.slice(-5),
    recentGoalsAgainst: stats.against.slice(-5),
    notes: [
      `Provider team id: ${teamId}`,
      `Recent points for: ${stats.for.slice(-5).join(", ") || "n/a"}`,
      `Recent points against: ${stats.against.slice(-5).join(", ") || "n/a"}`
    ]
  };
}

async function fetchBasketballApi<T>(path: string): Promise<T> {
  const baseUrl =
    process.env.BASKETBALL_API_BASE_URL || "https://v1.basketball.api-sports.io";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: {
      "x-apisports-key": process.env.BASKETBALL_API_KEY || ""
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`API-Sports basketball request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeBasketballStatus(status: string): Fixture["status"] {
  if (["Q1", "Q2", "Q3", "Q4", "OT", "BT", "HT"].includes(status)) {
    return "live";
  }

  if (["FT", "AOT"].includes(status)) {
    return "final";
  }

  return "scheduled";
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resultFor(pointsFor: number, pointsAgainst: number): string {
  if (pointsFor > pointsAgainst) {
    return "W";
  }

  if (pointsFor < pointsAgainst) {
    return "L";
  }

  return "D";
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
