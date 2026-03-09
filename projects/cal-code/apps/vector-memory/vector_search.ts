import { searchDocuments, generateEmbedding } from "./vector_store";
import { VectorDocument } from "./vector_types";
import { logActivity } from "../activity/activity_logger";

export async function searchRelevantFiles(
  query: string
): Promise<VectorDocument[]> {
  logActivity("searching", "Searching relevant files");
  const queryEmbedding = await generateEmbedding(query);
  return searchDocuments(queryEmbedding, 5);
}
