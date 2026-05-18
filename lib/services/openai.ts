import type { SportsContext } from "@/lib/types/sports";

type PredictionInput = {
  question: string;
  sportsContext: SportsContext;
  useWebSearch?: boolean;
};

export async function generateSportsPrediction({
  question,
  sportsContext,
  useWebSearch = false
}: PredictionInput): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return buildLocalFallback(question, sportsContext);
  }

  const requestBody = {
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content:
          "You are a concise sports assistant. Use supplied context first. Say when data may be incomplete."
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            question,
            providerContext: compactSportsContext(sportsContext)
          },
          null,
          2
        )
      }
    ],
    max_output_tokens: 250,
    ...(useWebSearch ? { tools: [{ type: "web_search_preview" }] } : {})
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  return (
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ||
    "I could not produce a prediction from the available context."
  );
}

function buildLocalFallback(
  question: string,
  sportsContext: SportsContext
): string {
  const fixture = sportsContext.fixtures[0];
  const teams = sportsContext.teamStatistics;
  const home = teams.find((team) => team.team === fixture?.homeTeam);
  const away = teams.find((team) => team.team === fixture?.awayTeam);

  if (!fixture || !home || !away) {
    return [
      "OpenAI is not configured yet, so I can only summarize the placeholder sports context.",
      "",
      `Question: ${question}`,
      "",
      "Add OPENAI_API_KEY to enable generated predictions."
    ].join("\n");
  }

  const homeEdge = home.scoringAverage - away.concededAverage;
  const awayEdge = away.scoringAverage - home.concededAverage;
  const totalEdge = Math.max(homeEdge + awayEdge, 0.1);
  const homeProbability = Math.round((homeEdge / totalEdge) * 100);
  const safeHomeProbability = Math.min(Math.max(homeProbability, 35), 65);
  const safeAwayProbability = 100 - safeHomeProbability;

  return [
    "OpenAI is not configured yet, so this is a local placeholder forecast based on sample data.",
    "",
    `Fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`,
    `Win probability: ${fixture.homeTeam} ${safeHomeProbability}% | ${fixture.awayTeam} ${safeAwayProbability}%`,
    `Likely final score: ${estimateScore(home.scoringAverage)}-${estimateScore(
      away.scoringAverage
    )}`,
    "",
    `Signal: ${home.team} form ${home.form}; ${away.team} form ${away.form}.`,
    "Caveat: connect live sports APIs and OPENAI_API_KEY before treating this as a real prediction."
  ].join("\n");
}

function estimateScore(scoringAverage: number): number {
  if (scoringAverage > 20) {
    return Math.round(scoringAverage);
  }

  return Math.max(0, Math.round(scoringAverage));
}

function compactSportsContext(sportsContext: SportsContext): SportsContext {
  return {
    leagues: sportsContext.leagues.slice(0, 4),
    fixtures: sportsContext.fixtures.slice(0, 6),
    standings: sportsContext.standings.slice(0, 8),
    teamStatistics: sportsContext.teamStatistics.slice(0, 8),
    matchStatistics: sportsContext.matchStatistics.slice(0, 4),
    providerNotes: sportsContext.providerNotes.slice(0, 3)
  };
}
