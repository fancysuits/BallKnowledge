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
    season: "2026"
  },
  {
    id: "la-liga",
    name: "La Liga",
    sport: "soccer",
    country: "Spain",
    season: "2026"
  }
];

type SoccerBundle = {
  fixtures: Fixture[];
  standings: Standing[];
  teamStatistics: TeamStatistic[];
  matchStatistics: MatchStatistic[];
  providerNotes: string[];
};

export async function getSoccerBundle(question: string): Promise<SoccerBundle> {
  const configured = Boolean(
    process.env.SOCCER_API_BASE_URL && process.env.SOCCER_API_KEY
  );

  if (!configured) {
    return getPlaceholderSoccerBundle(question);
  }

  // Provider integration placeholder:
  // 1. Detect requested league/team/date from the question.
  // 2. Fetch live scores, fixtures, standings, team stats, and match stats.
  // 3. Normalize provider-specific payloads into the shared app types.
  return getPlaceholderSoccerBundle(question, [
    "Soccer provider credentials are present, but the provider adapter is still a placeholder."
  ]);
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
    standings: [
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
    ].filter((standing) => standing.leagueId === inferredLeague),
    teamStatistics: [
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
    ].filter((stat) => stat.leagueId === inferredLeague),
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
