import { AIRequest, AIResponse } from "../types/ai_types";

const OLLAMA_TIMEOUT_MS = 60000;

interface OllamaStreamChunk {
  response?: string;
  done?: boolean;
}

function createRequestBody(request: AIRequest): string {
  return JSON.stringify({
    model: request.model,
    prompt: request.prompt,
    stream: true,
  });
}

async function readStreamingResponse(
  response: Response,
  onToken?: (token: string) => void
): Promise<string> {
  if (!response.body) {
    throw new Error("Ollama streaming response body is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const chunk = JSON.parse(trimmed) as OllamaStreamChunk;
      const token = typeof chunk.response === "string" ? chunk.response : "";
      if (!token) {
        continue;
      }
      text += token;
      onToken?.(token);
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const chunk = JSON.parse(trailing) as OllamaStreamChunk;
    const token = typeof chunk.response === "string" ? chunk.response : "";
    if (token) {
      text += token;
      onToken?.(token);
    }
  }

  return text;
}

export async function generateResponse(
  request: AIRequest
): Promise<AIResponse> {
  const text = await streamGenerateResponse(request);
  return { text };
}

export async function streamGenerateResponse(
  request: AIRequest,
  onToken?: (token: string) => void
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: createRequestBody(request),
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  return readStreamingResponse(response, onToken);
}
