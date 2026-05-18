export async function GET() {
  const baseUrl = process.env.SOCCER_API_BASE_URL;
  const apiKey = process.env.SOCCER_API_KEY;

  const today = new Date().toISOString().split("T")[0];

  const response = await fetch(`${baseUrl}/fixtures?date=${today}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  const data = await response.json();

  return Response.json(data);
}