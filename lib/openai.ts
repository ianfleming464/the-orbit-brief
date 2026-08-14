/**
 * Shared OpenAI client.
 *
 * LangSmith wraps the SDK client once, matching the Parsity reference project.
 * When tracing is enabled, LangSmith records the full OpenAI request and
 * response for each nested LLM/embedding span.
 */

import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers/openai";

let client: ReturnType<typeof wrapOpenAI<OpenAI>> | undefined;

/**
 * Creates the wrapped client on first use. Keeping it lazy lets pure unit
 * tests import agent helpers without requiring real provider credentials.
 */
export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for OpenAI requests");
  client ??= wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
  return client;
}
