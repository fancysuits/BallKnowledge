export async function GET() {
  const baseUrl = process.env.SOCCER_API_BASE_URL;
  const apiKey = process.env.SOCCER_API_KEY;

  const today = new Date().toISOString().split("T")[0];

  const todayResponse = await fetch(`${baseUrl}/fixtures?date=${today}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  const nextResponse = await fetch(`${baseUrl}/fixtures?next=50`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  const todayData = await todayResponse.json();
  const nextData = await nextResponse.json();

  const allFixtures = [
    ...(todayData.response || []),
    ...(nextData.response || []),
  ];

  const uniqueFixtures = Array.from(
    new Map(allFixtures.map((item) => [item.fixture.id, item])).values()
  );

  const filteredFixtures = uniqueFixtures.filter((item) => {
    const league = item.league.name;
    const country = item.league.country;

    return (
      (league === "Premier League" && country === "England") ||
      (league === "La Liga" && country === "Spain") ||
      (league === "Serie A" && country === "Italy") ||
      (league === "Ligue 1" && country === "France") ||
      league === "UEFA Champions League" ||
      league === "World Cup"
    );
  });

  const matches = filteredFixtures.map((item) => ({
    id: item.fixture.id,
    date: item.fixture.date,
    status: item.fixture.status.short,
    elapsed: item.fixture.status.elapsed,
    league: item.league.name,
    country: item.league.country,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeLogo: item.teams.home.logo || null,
    awayLogo: item.teams.away.logo || null,
    homeGoals: item.goals.home,
    awayGoals: item.goals.away,
  }));

  return Response.json({
    matches,
    error: null,
    lastUpdated: new Date().toISOString(),
  });
}