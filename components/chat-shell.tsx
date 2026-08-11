"use client";

import { FormEvent, useState } from "react";

import { BriefingList } from "@/components/briefing-list";

type Article = {
  id: string;
  title: string;
  source: string;
  canonicalUrl: string;
  publishedAt: string | Date;
};

type ChatResponse = {
  kind: "briefing" | "answer" | "no_result" | "empty" | "error" | "invalid";
  message: string;
  articles?: Article[];
  sources?: Article[];
};

const starterPrompts = [
  "Show me the latest NASA news.",
  "What did NASA publish this week?",
  "What are the most recent NASA stories?",
  "What’s new in NASA news?",
  "Give me today’s NASA briefing.",
];

export function ChatShell() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function ask(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion || isLoading) return;

    setQuestion(trimmedQuestion);
    setIsLoading(true);
    setResponse(null);

    try {
      const result = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const data = (await result.json()) as ChatResponse;
      setResponse(data);
    } catch {
      setResponse({ kind: "error", message: "The briefing request could not be completed. Try again in a moment." });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="chat-panel" aria-labelledby="question-heading">
      <div className="section-heading chat-heading">
        <div>
          <p className="eyebrow">Ask the index</p>
          <h2 id="question-heading">What should we look up?</h2>
        </div>
        <p className="chat-note">Answers come from stored NASA news. Refreshes happen separately.</p>
      </div>

      <form className="question-form" onSubmit={handleSubmit}>
        <label htmlFor="question">Your question</label>
        <div className="question-row">
          <input id="question" name="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Show me the latest NASA news" maxLength={300} disabled={isLoading} />
          <button type="submit" disabled={isLoading || !question.trim()}>{isLoading ? "Looking…" : "Look up"}</button>
        </div>
      </form>

      <div className="starter-prompts" aria-label="Starter questions">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={isLoading}>{prompt}</button>
        ))}
      </div>

      <div className="answer-area" aria-live="polite">
        {isLoading && <p className="answer-status" role="status">Looking through the latest indexed NASA stories…</p>}
        {!isLoading && response && (
          <div className={response.kind === "error" ? "notice notice-error" : "answer-result"}>
            <p className="answer-copy">{response.message}</p>
            {response.articles && response.articles.length > 0 && <BriefingList articles={response.articles} />}
            {response.sources && response.sources.length > 0 && <BriefingList articles={response.sources} />}
          </div>
        )}
      </div>
    </section>
  );
}
