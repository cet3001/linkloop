import { generateResponse } from "../ollama/ollama_client";
import { getModelForTask } from "../../../packages/model-router/model_router";

export async function runConversation(prompt: string) {
  return generateResponse({
    model: getModelForTask("conversation"),
    prompt,
  });
}

export async function runCodingTask(prompt: string) {
  return generateResponse({
    model: getModelForTask("coding"),
    prompt,
  });
}

export async function runPlanningTask(prompt: string) {
  return generateResponse({
    model: getModelForTask("planning"),
    prompt,
  });
}
