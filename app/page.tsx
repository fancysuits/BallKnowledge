"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Loader2,
  MessagesSquare,
  Send,
  Shield,
  Trophy
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ApiContext = {
  leagues?: Array<{ id: string; name: string; sport: string; country: string }>;
  fixtures?: Array<{
    id: string;
    leagueId: string;
    startsAt: string;
    homeTeam: string;
    awayTeam: string;
    status: string;
    venue?: string;
  }>;
  standings?: Array<{
    leagueId: string;
    rank: number;
    team: string;
    played: number;
    wins: number;
    draws?: number;
    losses: number;
    points: number;
    differential: number;
  }>;
  providerNotes?: string[];
};

type ChatResponse = {
  answer?: string;
  context?: ApiContext;
  error?: string;
};

const leagueCards = [
  {
    id: "premier-league",
    name: "Premier League",
    sport: "Soccer",
    country: "England",
    prompt:
      "Give me Premier League standings, this week's fixtures, win probabilities, and likely final scores."
  },
  {
    id: "la-liga",
    name: "La Liga",
    sport: "Soccer",
    country: "Spain",
    prompt:
      "Analyze La Liga fixtures, current standings, match stats, and likely final scores."
  },
  {
    id: "nba",
    name: "NBA",
    sport: "Basketball",
    country: "United States",
    prompt:
      "Show NBA games on the calendar, team statistics, win probabilities, and projected final scores."
  }
];

const starterPrompts = [
  "Who has the edge in Arsenal vs Manchester City?",
  "Predict Real Madrid vs Barcelona with likely final score.",
  "What is the win probability for Celtics vs Nuggets?",
  "Compare today's NBA and soccer fixtures."
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask about basketball or soccer fixtures, standings, team form, match stats, win probabilities, or likely final scores."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latestContext, setLatestContext] = useState<ApiContext | null>(null);

  const selectedFixtures = useMemo(
    () => latestContext?.fixtures?.slice(0, 4) || [],
    [latestContext]
  );
  const selectedStandings = useMemo(
    () => latestContext?.standings?.slice(0, 5) || [],
    [latestContext]
  );

  async function sendMessage(message: string) {
    const trimmed = message.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: trimmed })
      });
      const data = (await response.json()) as ChatResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "The sports analyst could not respond.");
      }

      setLatestContext(data.context || null);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer || "No prediction was returned."
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong while fetching sports analytics."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="app-shell">
      <aside className="league-panel" aria-label="Sports leagues and calendars">
        <div className="brand-lockup">
          <div className="brand-mark">
            <BarChart3 size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">AI Sports Desk</p>
            <h1>Analytics Chat</h1>
          </div>
        </div>

        <section className="panel-section">
          <div className="section-heading">
            <Trophy size={16} aria-hidden="true" />
            <h2>League Boards</h2>
          </div>
          <div className="league-list">
            {leagueCards.map((league) => (
              <button
                className="league-card"
                key={league.id}
                onClick={() => void sendMessage(league.prompt)}
                type="button"
              >
                <span>
                  <strong>{league.name}</strong>
                  <small>
                    {league.sport} / {league.country}
                  </small>
                </span>
                <Shield size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <CalendarDays size={16} aria-hidden="true" />
            <h2>Calendars</h2>
          </div>
          <div className="calendar-strip">
            <button
              type="button"
              onClick={() =>
                void sendMessage("List the Premier League game calendar.")
              }
            >
              Premier League
            </button>
            <button
              type="button"
              onClick={() => void sendMessage("List the La Liga game calendar.")}
            >
              La Liga
            </button>
            <button
              type="button"
              onClick={() => void sendMessage("List the NBA game calendar.")}
            >
              NBA
            </button>
          </div>
        </section>

        <section className="panel-section compact">
          <h2>Provider Status</h2>
          <p>
            Sports and OpenAI services are server-side. Add keys in{" "}
            <code>.env.local</code> to replace placeholder data.
          </p>
        </section>
      </aside>

      <section className="chat-workspace" aria-label="AI sports chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Text-only predictions</p>
            <h2>Ask about games, standings, stats, and probabilities</h2>
          </div>
          <div className="header-pill">
            <MessagesSquare size={16} aria-hidden="true" />
            API-ready
          </div>
        </header>

        <div className="chat-grid">
          <div className="conversation">
            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <article
                  className={`message ${message.role}`}
                  key={message.id}
                >
                  <span>{message.role === "assistant" ? "Analyst" : "You"}</span>
                  <p>{message.content}</p>
                </article>
              ))}
              {isLoading ? (
                <article className="message assistant">
                  <span>Analyst</span>
                  <p className="loading-line">
                    <Loader2 size={16} aria-hidden="true" /> Checking sports
                    context...
                  </p>
                </article>
              ) : null}
            </div>

            <div className="starter-row" aria-label="Example questions">
              {starterPrompts.map((prompt) => (
                <button
                  disabled={isLoading}
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              <label htmlFor="sports-question">Sports question</label>
              <textarea
                id="sports-question"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask: Predict Arsenal vs Man City using live scores, standings and team stats..."
                rows={3}
                value={input}
              />
              <button
                aria-busy={isLoading}
                disabled={isLoading || !input.trim()}
                type="submit"
              >
                {isLoading ? (
                  <Loader2 size={18} aria-hidden="true" />
                ) : (
                  <Send size={18} aria-hidden="true" />
                )}
                Send
              </button>
            </form>
          </div>

          <aside className="insight-panel" aria-label="Latest sports context">
            <section>
              <h3>Latest Fixtures</h3>
              {selectedFixtures.length ? (
                <div className="context-list">
                  {selectedFixtures.map((fixture) => (
                    <div className="context-item" key={fixture.id}>
                      <strong>
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </strong>
                      <span>
                        {fixture.leagueId} /{" "}
                        {new Date(fixture.startsAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Ask a question to load game context.</p>
              )}
            </section>

            <section>
              <h3>Standings Snapshot</h3>
              {selectedStandings.length ? (
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>W</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStandings.map((standing) => (
                        <tr key={`${standing.leagueId}-${standing.team}`}>
                          <td>{standing.rank}</td>
                          <td>{standing.team}</td>
                          <td>{standing.wins}</td>
                          <td>{standing.points || standing.differential}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Standings appear after the first query.</p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
