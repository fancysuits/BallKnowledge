export async function GET() {
  const baseUrl = process.env.SOCCER_API_BASE_URL;
  const apiKey = process.env.SOCCER_API_KEY;

  const response = await fetch(`${baseUrl}/status`, {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  const data = await response.json();

  return Response.json(data);
}