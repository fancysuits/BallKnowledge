import { NextResponse } from "next/server";
import { generateSportsPrediction } from "@/lib/services/openai";
import {
  buildFootballPrediction,
  formatPrediction
} from "@/lib/services/predictions";
import { buildSportsContext } from "@/lib/sports-context";

type ChatRequest = {
  history?: Array<{
    content: string;
    role: "user" | "assistant";
  }>;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ reply: "Palun kirjuta küsimus." });
    }

    const contextQuestion = buildContextQuestion(message, body.history || []);
    const sportsContext = await buildSportsContext(contextQuestion);
    const prediction = looksLikePrediction(message)
      ? buildFootballPrediction(contextQuestion, sportsContext)
      : null;
    const liveStatusAnswer = looksLikeLiveStatusQuestion(message)
      ? buildLiveStatusAnswer(contextQuestion, sportsContext)
      : null;
    const answer = prediction
      ? formatPrediction(prediction)
      : liveStatusAnswer
        ? liveStatusAnswer
      : await generateSportsPrediction({
        question: contextQuestion,
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

function buildContextQuestion(
  message: string,
  history: Array<{ content: string; role: "user" | "assistant" }>
): string {
  if (!isShortFollowUp(message)) {
    return message;
  }

  const recentContext = history
    .slice(-4)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  return `${recentContext}\nuser: ${message}`;
}

function isShortFollowUp(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ["why", "why?", "miks", "miks?", "explain", "selgita"].includes(lower);
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
    "h2h",
    "projected score"
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

function looksLikeLiveStatusQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return [
    "mitmes minut",
    "minute",
    "minut",
    "score",
    "skoor",
    "live score",
    "what minute"
  ].some((term) => lower.includes(term));
}

function buildLiveStatusAnswer(
  question: string,
  sportsContext: Awaited<ReturnType<typeof buildSportsContext>>
): string {
  const lower = question.toLowerCase();
  const fixture =
    sportsContext.fixtures.find(
      (item) =>
        lower.includes(item.homeTeam.toLowerCase()) ||
        lower.includes(item.awayTeam.toLowerCase())
    ) || sportsContext.fixtures[0];

  if (!fixture) {
    return "Ma ei leidnud selle mängu live-andmeid.";
  }

  const score =
    fixture.score?.home !== undefined && fixture.score?.away !== undefined
      ? `${fixture.score.home}-${fixture.score.away}`
      : "skoor pole saadaval";
  const minute =
    fixture.status === "live"
      ? fixture.minute
        ? `${fixture.minute}. minut`
        : "live, minut pole saadaval"
      : fixture.status === "final"
        ? "mäng on lõppenud"
        : "mäng ei ole live";

  return [
    `${fixture.homeTeam} vs ${fixture.awayTeam}`,
    `Staatus: ${fixture.status}`,
    `Aeg: ${minute}`,
    `Skoor: ${score}`,
    "See vastus kasutas spordiandmete konteksti ega kasutanud OpenAI-d."
  ].join("\n");
}
