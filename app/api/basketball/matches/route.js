export async function GET() {
  try {
    const baseUrl = process.env.BASKETBALL_API_BASE_URL;
    const apiKey = process.env.BASKETBALL_API_KEY;

    const today = new Date().toISOString().split("T")[0];

    const response = await fetch(`${baseUrl}/games?date=${today}`, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    const data = await response.json();

    const games = (data.response || [])
      .filter((item) => item.league?.name === "NBA")
      .map((item) => ({
        id: item.id,
        date: item.date?.start || null,
        status: item.status?.short || "-",
        homeTeam: item.teams?.home?.name || "Home team",
        awayTeam: item.teams?.away?.name || "Away team",
        homeLogo: item.teams?.home?.logo || null,
        awayLogo: item.teams?.away?.logo || null,
        homeScore: item.scores?.home?.points ?? null,
        awayScore: item.scores?.away?.points ?? null,
      }));

    return Response.json({
      games,
      error: null,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({
      games: [],
      error: String(err),
      lastUpdated: new Date().toISOString(),
    });
  }
}