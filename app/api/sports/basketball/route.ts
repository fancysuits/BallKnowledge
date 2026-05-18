import { NextResponse } from "next/server";
import {
  basketballLeagues,
  getBasketballBundle
} from "@/lib/services/basketball";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question =
    searchParams.get("q") ||
    "Return basketball fixtures, standings, team statistics, and match statistics.";

  try {
    const bundle = await getBasketballBundle(question);
    const lastUpdated = new Date().toISOString();

    return NextResponse.json({
      error: null,
      generatedAt: lastUpdated,
      lastUpdated,
      leagues: basketballLeagues,
      games: bundle.fixtures.map((fixture) => ({
        stats: bundle.matchStatistics.find(
          (statistic) => statistic.fixtureId === fixture.id
        ),
        id: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        homeLogo: fixture.homeLogo,
        awayLogo: fixture.awayLogo,
        date: fixture.startsAt,
        venue: fixture.venue,
        status: fixture.status,
        minute: fixture.minute ?? null,
        homeScore: fixture.score?.home ?? null,
        awayScore: fixture.score?.away ?? null
      })),
      ...bundle
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Basketball data could not be loaded.",
        generatedAt: new Date().toISOString(),
        lastUpdated: null,
        leagues: basketballLeagues,
        games: []
      },
      { status: 500 }
    );
  }
}
