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
    "kes võidab",
    "who will win",
    "win probability",
    "likely final score",
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
    "praegu",
    "hetkel",
    "live",
    "current"
  ].some((term) => lower.includes(term));
}

function buildDeterministicPrediction(
  question: string,
  sportsContext: SportsContext
): string {
  const fixture = selectFixture(question, sportsContext.fixtures);

  if (!fixture) {
    return "Ma ei leidnud selle küsimuse jaoks sobivat mängu konteksti.";
  }

  const homeStats = findTeamStats(fixture.homeTeam, sportsContext.teamStatistics);
  const awayStats = findTeamStats(fixture.awayTeam, sportsContext.teamStatistics);
  const matchStats = sportsContext.matchStatistics.find(
    (statistic) => statistic.fixtureId === fixture.id
  );

  if (!homeStats || !awayStats) {
    return [
      `Mäng: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
      "Ennustus: hetkel pole piisavalt tiimide vormiandmeid, et kindlat tõenäosust arvutada.",
      "See vastus ei kasutanud OpenAI-d."
    ].join("\n");
  }

  const liveSignal = fixture.status === "live" ? liveStrengthSignal(matchStats) : null;
  const h2hSignal = headToHeadSignal(matchStats);
  const homeStrength =
    homeStats.scoringAverage -
    awayStats.concededAverage +
    h2hSignal.homeBoost +
    (liveSignal?.homeBoost || 0);
  const awayStrength =
    awayStats.scoringAverage -
    homeStats.concededAverage +
    h2hSignal.awayBoost +
    (liveSignal?.awayBoost || 0);
  const totalStrength = Math.max(homeStrength + awayStrength, 0.1);
  const homeProbability = clamp(
    Math.round((homeStrength / totalStrength) * 100),
    35,
    65
  );
  const awayProbability = 100 - homeProbability;
  const projectedHomeScore = estimateScore(homeStats, fixture.status);
  const projectedAwayScore = estimateScore(awayStats, fixture.status);

  return [
    `Mäng: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
    `Tüüp: ${fixture.status === "live" ? "live-mängu ennustus" : "mängueelne ennustus"}`,
    `Võidutõenäosus: ${fixture.homeTeam} ${homeProbability}% | ${fixture.awayTeam} ${awayProbability}%`,
    `Tõenäoline skoor: ${projectedHomeScore}-${projectedAwayScore}`,
    `Keskmised: ${fixture.homeTeam} lööb/teeb ${homeStats.scoringAverage.toFixed(1)}, lubab ${homeStats.concededAverage.toFixed(1)}; ${fixture.awayTeam} lööb/teeb ${awayStats.scoringAverage.toFixed(1)}, lubab ${awayStats.concededAverage.toFixed(1)}.`,
    `Viimased mängud: ${fixture.homeTeam} ${formatRecent(homeStats)}; ${fixture.awayTeam} ${formatRecent(awayStats)}.`,
    h2hSignal.description,
    liveSignal?.description || "Live-statistikat pole selle mängu jaoks saadaval, seega kasutan vormi, keskmisi ja omavahelisi mänge.",
    "See deterministlik ennustus ei kasutanud OpenAI-d."
  ]
    .filter(Boolean)
    .join("\n");
}

function selectFixture(question: string, fixtures: Fixture[]): Fixture | undefined {
  const lower = question.toLowerCase();
  return (
    fixtures.find(
      (fixture) =>
        lower.includes(fixture.homeTeam.toLowerCase()) ||
        lower.includes(fixture.awayTeam.toLowerCase())
    ) || fixtures[0]
  );
}

function findTeamStats(
  teamName: string,
  teamStatistics: TeamStatistic[]
): TeamStatistic | undefined {
  return teamStatistics.find((statistic) => statistic.team === teamName);
}

function estimateScore(stats: TeamStatistic, status: Fixture["status"]): number {
  const recentAverage = average(stats.recentGoalsFor || []);
  const baseScore =
    stats.scoringAverage * 0.62 +
    (recentAverage || stats.scoringAverage) * 0.38;
  const liveMultiplier = status === "live" ? 1 : 1;
  return Math.max(0, Math.round(baseScore * liveMultiplier));
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
    description: `Live-signaal: ${matchStats.liveMinute ? `${matchStats.liveMinute}. minut, ` : ""}pealelöögid ${homeShots}-${awayShots}, xG ${homeXg.toFixed(2)}-${awayXg.toFixed(2)}, pallivaldamine ${homePossession}-${awayPossession}%.`
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
    description: `Omavahelised mängud: viimased ${headToHead.games}, kodumeeskonna võite ${headToHead.homeWins}, võõrsiltiimi võite ${headToHead.awayWins}, viike ${headToHead.draws}, keskmiselt ${headToHead.averageGoals.toFixed(1)} väravat/punktisummat.`
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
