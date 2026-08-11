import "dotenv/config";

import { retrieveNasa } from "@/lib/nasa-retrieval";
import { EMBEDDING_MODEL } from "@/lib/vector-index";

function readRequiredFlag(flag: string): string {
  const index = process.argv.indexOf(flag);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value?.trim()) throw new Error(`${flag} is required`);
  return value.trim();
}

function readPositiveIntegerFlag(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0 || value > 20) throw new Error(`${flag} must be an integer from 1 to 20`);
  return value;
}

async function main() {
  const question = readRequiredFlag("--question");
  const topK = readPositiveIntegerFlag("--top-k", 5);
  console.log(JSON.stringify({
    question,
    topK,
    embeddingModel: EMBEDDING_MODEL,
    matches: await retrieveNasa(question, topK),
  }, null, 2));
}

void main();
