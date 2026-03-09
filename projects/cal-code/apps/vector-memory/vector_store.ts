import { createHash } from "node:crypto";
import { VectorDocument } from "./vector_types";

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "qwen3:14b";
export const COLLECTION_NAME = "calcode_memory";
const FALLBACK_VECTOR_SIZE = 256;

interface QdrantSearchPoint {
  payload?: {
    path?: string;
    content?: string;
  };
}

interface QdrantSearchResponse {
  result?: QdrantSearchPoint[];
}

interface FallbackPoint {
  id: string;
  vector: number[];
  payload: {
    path: string;
    content: string;
  };
}

let fallbackPoints: FallbackPoint[] = [];

function cosineSimilarity(a: number[], b: number[]): number {
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (let i = 0; i < size; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }

  if (aNorm === 0 || bNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function toStablePointId(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function isConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes("fetch failed");
}

function upsertFallbackPoints(points: FallbackPoint[]): void {
  const next = new Map<string, FallbackPoint>();
  for (const point of fallbackPoints) {
    next.set(point.id, point);
  }
  for (const point of points) {
    next.set(point.id, point);
  }
  fallbackPoints = Array.from(next.values());
}

async function qdrantRequest<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const response = await fetch(`${QDRANT_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }

  const data = (await response.json()) as T;
  return { ok: true, status: response.status, data };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embedding request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { embedding?: number[] };
    if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
      throw new Error("Embedding response did not include a valid embedding vector.");
    }

    return data.embedding;
  } catch {
    return generateFallbackEmbedding(text, FALLBACK_VECTOR_SIZE);
  }
}

function generateFallbackEmbedding(text: string, size: number): number[] {
  const vector = new Array<number>(size).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);

  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const bucket = hash.readUInt16BE(0) % size;
    vector[bucket] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector;
  }

  return vector.map((value) => value / norm);
}

export async function ensureCollection(vectorSize: number): Promise<void> {
  const existing = await qdrantRequest<unknown>(`/collections/${COLLECTION_NAME}`, {
    method: "GET",
  });

  if (existing.ok) {
    return;
  }

  if (existing.status !== 404) {
    throw new Error(
      `Failed to check Qdrant collection (${COLLECTION_NAME}). Status: ${existing.status}`
    );
  }

  const created = await qdrantRequest<unknown>(`/collections/${COLLECTION_NAME}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    }),
  });

  if (!created.ok) {
    throw new Error(
      `Failed to create Qdrant collection (${COLLECTION_NAME}). Status: ${created.status}`
    );
  }
}

export async function upsertDocuments(documents: VectorDocument[]): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  const firstEmbedding = await generateEmbedding(documents[0].content);
  try {
    await ensureCollection(firstEmbedding.length);
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }
  }

  const points: FallbackPoint[] = await Promise.all(
    documents.map(async (document, index) => {
      const vector =
        index === 0 ? firstEmbedding : await generateEmbedding(document.content);
      const stableId = toStablePointId(document.id);

      return {
        id: stableId,
        vector,
        payload: {
          path: document.path,
          content: document.content,
        },
      };
    })
  );

  try {
    const upsert = await qdrantRequest<unknown>(
      `/collections/${COLLECTION_NAME}/points?wait=true`,
      {
        method: "PUT",
        body: JSON.stringify({ points }),
      }
    );

    if (!upsert.ok) {
      throw new Error(`Failed to upsert vectors to Qdrant. Status: ${upsert.status}`);
    }
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }
    upsertFallbackPoints(points);
  }
}

export async function searchDocuments(
  queryEmbedding: number[],
  limit: number
): Promise<VectorDocument[]> {
  try {
    await ensureCollection(queryEmbedding.length);

    const response = await qdrantRequest<QdrantSearchResponse>(
      `/collections/${COLLECTION_NAME}/points/search`,
      {
        method: "POST",
        body: JSON.stringify({
          vector: queryEmbedding,
          limit,
          with_payload: true,
        }),
      }
    );

    if (!response.ok || !response.data?.result) {
      throw new Error(`Qdrant search failed. Status: ${response.status}`);
    }

    return response.data.result
      .map((point, index) => ({
        id: `search-${index}`,
        path: point.payload?.path ?? "",
        content: point.payload?.content ?? "",
      }))
      .filter((document) => document.path.length > 0);
  } catch (error) {
    if (!isConnectivityError(error)) {
      throw error;
    }

    return fallbackPoints
      .map((point) => ({
        point,
        score: cosineSimilarity(queryEmbedding, point.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ point }) => ({
        id: point.id,
        path: point.payload.path,
        content: point.payload.content,
      }));
  }
}
