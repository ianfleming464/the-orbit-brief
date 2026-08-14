/**
 * LangSmith tracing for the request-level agent workflow.
 *
 * Workflow-stage traces log summaries. The shared OpenAI client has a separate
 * LangSmith wrapper that records full provider requests and responses when
 * tracing is enabled, matching the Parsity reference project.
 */

import { traceable } from "langsmith/traceable";

type TraceSummary = Record<string, boolean | number | string | null>;

function tracingEnabled() {
  return process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY);
}

const traceConfig = (name: string) => ({
  name,
  run_type: "chain",
  project_name: process.env.LANGSMITH_PROJECT ?? "the-orbit-brief",
  tracingEnabled: tracingEnabled(),
});

/**
 * Creates a root trace for one chat request. Its own inputs and outputs are
 * concise summaries; nested OpenAI spans contain full provider payloads.
 */
export async function traceWorkflow<T>(
  input: TraceSummary,
  run: () => Promise<T>,
  summarizeOutput: (result: T) => TraceSummary,
): Promise<T> {
  const traced = traceable(run, {
    ...traceConfig("orbit-brief chat workflow"),
    processInputs: () => input,
    processOutputs: (result) => summarizeOutput(result as T),
  });
  return traced();
}

/**
 * Adds a nested summary stage to the active workflow trace when enabled.
 */
export async function traceStage<T>(
  name: string,
  input: TraceSummary,
  run: () => Promise<T>,
  summarizeOutput: (result: T) => TraceSummary,
): Promise<T> {
  const traced = traceable(run, {
    ...traceConfig(name),
    processInputs: () => input,
    processOutputs: (result) => summarizeOutput(result as T),
  });
  return traced();
}
