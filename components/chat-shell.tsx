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
  kind: "briefing" | "answer" | "no_result" | "clarification" | "empty" | "error" | "invalid";
  message: string;
  articles?: Article[];
  sources?: Article[];
};

type ConversationMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY_MESSAGES = 6;

const starterPrompts = [
  "Give me the most recent story you have.",
  "What has NASA said about Moon Base?",
  "What did articles from June say about Moon Base?",
  "Tell me about TEMPO and air quality.",
];

export function ChatShell() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [history, setHistory] = useState<ConversationMessage[]>([]);
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
        body: JSON.stringify({ question: trimmedQuestion, messages: history }),
      });
      const data = (await result.json()) as ChatResponse;
      setResponse(data);
      if (result.ok && data.message) {
        setHistory((previous) => {
          const nextHistory: ConversationMessage[] = [
            ...previous,
            { role: "user", content: trimmedQuestion },
            { role: "assistant", content: data.message },
          ];
          return nextHistory.slice(-MAX_HISTORY_MESSAGES);
        });
      }
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

  function startNewQuestion() {
    if (isLoading) return;
    setQuestion("");
    setResponse(null);
    setHistory([]);
  }

  return (
    <section className="chat-panel" aria-labelledby="question-heading">
      <div className="section-heading chat-heading">
        <div>
          <p className="eyebrow">Ask the index</p>
          <h2 id="question-heading">What should we look up?</h2>
        </div>
        <p className="chat-note">Answers are based on the currently indexed source corpus.</p>
      </div>

      <form className="question-form" onSubmit={handleSubmit}>
        <label htmlFor="question">Your question</label>
        <div className="question-row">
          <input id="question" name="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about recent space news" maxLength={300} disabled={isLoading} />
          <button type="submit" disabled={isLoading || !question.trim()}>{isLoading ? "Searching…" : "Look up"}</button>
        </div>
      </form>

      <div className="starter-prompts" aria-label="Starter questions">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={isLoading}>{prompt}</button>
        ))}
      </div>

      <div className="answer-area" aria-live="polite">
        {isLoading && <p className="answer-status" role="status">Searching the index…</p>}
        {!isLoading && response && (
          <div className={response.kind === "error" ? "notice notice-error" : response.kind === "no_result" ? "answer-result answer-abstention" : "answer-result"}>
            <div className="answer-heading">
              <p className="eyebrow">{response.kind === "no_result" ? "Index boundary" : "Indexed answer"}</p>
              <button type="button" className="reset-question" onClick={startNewQuestion}>Start new question</button>
            </div>
            <p className="answer-copy">{response.message}</p>
            {response.articles && response.articles.length > 0 && <div className="answer-sources"><p className="source-label">Source records</p><BriefingList articles={response.articles} variant="sources" /></div>}
            {response.sources && response.sources.length > 0 && <div className="answer-sources"><p className="source-label">Source records</p><BriefingList articles={response.sources} variant="sources" /></div>}
          </div>
        )}
      </div>
    </section>
  );
}
