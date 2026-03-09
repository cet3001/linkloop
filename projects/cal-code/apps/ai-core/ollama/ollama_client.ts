import { AIRequest, AIResponse } from "../types/ai_types";

const OLLAMA_TIMEOUT_MS = 60000;

export async function generateResponse(
  request: AIRequest
): Promise<AIResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      stream: false,
    }),
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { response?: string };
  if (typeof data.response !== "string") {
    throw new Error("Ollama response did not include generated text.");
  }

  return {
    text: data.response,
  };
}
