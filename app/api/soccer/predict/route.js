export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("id");

  const baseUrl = process.env.SOCCER_API_BASE_URL;
  const apiKey = process.env.SOCCER_API_KEY;

  const statsResponse = await fetch(
    `${baseUrl}/fixtures/statistics?fixture=${fixtureId}`,
    {
      headers: {
        "x-apisports-key": apiKey,
      },
    }
  );

  const statsData = await statsResponse.json();
  const stats = statsData.response;

  if (!stats || stats.length < 2) {
    return Response.json({ error: "No stats available" });
  }

  const homeStats = stats[0].statistics;
  const awayStats = stats[1].statistics;

  function getStat(statsArray, type) {
    const stat = statsArray.find((s) => s.type === type);
    if (!stat || stat.value === null) return 0;

    if (typeof stat.value === "string" && stat.value.includes("%")) {
      return parseFloat(stat.value);
    }

    return Number(stat.value);
  }

  const homeShots = getStat(homeStats, "Shots on Goal");
  const awayShots = getStat(awayStats, "Shots on Goal");

  const homePoss = getStat(homeStats, "Ball Possession");
  const awayPoss = getStat(awayStats, "Ball Possession");

  let home = 40;
  let away = 40;
  let draw = 20;

  home += homeShots * 5;
  away += awayShots * 5;

  home += homePoss * 0.2;
  away += awayPoss * 0.2;

  if (Math.abs(homeShots - awayShots) <= 1) {
    draw += 10;
  }

  if (Math.abs(homeShots - awayShots) >= 3) {
    draw -= 10;
  }

  if (draw < 5) {
    draw = 5;
  }

  const total = home + draw + away;

  return Response.json({
    fixtureId,
    prediction: {
      homeWin: Math.round((home / total) * 100),
      draw: Math.round((draw / total) * 100),
      awayWin: Math.round((away / total) * 100),
    },
    details: {
      homeShots,
      awayShots,
      homePoss,
      awayPoss,
    },
  });
}