import { NextResponse } from "next/server";
import type { BasketballGame, FootballMatch, Sport } from "@/app/lib/types";

type InsightRequest = {
  match?: FootballMatch | BasketballGame;
  sport?: Sport;
};

const insightCache = new Map<string, string>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InsightRequest;

    if (!body.match || !body.sport) {
      return NextResponse.json(
        { error: "Match context is missing." },
        { status: 400 }
      );
    }

    const cacheKey = `${body.sport}:${body.match.id}`;
    const cached = insightCache.get(cacheKey);

    if (cached) {
      return NextResponse.json({ insight: cached, cached: true });
    }

    const insight = process.env.OPENAI_API_KEY
      ? await generateOpenAIInsight(body.match, body.sport)
      : buildLocalInsight(body.match, body.sport);

    insightCache.set(cacheKey, insight);

    return NextResponse.json({ insight, cached: false });
  } catch (error) {
    console.error("Match insight failed", error);
    return NextResponse.json(
      { error: "AI insight could not be generated right now." },
      { status: 500 }
    );
  }
}

async function generateOpenAIInsight(
  match: FootballMatch | BasketballGame,
  sport: Sport
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "Write concise sports match insight from supplied context only. Include tactics, strengths, weaknesses, game flow, risks, and confidence."
        },
        {
          role: "user",
          content: JSON.stringify({ sport, match }, null, 2)
        }
      ],
      max_output_tokens: 220
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI insight failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  return (
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ||
    buildLocalInsight(match, sport)
  );
}

function buildLocalInsight(
  match: FootballMatch | BasketballGame,
  sport: Sport
): string {
  const score =
    sport === "football"
      ? `${(match as FootballMatch).homeGoals ?? "-"}-${(match as FootballMatch).awayGoals ?? "-"}`
      : `${(match as BasketballGame).homeScore ?? "-"}-${(match as BasketballGame).awayScore ?? "-"}`;
  const liveStats = match.stats?.shots
    ? `Shots ${match.stats.shots.home}-${match.stats.shots.away}.`
    : "Detailed live shot data unavailable.";
  const h2h = match.stats?.headToHead
    ? `H2H sample: ${match.stats.headToHead.games} games.`
    : "H2H unavailable.";

  return [
    `${match.homeTeam} vs ${match.awayTeam}: current score ${score}.`,
    `Tactical overview: use available form and match-state context; do not treat missing lineup/injury data as known.`,
    `Strength signal: ${liveStats}`,
    `Risk factors: injuries, lineups, odds, and some xG feeds may be unavailable.`,
    `${h2h} Confidence: Medium if recent data exists, Low if this is placeholder data.`
  ].join("\n");
}
