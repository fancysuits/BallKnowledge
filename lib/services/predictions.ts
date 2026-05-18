import type {
  Fixture,
  MatchPrediction,
  MatchStatistic,
  SportsContext,
  Standing,
  TeamStatistic
} from "@/lib/types/sports";

type TeamSignal = {
  team: string;
  attack: number;
  defense: number;
  form: number;
  standings: number;
  h2h: number;
  live: number;
  score: number;
};

export function buildFootballPrediction(
  question: string,
  sportsContext: SportsContext
): MatchPrediction | null {
  const fixture = selectFixture(question, sportsContext.fixtures);
  const inferredTeams = fixture
    ? { homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam }
    : inferTeamsFromQuestion(question, sportsContext);

  if (!inferredTeams) {
    return null;
  }

  const homeStats = findTeamStats(
    inferredTeams.homeTeam,
    sportsContext.teamStatistics
  );
  const awayStats = findTeamStats(
    inferredTeams.awayTeam,
    sportsContext.teamStatistics
  );
  const homeStanding = findStanding(inferredTeams.homeTeam, sportsContext);
  const awayStanding = findStanding(inferredTeams.awayTeam, sportsContext);
  const matchStats = fixture
    ? sportsContext.matchStatistics.find((statistic) => statistic.fixtureId === fixture.id)
    : undefined;
  const unavailable: string[] = [];

  if (!homeStats) {
    unavailable.push(`${inferredTeams.homeTeam} recent form unavailable`);
  }

  if (!awayStats) {
    unavailable.push(`${inferredTeams.awayTeam} recent form unavailable`);
  }

  if (!homeStanding || !awayStanding) {
    unavailable.push("League standings unavailable or incomplete");
  }

  if (!matchStats?.headToHead?.games) {
    unavailable.push("Recent head-to-head data unavailable or limited");
  }

  if (fixture?.status === "live" && !hasLiveStats(matchStats)) {
    unavailable.push("Live shots, possession, or xG unavailable");
  }

  unavailable.push("Lineups, injuries, and odds unavailable");

  const homeSignal = buildTeamSignal({
    team: inferredTeams.homeTeam,
    stats: homeStats,
    opponentStats: awayStats,
    standing: homeStanding,
    opponentStanding: awayStanding,
    matchStats,
    fixture,
    side: "home"
  });
  const awaySignal = buildTeamSignal({
    team: inferredTeams.awayTeam,
    stats: awayStats,
    opponentStats: homeStats,
    standing: awayStanding,
    opponentStanding: homeStanding,
    matchStats,
    fixture,
    side: "away"
  });

  const isLive = fixture?.status === "live";
  const homeEdge = scoreSignal(homeSignal, isLive);
  const awayEdge = scoreSignal(awaySignal, isLive);
  const drawBase = isLive ? 0.18 : 0.24;
  const drawPressure = Math.max(0, 1 - Math.abs(homeEdge - awayEdge) / 2.8);
  const drawProbability = clamp(Math.round((drawBase + drawPressure * 0.08) * 100), 12, 32);
  const remaining = 100 - drawProbability;
  const homeShare = sigmoid(homeEdge - awayEdge);
  const homeWinProbability = clamp(Math.round(remaining * homeShare), 8, 84);
  const awayWinProbability = 100 - drawProbability - homeWinProbability;
  const projectedScore = projectScore(homeStats, awayStats, homeSignal, awaySignal, isLive);
  const confidence = getConfidence({ homeStats, awayStats, matchStats, isLive });

  return {
    fixture,
    homeTeam: inferredTeams.homeTeam,
    awayTeam: inferredTeams.awayTeam,
    type: isLive ? "live prediction" : "pre-match prediction",
    homeWinProbability,
    drawProbability,
    awayWinProbability,
    projectedScore,
    confidence,
    keyReasons: buildReasons({
      fixture,
      homeSignal,
      awaySignal,
      homeStats,
      awayStats,
      homeStanding,
      awayStanding,
      matchStats
    }),
    unavailable
  };
}

export function formatPrediction(prediction: MatchPrediction): string {
  return [
    `Match: ${prediction.homeTeam} vs ${prediction.awayTeam}`,
    `Type: ${prediction.type}`,
    `Home win: ${prediction.homeWinProbability}%`,
    prediction.drawProbability === undefined
      ? null
      : `Draw: ${prediction.drawProbability}%`,
    `Away win: ${prediction.awayWinProbability}%`,
    `Projected score: ${prediction.projectedScore.home}-${prediction.projectedScore.away}`,
    `Confidence: ${prediction.confidence}`,
    "",
    "Key reasons:",
    ...prediction.keyReasons.map((reason) => `- ${reason}`),
    "",
    "Unavailable:",
    ...prediction.unavailable.map((item) => `- ${item}`),
    "",
    "This deterministic prediction did not use OpenAI."
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildTeamSignal({
  fixture,
  matchStats,
  opponentStanding,
  opponentStats,
  side,
  standing,
  stats,
  team
}: {
  team: string;
  stats?: TeamStatistic;
  opponentStats?: TeamStatistic;
  standing?: Standing;
  opponentStanding?: Standing;
  matchStats?: MatchStatistic;
  fixture?: Fixture;
  side: "home" | "away";
}): TeamSignal {
  const sideScoring =
    side === "home" ? stats?.homeScoringAverage : stats?.awayScoringAverage;
  const sideConceded =
    side === "home" ? stats?.homeConcededAverage : stats?.awayConcededAverage;
  const attack = sideScoring ?? stats?.scoringAverage ?? 1.1;
  const defense = sideConceded ?? stats?.concededAverage ?? 1.1;
  const opponentDefense = opponentStats?.concededAverage ?? 1.1;
  const h2h = getH2HBoost(matchStats, side);
  const standings = getStandingsBoost(standing, opponentStanding);
  const form = getFormBoost(stats);
  const live = fixture?.status === "live" ? getLiveBoost(matchStats, side) : 0;
  const score = fixture?.status === "live" ? getScoreBoost(fixture, side) : 0;

  return {
    team,
    attack: attack - opponentDefense * 0.42,
    defense: 1.4 - defense,
    form,
    standings,
    h2h,
    live,
    score
  };
}

function scoreSignal(signal: TeamSignal, isLive: boolean): number {
  const preMatch =
    signal.attack * 0.36 +
    signal.defense * 0.2 +
    signal.form * 0.18 +
    signal.standings * 0.16 +
    signal.h2h * 0.1;

  if (!isLive) {
    return preMatch;
  }

  return preMatch * 0.48 + signal.live * 0.32 + signal.score * 0.2;
}

function buildReasons({
  awaySignal,
  awayStanding,
  awayStats,
  fixture,
  homeSignal,
  homeStanding,
  homeStats,
  matchStats
}: {
  fixture?: Fixture;
  homeSignal: TeamSignal;
  awaySignal: TeamSignal;
  homeStats?: TeamStatistic;
  awayStats?: TeamStatistic;
  homeStanding?: Standing;
  awayStanding?: Standing;
  matchStats?: MatchStatistic;
}): string[] {
  const reasons: string[] = [];

  if (homeSignal.form > awaySignal.form) {
    reasons.push(`${homeSignal.team} has stronger recent form.`);
  } else if (awaySignal.form > homeSignal.form) {
    reasons.push(`${awaySignal.team} has stronger recent form.`);
  } else {
    reasons.push("Recent form is broadly balanced.");
  }

  if ((homeStats?.scoringAverage || 0) > (awayStats?.scoringAverage || 0)) {
    reasons.push(`${homeSignal.team} has the better recent scoring average.`);
  } else if ((awayStats?.scoringAverage || 0) > (homeStats?.scoringAverage || 0)) {
    reasons.push(`${awaySignal.team} has the better recent scoring average.`);
  }

  if (homeStanding && awayStanding) {
    const rankLeader =
      homeStanding.rank < awayStanding.rank ? homeSignal.team : awaySignal.team;
    reasons.push(`${rankLeader} gets a small standings and goal-difference boost.`);
  }

  reasons.push(`${homeSignal.team} receives a controlled home advantage.`);

  if (matchStats?.headToHead?.games) {
    reasons.push(
      `H2H included but capped: ${matchStats.headToHead.games} recent meetings, average goals ${matchStats.headToHead.averageGoals.toFixed(1)}.`
    );
  } else {
    reasons.push("H2H data limited.");
  }

  if (fixture?.status === "live") {
    if (hasLiveStats(matchStats)) {
      reasons.push("Live minute, score, shots, possession, and xG signals override part of the pre-match model.");
    } else {
      reasons.push("Match is live, but detailed live stats are unavailable.");
    }
  }

  return reasons.slice(0, 6);
}

function projectScore(
  homeStats: TeamStatistic | undefined,
  awayStats: TeamStatistic | undefined,
  homeSignal: TeamSignal,
  awaySignal: TeamSignal,
  isLive: boolean
): { home: number; away: number } {
  const homeRecent = average(homeStats?.recentGoalsFor || []);
  const awayRecent = average(awayStats?.recentGoalsFor || []);
  const homeBase = homeStats?.homeScoringAverage || homeStats?.scoringAverage || homeRecent || 1.2;
  const awayBase = awayStats?.awayScoringAverage || awayStats?.scoringAverage || awayRecent || 1.0;
  const liveMultiplier = isLive ? 0.85 : 1;

  return {
    home: Math.max(0, Math.round((homeBase + homeSignal.attack * 0.25) * liveMultiplier)),
    away: Math.max(0, Math.round((awayBase + awaySignal.attack * 0.25) * liveMultiplier))
  };
}

function selectFixture(question: string, fixtures: Fixture[]): Fixture | undefined {
  const lower = question.toLowerCase();
  const explicit = fixtures.find((fixture) => {
    const home = fixture.homeTeam.toLowerCase();
    const away = fixture.awayTeam.toLowerCase();
    return lower.includes(home) && lower.includes(away);
  });

  return explicit || fixtures.find((fixture) => lower.includes(fixture.homeTeam.toLowerCase()) || lower.includes(fixture.awayTeam.toLowerCase())) || fixtures[0];
}

function inferTeamsFromQuestion(
  question: string,
  sportsContext: SportsContext
): { homeTeam: string; awayTeam: string } | null {
  const teams = new Set([
    ...sportsContext.teamStatistics.map((statistic) => statistic.team),
    ...sportsContext.fixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam])
  ]);
  const found = Array.from(teams).filter((team) =>
    question.toLowerCase().includes(team.toLowerCase())
  );

  if (found.length >= 2) {
    return { homeTeam: found[0], awayTeam: found[1] };
  }

  const versusMatch = question.match(/([a-zA-Z\s.]+)\s+(?:vs|v|against|-)\s+([a-zA-Z\s.]+)/i);
  if (!versusMatch) {
    return null;
  }

  return {
    homeTeam: normalizeTeamName(versusMatch[1]),
    awayTeam: normalizeTeamName(versusMatch[2])
  };
}

function normalizeTeamName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function findTeamStats(
  teamName: string,
  teamStatistics: TeamStatistic[]
): TeamStatistic | undefined {
  return teamStatistics.find(
    (statistic) => statistic.team.toLowerCase() === teamName.toLowerCase()
  );
}

function findStanding(
  teamName: string,
  sportsContext: SportsContext
): Standing | undefined {
  return sportsContext.standings.find(
    (standing) => standing.team.toLowerCase() === teamName.toLowerCase()
  );
}

function getFormBoost(stats?: TeamStatistic): number {
  if (!stats?.form || stats.form === "TBD") {
    return 0;
  }

  const outcomes = stats.form.split("-");
  return outcomes.reduce((score, outcome, index) => {
    const weight = 1 + index * 0.14;
    if (outcome === "W") {
      return score + 0.22 * weight;
    }
    if (outcome === "D") {
      return score + 0.06 * weight;
    }
    if (outcome === "L") {
      return score - 0.16 * weight;
    }
    return score;
  }, 0);
}

function getStandingsBoost(
  standing?: Standing,
  opponentStanding?: Standing
): number {
  if (!standing || !opponentStanding) {
    return 0;
  }

  const rankBoost = clamp((opponentStanding.rank - standing.rank) * 0.035, -0.28, 0.28);
  const goalDiffBoost = clamp(
    (standing.differential - opponentStanding.differential) * 0.006,
    -0.22,
    0.22
  );

  return rankBoost + goalDiffBoost;
}

function getH2HBoost(matchStats: MatchStatistic | undefined, side: "home" | "away"): number {
  const headToHead = matchStats?.headToHead;
  if (!headToHead?.games) {
    return 0;
  }

  const winEdge =
    side === "home"
      ? headToHead.homeWins - headToHead.awayWins
      : headToHead.awayWins - headToHead.homeWins;
  const sampleWeight = Math.min(headToHead.games / 5, 1);

  return clamp(winEdge * 0.08 * sampleWeight, -0.18, 0.18);
}

function getLiveBoost(matchStats: MatchStatistic | undefined, side: "home" | "away"): number {
  if (!matchStats) {
    return 0;
  }

  const ownShots = side === "home" ? matchStats.shots?.home : matchStats.shots?.away;
  const oppShots = side === "home" ? matchStats.shots?.away : matchStats.shots?.home;
  const ownXg = side === "home" ? matchStats.expectedGoals?.home : matchStats.expectedGoals?.away;
  const oppXg = side === "home" ? matchStats.expectedGoals?.away : matchStats.expectedGoals?.home;
  const ownPossession = side === "home" ? matchStats.possession?.home : matchStats.possession?.away;
  const oppPossession = side === "home" ? matchStats.possession?.away : matchStats.possession?.home;

  return (
    ((ownShots || 0) - (oppShots || 0)) * 0.035 +
    ((ownXg || 0) - (oppXg || 0)) * 0.55 +
    ((ownPossession || 0) - (oppPossession || 0)) * 0.006
  );
}

function getScoreBoost(fixture: Fixture, side: "home" | "away"): number {
  const home = fixture.score?.home || 0;
  const away = fixture.score?.away || 0;
  const edge = side === "home" ? home - away : away - home;
  const minute = fixture.minute || 0;
  const timeWeight = clamp(minute / 90, 0.25, 1);

  return edge * 0.75 * timeWeight;
}

function getConfidence({
  homeStats,
  awayStats,
  isLive,
  matchStats
}: {
  homeStats?: TeamStatistic;
  awayStats?: TeamStatistic;
  matchStats?: MatchStatistic;
  isLive: boolean;
}): "Low" | "Medium" | "High" {
  let score = 0;

  if ((homeStats?.recentGoalsFor?.length || 0) >= 5) score += 2;
  if ((awayStats?.recentGoalsFor?.length || 0) >= 5) score += 2;
  if (matchStats?.headToHead?.games) score += 1;
  if (isLive && hasLiveStats(matchStats)) score += 2;
  if (!isLive) score += 1;

  if (score >= 6) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

function hasLiveStats(matchStats?: MatchStatistic): boolean {
  return Boolean(
    matchStats?.shots ||
      matchStats?.possession ||
      matchStats?.expectedGoals ||
      matchStats?.liveMinute
  );
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
