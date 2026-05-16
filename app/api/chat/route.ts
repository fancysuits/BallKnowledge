import { NextResponse } from "next/server";
import { generateSportsPrediction } from "@/lib/services/openai";
import { buildSportsContext } from "@/lib/sports-context";

type ChatRequest = {
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Type a basketball or soccer question first." },
        { status: 400 }
      );
    }

    const sportsContext = await buildSportsContext(message);
    const answer = await generateSportsPrediction({
      question: message,
      sportsContext
    });

    return NextResponse.json({
      answer,
      context: sportsContext,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
