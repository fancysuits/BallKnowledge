import { NextResponse } from "next/server";
import { getSoccerBundle, soccerLeagues } from "@/lib/services/soccer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question =
    searchParams.get("q") ||
    "Return soccer fixtures, standings, team statistics, and match statistics.";

  const bundle = await getSoccerBundle(question);

  return NextResponse.json({
    leagues: soccerLeagues,
    ...bundle,
    generatedAt: new Date().toISOString()
  });
}
