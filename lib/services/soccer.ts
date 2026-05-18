import type {
  Fixture,
  League,
  LeagueId,
  MatchStatistic,
  Standing,
  TeamStatistic
} from "@/lib/types/sports";

export const soccerLeagues: League[] = [
  {
    id: "premier-league",
    name: "Premier League",
    sport: "soccer",
    country: "England",
    season: "2025",
    providerId: 39
  },
  {
    id: "la-liga",
    name: "La Liga",
    sport: "soccer",
    country: "Spain",
    season: "2025",
    providerId: 140
  }
];

type SoccerBundle = {
  fixtures: Fixture[];
  standings: Standing[];
  teamStatistics: TeamStatistic[];
  matchStatistics: MatchStatistic[];
  providerNotes: string[];
};

type ApiSportsFixture = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      elapsed?: number | null;
    };
    venue?: {
      name?: string;
    };
  };
  league: {
    id: number;
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
  goals: {
    home: number | null;
    away: number | null;
  };
};

type ApiSportsTeam = {
  team: {
    id: number;
    name: string;
    logo?: string;
  };
};

type ApiSportsStandingResponse = {
  league?: {
    standings?: Array<
      Array<{
        rank: number;
        team: {
          name: string;
        };
        points: number;
        goalsDiff: number;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
        };
      }>
    >;
  };
};

type ApiSportsFixtureStatistic = {
  statistics: Array<{
    type: string;
    value: number | string | null;
  }>;
};

export async function getSoccerBundle(question: string): Promise<SoccerBundle> {
  const configured = Boolean(
    process.env.SOCCER_API_BASE_URL && process.env.SOCCER_API_KEY
  );

  if (!configured) {
    return getPlaceholderSoccerBundle(question);
  }

  try {
    return await getApiSportsSoccerBundle(question);
  } catch (error) {
    console.error("Soccer provider request failed", error);
    return getPlaceholderSoccerBundle(question, [
      "Soccer provider request failed, so placeholder data is being used."
    ]);
  }
}

async function getApiSportsSoccerBundle(question: string): Promise<SoccerBundle> {
  const inferredLeague = inferLeague(question);
  const league = soccerLeagues.find((item) => item.id === inferredLeague);
  const inferredTeams = inferTeamsFromQuestion(question);

  const providerTeams = inferredTeams
    ? await Promise.all(inferredTeams.map((team) => fetchTeamByName(team)))
    : [];

  const fixturesPayload = await fetchApiSports<{ response?: ApiSportsFixture[] }>(
    buildFixturesPath(question, league, providerTeams)
  );

  const fixtures = selectRelevantFixtures(
    fixturesPayload.response || [],
    providerTeams
  ).slice(0, 40);

  const normalizedFixtures = fixtures.map((fixture) =>
    normalizeApiSportsFixture(fixture, inferredLeague)
  );

  const standings = await fetchStandings(league);

  const teamStatistics = await buildTeamStatisticsFromRecentGames(
    fixtures,
    normalizedFixtures,
    inferredLeague
  );

  const matchStatistics = await buildMatchStatistics(fixtures);

  return {
    fixtures: normalizedFixtures,
    standings,
    teamStatistics,
    matchStatistics,
    providerNotes: [
      "Using API-Sports football data. Logos are mapped from teams.home.logo and teams.away.logo.",
      "Predictions combine live match stats when available, recent goals, average goals allowed, standings, and capped head-to-head context.",
      ...(inferredTeams && !fixtures.length
        ? ["No exact fixture was found for the requested teams."]
        : []),
      ...(providerTeams.some((team) => !team)
        ? ["One or more teams could not be resolved through API-Sports team search."]
        : [])
    ]
  };
}

function buildFixturesPath(
  question: string,
  league?: League,
  teams: Array<ApiSportsTeam | null> = []
): string {
  const lowerQuestion = question.toLowerCase();
  const searchParams = new URLSearchParams();

  const wantsLiveData =
    lowerQuestion.includes("live") ||
    lowerQuestion.includes("praegu") ||
    lowerQuestion.includes("mitmes minut") ||
    lowerQuestion.includes("minut") ||
    lowerQuestion.includes("minute") ||
    lowerQuestion.includes("score") ||
    lowerQuestion.includes("skoor") ||
    lowerQuestion.includes("seis") ||
    lowerQuestion.includes("käib") ||
    lowerQuestion.includes("kaib") ||
    lowerQuestion.includes("mängib") ||
    lowerQuestion.includes("mangib") ||
    lowerQuestion.includes("currently") ||
    lowerQuestion.includes("right now");

  if (wantsLiveData) {
    searchParams.set("live", "all");
    return `/fixtures?${searchParams.toString()}`;
  }

  if (lowerQuestion.includes("today") || lowerQuestion.includes("täna")) {
    searchParams.set("date", new Date().toISOString().slice(0, 10));
  } else {
    searchParams.set("next", "40");
  }

  const primaryTeam = teams.find(Boolean);
  if (primaryTeam?.team.id) {
    searchParams.set("team", String(primaryTeam.team.id));
  }

  if (league?.providerId) {
    searchParams.set("league", String(league.providerId));
    searchParams.set("season", league.season);
  }

  return `/fixtures?${searchParams.toString()}`;
}

function selectRelevantFixtures(
  fixtures: ApiSportsFixture[],
  teams: Array<ApiSportsTeam | null>
): ApiSportsFixture[] {
  const teamIds = teams
    .map((team) => team?.team.id)
    .filter((teamId): teamId is number => Boolean(teamId));

  if (teamIds.length < 2) {
    return fixtures;
  }

  const exact = fixtures.filter((fixture) => {
    const fixtureTeamIds = [fixture.teams.home.id, fixture.teams.away.id];
    return teamIds.every((teamId) => fixtureTeamIds.includes(teamId));
  });

  return exact.length ? exact : fixtures;
}

async function fetchStandings(league?: League): Promise<Standing[]> {
  if (!league?.providerId) {
    return [];
  }

  try {
    const payload = await fetchApiSports<{ response?: ApiSportsStandingResponse[] }>(
      `/standings?league=${league.providerId}&season=${league.season}`
    );

    const leagueStandings = payload.response?.[0]?.league?.standings?.[0] || [];

    return leagueStandings.slice(0, 12).map((standing) => ({
      leagueId: league.id,
      rank: standing.rank,
      team: standing.team.name,
      played: standing.all.played,
      wins: standing.all.win,
      draws: standing.all.draw,
      losses: standing.all.lose,
      points: standing.points,
      differential: standing.goalsDiff
    }));
  } catch (error) {
    console.error("Soccer standings request failed", error);
    return [];
  }
}

async function buildTeamStatisticsFromRecentGames(
  providerFixtures: ApiSportsFixture[],
  normalizedFixtures: Fixture[],
  leagueId: LeagueId
): Promise<TeamStatistic[]> {
  const teams = new Map<number, { name: string; fallback: Fixture[] }>();

  providerFixtures.forEach((fixture, index) => {
    const normalized = normalizedFixtures[index];

    teams.set(fixture.teams.home.id, {
      name: fixture.teams.home.name,
      fallback: [normalized]
    });

    teams.set(fixture.teams.away.id, {
      name: fixture.teams.away.name,
      fallback: [normalized]
    });
  });

  const statistics = await Promise.all(
    Array.from(teams.entries()).map(async ([teamId, team]) => {
      const recentGames = await fetchRecentTeamGames(teamId);
      const sourceGames = recentGames.length ? recentGames : team.fallback;

      return buildTeamStatistic(team.name, teamId, sourceGames, leagueId);
    })
  );

  return statistics;
}

async function fetchRecentTeamGames(teamId: number): Promise<Fixture[]> {
  try {
    const payload = await fetchApiSports<{ response?: ApiSportsFixture[] }>(
      `/fixtures?team=${teamId}&last=5`
    );

    return (payload.response || []).map((fixture) =>
      normalizeApiSportsFixture(fixture, inferLeague(""))
    );
  } catch (error) {
    console.error("Recent soccer games request failed", error);
    return [];
  }
}

function buildTeamStatistic(
  teamName: string,
  teamId: number,
  fixtures: Fixture[],
  leagueId: LeagueId
): TeamStatistic {
  const teams = new Map<
    string,
    {
      awayAgainst: number[];
      awayFor: number[];
      for: number[];
      against: number[];
      homeAgainst: number[];
      homeFor: number[];
      results: string[];
    }
  >();

  fixtures.forEach((fixture) => {
    const homeGoals = fixture.score?.home ?? 0;
    const awayGoals = fixture.score?.away ?? 0;

    const home =
      teams.get(fixture.homeTeam) ||
      createTeamAccumulator();

    const away =
      teams.get(fixture.awayTeam) ||
      createTeamAccumulator();

    home.for.push(homeGoals);
    home.against.push(awayGoals);
    home.homeFor.push(homeGoals);
    home.homeAgainst.push(awayGoals);
    home.results.push(resultFor(homeGoals, awayGoals));

    away.for.push(awayGoals);
    away.against.push(homeGoals);
    away.awayFor.push(awayGoals);
    away.awayAgainst.push(homeGoals);
    away.results.push(resultFor(awayGoals, homeGoals));

    teams.set(fixture.homeTeam, home);
    teams.set(fixture.awayTeam, away);
  });

  const stats = teams.get(teamName) || createTeamAccumulator();

  return {
    team: teamName,
    leagueId,
    form: stats.results.slice(-5).join("-") || "TBD",
    scoringAverage: average(stats.for) || 1.2,
    concededAverage: average(stats.against) || 1.1,
    homeScoringAverage: average(stats.homeFor) || undefined,
    homeConcededAverage: average(stats.homeAgainst) || undefined,
    awayScoringAverage: average(stats.awayFor) || undefined,
    awayConcededAverage: average(stats.awayAgainst) || undefined,
    recentGoalsFor: stats.for.slice(-5),
    recentGoalsAgainst: stats.against.slice(-5),
    notes: [
      `Provider team id: ${teamId}`,
      `Recent goals for: ${stats.for.slice(-5).join(", ") || "n/a"}`,
      `Recent goals against: ${stats.against.slice(-5).join(", ") || "n/a"}`
    ]
  };
}

function createTeamAccumulator() {
  return {
    awayAgainst: [],
    awayFor: [],
    for: [],
    against: [],
    homeAgainst: [],
    homeFor: [],
    results: []
  };
}

async function buildMatchStatistics(
  fixtures: ApiSportsFixture[]
): Promise<MatchStatistic[]> {
  const statistics = await Promise.all(
    fixtures.slice(0, 4).map(async (fixture) => {
      const normalizedStatus = normalizeStatus(fixture.fixture.status.short);
      const fixtureId = String(fixture.fixture.id);

      const liveStats =
        normalizedStatus === "live"
          ? await fetchLiveStatistics(fixture.fixture.id)
          : null;

      const headToHead = await fetchHeadToHead(
        fixture.teams.home.id,
        fixture.teams.away.id
      );

      return {
        fixtureId,
        source: normalizedStatus === "live" ? "live" : "head-to-head",
        liveMinute:
          typeof fixture.fixture.status.elapsed === "number"
            ? fixture.fixture.status.elapsed
            : undefined,
        ...(headToHead ? { headToHead } : {}),
        ...(liveStats || {})
      } satisfies MatchStatistic;
    })
  );

  return statistics;
}

async function fetchLiveStatistics(
  fixtureId: number
): Promise<Pick<MatchStatistic, "possession" | "shots" | "expectedGoals"> | null> {
  try {
    const payload = await fetchApiSports<{ response?: ApiSportsFixtureStatistic[] }>(
      `/fixtures/statistics?fixture=${fixtureId}`
    );

    const [home, away] = payload.response || [];

    if (!home || !away) {
      return null;
    }

    return {
      possession: {
        home: parseStatisticPercent(home, "Ball Possession"),
        away: parseStatisticPercent(away, "Ball Possession")
      },
      shots: {
        home: parseStatisticNumber(home, "Total Shots"),
        away: parseStatisticNumber(away, "Total Shots")
      },
      expectedGoals: {
        home:
          parseStatisticNumber(home, "expected_goals") ||
          parseStatisticNumber(home, "Expected Goals"),
        away:
          parseStatisticNumber(away, "expected_goals") ||
          parseStatisticNumber(away, "Expected Goals")
      }
    };
  } catch (error) {
    console.error("Live soccer statistics request failed", error);
    return null;
  }
}

async function fetchHeadToHead(
  homeTeamId: number,
  awayTeamId: number
): Promise<MatchStatistic["headToHead"] | null> {
  try {
    const payload = await fetchApiSports<{ response?: ApiSportsFixture[] }>(
      `/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=5`
    );

    const games = payload.response || [];

    if (!games.length) {
      return null;
    }

    const summary = games.reduce(
      (summary, game) => {
        const homeGoals = game.goals.home ?? 0;
        const awayGoals = game.goals.away ?? 0;
        const isRequestedHome = game.teams.home.id === homeTeamId;
        const requestedHomeGoals = isRequestedHome ? homeGoals : awayGoals;
        const requestedAwayGoals = isRequestedHome ? awayGoals : homeGoals;

        return {
          games: summary.games + 1,
          homeWins:
            summary.homeWins + (requestedHomeGoals > requestedAwayGoals ? 1 : 0),
          awayWins:
            summary.awayWins + (requestedAwayGoals > requestedHomeGoals ? 1 : 0),
          draws:
            summary.draws + (requestedHomeGoals === requestedAwayGoals ? 1 : 0),
          averageGoals:
            summary.averageGoals + requestedHomeGoals + requestedAwayGoals
        };
      },
      { games: 0, homeWins: 0, awayWins: 0, draws: 0, averageGoals: 0 }
    );

    return {
      ...summary,
      averageGoals: summary.games ? summary.averageGoals / summary.games : 0
    };
  } catch (error) {
    console.error("Head-to-head soccer request failed", error);
    return null;
  }
}

function normalizeApiSportsFixture(
  item: ApiSportsFixture,
  fallbackLeagueId: LeagueId
): Fixture {
  const league =
    soccerLeagues.find((candidate) => candidate.providerId === item.league.id) ||
    soccerLeagues.find((candidate) => candidate.id === fallbackLeagueId);

  return {
    id: String(item.fixture.id),
    leagueId: league?.id || fallbackLeagueId,
    startsAt: item.fixture.date,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeLogo: item.teams.home.logo,
    awayLogo: item.teams.away.logo,
    venue: item.fixture.venue?.name,
    status: normalizeStatus(item.fixture.status.short),
    minute: item.fixture.status.elapsed ?? null,
    score:
      item.goals.home === null || item.goals.away === null
        ? undefined
        : {
            home: item.goals.home,
            away: item.goals.away
          }
  };
}

async function fetchTeamByName(teamName: string): Promise<ApiSportsTeam | null> {
  try {
    const payload = await fetchApiSports<{ response?: ApiSportsTeam[] }>(
      `/teams?search=${encodeURIComponent(teamName)}`
    );
    const exact = payload.response?.find(
      (item) => item.team.name.toLowerCase() === teamName.toLowerCase()
    );

    return exact || payload.response?.[0] || null;
  } catch (error) {
    console.error("Soccer team search request failed", error);
    return null;
  }
}

function inferTeamsFromQuestion(question: string): string[] | null {
  const match = question.match(
    /(?:prediction|predict|ennustus)?\s*([a-zA-Z\s.]+?)\s+(?:vs|v|against|-)\s+([a-zA-Z\s.]+?)(?:\s+using|\s+with|\?|$)/i
  );

  if (!match) {
    return null;
  }

  return [cleanTeamName(match[1]), cleanTeamName(match[2])].filter(Boolean);
}

function cleanTeamName(teamName: string): string {
  return teamName
    .replace(/^(prediction|predict|ennustus)\s+/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function fetchApiSports<T>(path: string): Promise<T> {
  const baseUrl =
    process.env.SOCCER_API_BASE_URL || "https://v3.football.api-sports.io";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: {
      "x-apisports-key": process.env.SOCCER_API_KEY || ""
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`API-Sports football request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function inferLeague(question: string): LeagueId {
  return question.toLowerCase().includes("liga") ? "la-liga" : "premier-league";
}

function normalizeStatus(status: string): Fixture["status"] {
  const live = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
  const finished = new Set(["FT", "AET", "PEN"]);

  if (live.has(status)) {
    return "live";
  }

  if (finished.has(status)) {
    return "final";
  }

  return "scheduled";
}

function parseStatisticNumber(
  teamStatistics: ApiSportsFixtureStatistic,
  statisticName: string
): number {
  const value = teamStatistics.statistics.find(
    (statistic) => statistic.type === statisticName
  )?.value;

  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(String(value || "0")) || 0;
}

function parseStatisticPercent(
  teamStatistics: ApiSportsFixtureStatistic,
  statisticName: string
): number {
  const value = teamStatistics.statistics.find(
    (statistic) => statistic.type === statisticName
  )?.value;

  return Number.parseInt(String(value || "0").replace("%", ""), 10) || 0;
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resultFor(goalsFor: number, goalsAgainst: number): string {
  if (goalsFor > goalsAgainst) {
    return "W";
  }

  if (goalsFor < goalsAgainst) {
    return "L";
  }

  return "D";
}

function getPlaceholderSoccerBundle(
  question: string,
  extraNotes: string[] = []
): SoccerBundle {
  const inferredLeague: LeagueId = question.toLowerCase().includes("liga")
    ? "la-liga"
    : "premier-league";

  const fixtures: Fixture[] = [
    {
      id: "pl-ars-mci",
      leagueId: "premier-league",
      startsAt: "2026-05-17T16:30:00.000Z",
      homeTeam: "Arsenal",
      awayTeam: "Manchester City",
      venue: "Emirates Stadium",
      status: "scheduled"
    },
    {
      id: "pl-liv-che",
      leagueId: "premier-league",
      startsAt: "2026-05-18T19:00:00.000Z",
      homeTeam: "Liverpool",
      awayTeam: "Chelsea",
      venue: "Anfield",
      status: "scheduled"
    },
    {
      id: "lal-rma-bar",
      leagueId: "la-liga",
      startsAt: "2026-05-18T20:00:00.000Z",
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      venue: "Santiago Bernabeu",
      status: "scheduled"
    }
  ];

  return {
    fixtures: fixtures.filter((fixture) => fixture.leagueId === inferredLeague),
    standings: ([
      {
        leagueId: "premier-league",
        rank: 1,
        team: "Arsenal",
        played: 36,
        wins: 25,
        draws: 7,
        losses: 4,
        points: 82,
        differential: 44
      },
      {
        leagueId: "premier-league",
        rank: 2,
        team: "Manchester City",
        played: 36,
        wins: 24,
        draws: 8,
        losses: 4,
        points: 80,
        differential: 48
      },
      {
        leagueId: "la-liga",
        rank: 1,
        team: "Real Madrid",
        played: 36,
        wins: 26,
        draws: 6,
        losses: 4,
        points: 84,
        differential: 51
      },
      {
        leagueId: "la-liga",
        rank: 2,
        team: "Barcelona",
        played: 36,
        wins: 24,
        draws: 7,
        losses: 5,
        points: 79,
        differential: 46
      }
    ] satisfies Standing[]).filter(
      (standing) => standing.leagueId === inferredLeague
    ),
    teamStatistics: ([
      {
        leagueId: "premier-league",
        team: "Arsenal",
        form: "W-W-D-W-L",
        scoringAverage: 2.2,
        concededAverage: 0.9,
        notes: ["Strong home press", "High set-piece conversion"]
      },
      {
        leagueId: "premier-league",
        team: "Manchester City",
        form: "W-D-W-W-W",
        scoringAverage: 2.4,
        concededAverage: 1.0,
        notes: ["Elite chance creation", "Deep possession spells"]
      },
      {
        leagueId: "la-liga",
        team: "Real Madrid",
        form: "W-W-W-D-W",
        scoringAverage: 2.3,
        concededAverage: 0.8,
        notes: ["Fast transitions", "Late-game scoring edge"]
      },
      {
        leagueId: "la-liga",
        team: "Barcelona",
        form: "W-L-W-D-W",
        scoringAverage: 2.0,
        concededAverage: 1.1,
        notes: ["High possession", "Occasional vulnerability behind fullbacks"]
      }
    ] satisfies TeamStatistic[]).filter((stat) => stat.leagueId === inferredLeague),
    matchStatistics: [
      {
        fixtureId: inferredLeague === "la-liga" ? "lal-rma-bar" : "pl-ars-mci",
        possession: { home: 51, away: 49 },
        shots: { home: 14, away: 13 },
        expectedGoals: { home: 1.7, away: 1.6 }
      }
    ],
    providerNotes: [
      "Using placeholder soccer data. Add SOCCER_API_BASE_URL and SOCCER_API_KEY, then replace lib/services/soccer.ts with provider calls.",
      ...extraNotes
    ]
  };
}