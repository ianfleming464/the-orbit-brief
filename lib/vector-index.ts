import type { PreparedVectorRecord } from "@/lib/indexing";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const INDEX_BATCH_SIZE = 25;

export type PineconeVectorRecord = {
  id: string;
  values: number[];
  metadata: PreparedVectorRecord["metadata"];
};

export function batchRecords<T>(records: T[], batchSize = INDEX_BATCH_SIZE): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error("Batch size must be a positive integer");

  const batches: T[][] = [];
  for (let index = 0; index < records.length; index += batchSize) {
    batches.push(records.slice(index, index + batchSize));
  }
  return batches;
}

export function createPineconeVectorRecords(
  records: PreparedVectorRecord[],
  embeddings: number[][],
): PineconeVectorRecord[] {
  if (records.length !== embeddings.length) {
    throw new Error(`Embedding count mismatch: expected ${records.length}, received ${embeddings.length}`);
  }

  return records.map((record, index) => {
    const values = embeddings[index]!;
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding for ${record.id} has ${values.length} dimensions; expected ${EMBEDDING_DIMENSIONS}`);
    }
    return { id: record.id, values, metadata: record.metadata };
  });
}
