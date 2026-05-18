export async function GET() {
  return Response.json({
    key: process.env.SOCCER_API_KEY ? "OLEMAS" : "PUUDUB"
  });
}