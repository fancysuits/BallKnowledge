"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Loader2, MessagesSquare, Send, Sparkles, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/app/lib/types";

type ChatResponse = {
  answer?: string;
  reply?: string;
  error?: string;
};

const starterPrompts = [
  "Who has the edge in Arsenal vs Manchester City?",
  "Predict Real Madrid vs Barcelona with likely final score.",
  "What is the win probability for Celtics vs Nuggets?",
  "Compare today's NBA and football fixtures."
];

const predictionTerms = [
  "prediction",
  "predict",
  "ennustus",
  "kes võidab",
  "who will win",
  "win probability",
  "likely final score"
];

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask about football or basketball fixtures, standings, team form, win probabilities, or likely final scores."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPredictionQuestion = useMemo(() => looksLikePrediction(input), [input]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      isPrediction: looksLikePrediction(trimmed)
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          history: messages.slice(-6).map((message) => ({
            content: message.content,
            role: message.role
          })),
          message: trimmed
        })
      });
      const data = (await response.json()) as ChatResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Analyst could not respond.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply || data.answer || "No answer was returned."
        }
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Midagi läks valesti. Proovi uuesti.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <section className="chat-workspace" aria-label="AI sports chat">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Cost-aware AI analyst</p>
          <h2>Ask about games, standings, stats, and probabilities</h2>
        </div>
        <div className="header-pill">
          <MessagesSquare size={16} aria-hidden="true" />
          Chat ready
        </div>
      </header>

      <div className="conversation compact-chat">
        <div className="messages" aria-live="polite">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>
                {message.role === "assistant" ? "Analyst" : "You"}
                {message.isPrediction ? (
                  <em>
                    <Sparkles size={12} aria-hidden="true" />
                    prediction
                  </em>
                ) : null}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
          {isLoading ? (
            <article className="message assistant">
              <span>Analyst</span>
              <p className="loading-line">
                <Loader2 size={16} aria-hidden="true" /> Checking sports context...
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

        {error ? <p className="chat-error">{error}</p> : null}

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="sports-question">Sports question</label>
          <textarea
            id="sports-question"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask: Predict Arsenal vs Man City using current form..."
            rows={3}
            value={input}
          />
          <div className="composer-actions">
            {isPredictionQuestion ? (
              <span className="prediction-chip">
                <Sparkles size={13} aria-hidden="true" />
                Prediction
              </span>
            ) : null}
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
            <button
              className="secondary-action"
              disabled={isLoading || messages.length <= 1}
              onClick={() => {
                setMessages((current) => current.slice(0, 1));
                setError(null);
              }}
              type="button"
            >
              <Trash2 size={16} aria-hidden="true" />
              Clear
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function looksLikePrediction(message: string): boolean {
  const lower = message.toLowerCase();
  return predictionTerms.some((term) => lower.includes(term));
}
