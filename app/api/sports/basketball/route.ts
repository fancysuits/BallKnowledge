import { NextResponse } from "next/server";
import {
  basketballLeagues,
  getBasketballBundle
} from "@/lib/services/basketball";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question =
    searchParams.get("q") ||
    "Return basketball fixtures, standings, team statistics, and match statistics.";

  const bundle = await getBasketballBundle(question);

  return NextResponse.json({
    leagues: basketballLeagues,
    ...bundle,
    generatedAt: new Date().toISOString()
  });
}
