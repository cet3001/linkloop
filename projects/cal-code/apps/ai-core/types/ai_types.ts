export type ModelType = "conversation" | "coding" | "planning" | "fast";

export interface AIRequest {
  model: string;
  prompt: string;
  system_prompt?: string;
  temperature?: number;
}

export interface AIResponse {
  text: string;
}
