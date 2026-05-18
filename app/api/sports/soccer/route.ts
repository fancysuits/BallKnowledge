import { NextResponse } from "next/server";
import { getSoccerBundle, soccerLeagues } from "@/lib/services/soccer";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const question =
    searchParams.get("q") ||
    "Return soccer fixtures, standings, team statistics, and match statistics.";

  try {
    const bundle = await getSoccerBundle(question);
    const lastUpdated = new Date().toISOString();

    return NextResponse.json({
      error: null,
      generatedAt: lastUpdated,
      lastUpdated,
      leagues: soccerLeagues,
      matches: bundle.fixtures.map((fixture) => ({
        id: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        homeLogo: fixture.homeLogo,
        awayLogo: fixture.awayLogo,
        league:
          soccerLeagues.find((league) => league.id === fixture.leagueId)?.name ||
          fixture.leagueId,
        country: soccerLeagues.find((league) => league.id === fixture.leagueId)
          ?.country,
        date: fixture.startsAt,
        status: fixture.status,
        homeGoals: fixture.score?.home ?? null,
        awayGoals: fixture.score?.away ?? null
      })),
      ...bundle
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Football data could not be loaded.",
        generatedAt: new Date().toISOString(),
        lastUpdated: null,
        leagues: soccerLeagues,
        matches: []
      },
      { status: 500 }
    );
  }
}
