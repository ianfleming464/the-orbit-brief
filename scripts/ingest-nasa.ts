import "dotenv/config";
import { db } from "@/lib/db";
import { ingestNasa } from "@/lib/ingest";

async function main() {
  try {
    const summary = await ingestNasa();
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
