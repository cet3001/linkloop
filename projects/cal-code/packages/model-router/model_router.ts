import { TaskType } from "./router_types";

const MODEL_MAP: Record<TaskType, string> = {
  conversation: "qwen3:14b",
  coding: "qwen2.5-coder:32b",
  planning: "deepseek-r1:14b",
  fast: "phi4",
};

export function getModelForTask(task: TaskType): string {
  return MODEL_MAP[task];
}
