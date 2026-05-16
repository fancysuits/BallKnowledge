# AI Sports Analytics Chatbot

A text-based Next.js app for basketball and soccer analytics. The app starts with a clean chat interface, league shortcuts for Premier League, La Liga, and NBA, server-side API routes, OpenAI prediction wiring, and placeholder sports provider services.

## Run Locally

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add keys:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
SOCCER_API_BASE_URL=
SOCCER_API_KEY=
BASKETBALL_API_BASE_URL=
BASKETBALL_API_KEY=
```

## Route Structure

- `POST /api/chat` gathers sports context and generates the chatbot answer.
- `GET /api/sports/soccer?q=...` returns normalized soccer fixtures, standings, team statistics, and match statistics.
- `GET /api/sports/basketball?q=...` returns normalized basketball fixtures, standings, team statistics, and match statistics.

## Provider Integration Points

- Replace placeholder soccer calls in `lib/services/soccer.ts`.
- Replace placeholder basketball calls in `lib/services/basketball.ts`.
- Adjust the OpenAI prompt or model in `lib/services/openai.ts`.

Until keys and real providers are configured, the app returns sample sports context and clearly labels predictions as placeholders.
