import { NextResponse } from "next/server";
import { generateSportsPrediction } from "@/lib/services/openai";
import { buildSportsContext } from "@/lib/sports-context";
import type {
  Fixture,
  MatchStatistic,
  SportsContext,
  TeamStatistic
} from "@/lib/types/sports";

type ChatRequest = {
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ reply: "Palun kirjuta küsimus." });
    }

    const sportsContext = await buildSportsContext(message);

    const answer = looksLikePrediction(message)
      ? buildDeterministicPrediction(message, sportsContext)
      : await generateSportsPrediction({
          question: message,
          sportsContext,
          useWebSearch: needsFreshInfo(message)
        });

    return NextResponse.json({
      answer,
      reply: answer,
      context: sportsContext,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chat route failed", error);

    return NextResponse.json(
      {
        error:
          "Spordianalüütik ei saanud hetkel vastata. Proovi mõne hetke pärast uuesti.",
        reply:
          "Spordianalüütik ei saanud hetkel vastata. Proovi mõne hetke pärast uuesti."
      },
      { status: 500 }
    );
  }
}

function looksLikePrediction(message: string): boolean {
  const lower = message.toLowerCase();

  return [
    "prediction",
    "predict",
    "ennustus",
    "ennusta",
    "kes võidab",
    "kes voidab",
    "who will win",
    "win probability",
    "likely final score",
    "tõenäosus",
    "toenaosus",
    "võidutõenäosus",
    "voidutoenaosus",
    "head to head",
    "h2h"
  ].some((term) => lower.includes(term));
}

function needsFreshInfo(message: string): boolean {
  const lower = message.toLowerCase();

  return [
    "täna",
    "today",
    "latest",
    "viimane",
    "news",
    "uudis",
    "uudised",
    "praegu",
    "hetkel",
    "live",
    "current",
    "otsi",
    "otsing",
    "internet",
    "internetist",
    "veeb",
    "veebist",
    "search",
    "web",
    "google",
    "look up",
    "find online"
  ].some((term) => lower.includes(term));
}

function buildDeterministicPrediction(
  question: string,
  sportsContext: SportsContext
): string {
  const fixture = selectFixture(question, sportsContext.fixtures);

  if (!fixture) {
    return [
      "Ma ei leidnud selle küsimuse jaoks sobivat mängu.",
      "Proovi kirjutada näiteks: prediction Arsenal vs Burnley või prediction Arsenal."
    ].join("\n");
  }

  const homeStats =
    findTeamStats(fixture.homeTeam, sportsContext.teamStatistics) ||
    buildFallbackTeamStats(fixture.homeTeam);

  const awayStats =
    findTeamStats(fixture.awayTeam, sportsContext.teamStatistics) ||
    buildFallbackTeamStats(fixture.awayTeam);

  const matchStats = sportsContext.matchStatistics.find(
    (statistic) => statistic.fixtureId === fixture.id
  );

  const liveSignal = fixture.status === "live" ? liveStrengthSignal(matchStats) : null;
  const h2hSignal = headToHeadSignal(matchStats);

  const homeRecentAttack = average(homeStats.recentGoalsFor || []);
  const awayRecentAttack = average(awayStats.recentGoalsFor || []);
  const homeRecentDefense = average(homeStats.recentGoalsAgainst || []);
  const awayRecentDefense = average(awayStats.recentGoalsAgainst || []);

  const homeAttack =
    homeStats.scoringAverage * 0.55 +
    (homeRecentAttack || homeStats.scoringAverage) * 0.45;

  const awayAttack =
    awayStats.scoringAverage * 0.55 +
    (awayRecentAttack || awayStats.scoringAverage) * 0.45;

  const homeDefense =
    homeStats.concededAverage * 0.55 +
    (homeRecentDefense || homeStats.concededAverage) * 0.45;

  const awayDefense =
    awayStats.concededAverage * 0.55 +
    (awayRecentDefense || awayStats.concededAverage) * 0.45;

  const homeAdvantage = fixture.status === "live" ? 0.05 : 0.18;

  const homeStrength =
    homeAttack -
    awayDefense * 0.72 +
    homeAdvantage +
    h2hSignal.homeBoost +
    (liveSignal?.homeBoost || 0);

  const awayStrength =
    awayAttack -
    homeDefense * 0.72 +
    h2hSignal.awayBoost +
    (liveSignal?.awayBoost || 0);

  const normalizedHomeStrength = Math.max(homeStrength, 0.15);
  const normalizedAwayStrength = Math.max(awayStrength, 0.15);
  const totalStrength = normalizedHomeStrength + normalizedAwayStrength;

  const rawHomeProbability = Math.round(
    (normalizedHomeStrength / totalStrength) * 100
  );

  const homeProbability = clamp(rawHomeProbability, 25, 75);
  const awayProbability = 100 - homeProbability;

  const projectedHomeScore = estimateScore(homeStats, awayStats, true);
  const projectedAwayScore = estimateScore(awayStats, homeStats, false);

  const confidence = calculateConfidence(homeStats, awayStats, matchStats);

  return [
    `Mäng: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
    `Tüüp: ${fixture.status === "live" ? "live-mängu ennustus" : "mängueelne ennustus"}`,
    `Võidutõenäosus: ${fixture.homeTeam} ${homeProbability}% | ${fixture.awayTeam} ${awayProbability}%`,
    `Tõenäoline skoor: ${projectedHomeScore}-${projectedAwayScore}`,
    `Confidence: ${confidence}`,
    "",
    "Arvestatud signaalid:",
    `- Vorm ja keskmised: ${fixture.homeTeam} lööb/teeb keskmiselt ${homeStats.scoringAverage.toFixed(1)}, lubab ${homeStats.concededAverage.toFixed(1)}; ${fixture.awayTeam} lööb/teeb ${awayStats.scoringAverage.toFixed(1)}, lubab ${awayStats.concededAverage.toFixed(1)}.`,
    `- Viimased mängud: ${fixture.homeTeam} ${formatRecent(homeStats)}; ${fixture.awayTeam} ${formatRecent(awayStats)}.`,
    `- Home/away advantage: ${fixture.homeTeam} saab väikese kodueelise, kui mäng ei ole neutraalsel väljakul.`,
    `- ${h2hSignal.description}`,
    `- ${
      liveSignal?.description ||
      "Live-statistikat pole selle mängu jaoks saadaval või mäng pole veel alanud, seega kasutan mängueelset vormi, keskmisi ja H2H infot."
    }`,
    "",
    "Märkus: kui API ei tagasta konkreetset fixture’it või tiimide detailstatistikat, kasutatakse fallback-mudelit. Täpsemaks ennustuseks tuleb buildSportsContextis lisada rohkem recent games, shots/xG, lineupide ja vigastuste andmeid.",
    "See deterministlik ennustus ei kasutanud OpenAI-d."
  ].join("\n");
}

function selectFixture(question: string, fixtures: Fixture[]): Fixture | undefined {
  const lower = question.toLowerCase();

  const exactMatch = fixtures.find((fixture) => {
    const home = fixture.homeTeam.toLowerCase();
    const away = fixture.awayTeam.toLowerCase();

    return lower.includes(home) && lower.includes(away);
  });

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = fixtures.find((fixture) => {
    const home = fixture.homeTeam.toLowerCase();
    const away = fixture.awayTeam.toLowerCase();

    return lower.includes(home) || lower.includes(away);
  });

  if (partialMatch) {
    return partialMatch;
  }

  const teams = extractTeamsFromQuestion(question);

  if (teams.home && teams.away) {
    return {
      id: `custom-${slugify(teams.home)}-${slugify(teams.away)}`,
      leagueId: inferFallbackLeague(question),
      startsAt: new Date().toISOString(),
      homeTeam: teams.home,
      awayTeam: teams.away,
      status: "scheduled"
    };
  }

  return fixtures[0];
}

function extractTeamsFromQuestion(question: string): {
  home: string | null;
  away: string | null;
} {
  const cleaned = question
    .replace(/prediction/gi, "")
    .replace(/predict/gi, "")
    .replace(/ennustus/gi, "")
    .replace(/ennusta/gi, "")
    .trim();

  const separators = [" vs ", " v ", " - ", " against ", " vastu "];

  for (const separator of separators) {
    const index = cleaned.toLowerCase().indexOf(separator);

    if (index !== -1) {
      const home = cleaned.slice(0, index).trim();
      const away = cleaned.slice(index + separator.length).trim();

      return {
        home: normalizeTeamName(home),
        away: normalizeTeamName(away)
      };
    }
  }

  return {
    home: null,
    away: null
  };
}

function normalizeTeamName(name: string): string {
  return name
    .replace(/[?!.]/g, "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function inferFallbackLeague(question: string): Fixture["leagueId"] {
  const lower = question.toLowerCase();

  if (
    lower.includes("real madrid") ||
    lower.includes("barcelona") ||
    lower.includes("la liga")
  ) {
    return "la-liga";
  }

  return "premier-league";
}

function findTeamStats(
  teamName: string,
  teamStatistics: TeamStatistic[]
): TeamStatistic | undefined {
  return teamStatistics.find(
    (statistic) => statistic.team.toLowerCase() === teamName.toLowerCase()
  );
}

function buildFallbackTeamStats(teamName: string): TeamStatistic {
  return {
    team: teamName,
    leagueId: inferFallbackLeague(teamName),
    form: "TBD",
    scoringAverage: 1.35,
    concededAverage: 1.25,
    recentGoalsFor: [],
    recentGoalsAgainst: [],
    notes: [
      "Fallback statistics used because provider did not return detailed team history."
    ]
  };
}

function estimateScore(
  attackingTeam: TeamStatistic,
  defendingTeam: TeamStatistic,
  isHome: boolean
): number {
  const recentAttack = average(attackingTeam.recentGoalsFor || []);
  const recentDefenseAgainstOpponent = average(defendingTeam.recentGoalsAgainst || []);

  const attackBase =
    attackingTeam.scoringAverage * 0.55 +
    (recentAttack || attackingTeam.scoringAverage) * 0.45;

  const opponentDefense =
    defendingTeam.concededAverage * 0.55 +
    (recentDefenseAgainstOpponent || defendingTeam.concededAverage) * 0.45;

  const homeBoost = isHome ? 0.18 : 0;

  const projected = attackBase * 0.68 + opponentDefense * 0.32 + homeBoost;

  return Math.max(0, Math.round(projected));
}

function calculateConfidence(
  homeStats: TeamStatistic,
  awayStats: TeamStatistic,
  matchStats?: MatchStatistic
): "Low" | "Medium" | "High" {
  const homeRecentCount = homeStats.recentGoalsFor?.length || 0;
  const awayRecentCount = awayStats.recentGoalsFor?.length || 0;
  const hasH2H = Boolean(matchStats?.headToHead?.games);
  const hasLiveStats = Boolean(matchStats?.shots || matchStats?.expectedGoals);

  const score =
    homeRecentCount +
    awayRecentCount +
    (hasH2H ? 4 : 0) +
    (hasLiveStats ? 4 : 0);

  if (score >= 18) return "High";
  if (score >= 8) return "Medium";
  return "Low";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function liveStrengthSignal(matchStats?: MatchStatistic | null): {
  homeBoost: number;
  awayBoost: number;
  description: string;
} | null {
  if (!matchStats) {
    return null;
  }

  const homeShots = matchStats.shots?.home || 0;
  const awayShots = matchStats.shots?.away || 0;
  const homeXg = matchStats.expectedGoals?.home || 0;
  const awayXg = matchStats.expectedGoals?.away || 0;
  const homePossession = matchStats.possession?.home || 0;
  const awayPossession = matchStats.possession?.away || 0;

  if (!homeShots && !awayShots && !homeXg && !awayXg && !homePossession) {
    return null;
  }

  return {
    homeBoost: homeShots * 0.03 + homeXg * 0.5 + homePossession * 0.005,
    awayBoost: awayShots * 0.03 + awayXg * 0.5 + awayPossession * 0.005,
    description: `Live-signaal: ${
      matchStats.liveMinute ? `${matchStats.liveMinute}. minut, ` : ""
    }pealelöögid ${homeShots}-${awayShots}, xG ${homeXg.toFixed(
      2
    )}-${awayXg.toFixed(2)}, pallivaldamine ${homePossession}-${awayPossession}%.`
  };
}

function headToHeadSignal(matchStats?: MatchStatistic | null): {
  homeBoost: number;
  awayBoost: number;
  description: string;
} {
  const headToHead = matchStats?.headToHead;

  if (!headToHead?.games) {
    return {
      homeBoost: 0,
      awayBoost: 0,
      description: "Omavaheliste mängude andmeid pole hetkel piisavalt."
    };
  }

  return {
    homeBoost: headToHead.homeWins * 0.12,
    awayBoost: headToHead.awayWins * 0.12,
    description: `Omavahelised mängud: viimased ${headToHead.games}, kodumeeskonna võite ${headToHead.homeWins}, võõrsiltiimi võite ${headToHead.awayWins}, viike ${headToHead.draws}, keskmiselt ${headToHead.averageGoals.toFixed(
      1
    )} väravat/punktisummat.`
  };
}

function formatRecent(stats: TeamStatistic): string {
  const scored = stats.recentGoalsFor?.length
    ? stats.recentGoalsFor.join(", ")
    : "andmed puuduvad";

  const conceded = stats.recentGoalsAgainst?.length
    ? stats.recentGoalsAgainst.join(", ")
    : "andmed puuduvad";

  return `vorm ${stats.form}, tehtud ${scored}, lubatud ${conceded}`;
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}