export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("id");

  const baseUrl = process.env.SOCCER_API_BASE_URL;
  const apiKey = process.env.SOCCER_API_KEY;

  const response = await fetch(
    `${baseUrl}/fixtures/statistics?fixture=${fixtureId}`,
    {
      headers: {
        "x-apisports-key": apiKey,
      },
    }
  );

  const data = await response.json();

  return Response.json(data);
}