import "dotenv/config";
import { db } from "@/lib/db";
import { ingestNasa } from "@/lib/ingest";

async function main() {
  try {
    const result = await ingestNasa();
    console.log(JSON.stringify(result.summary, null, 2));
    if (result.summary.failed > 0) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
