export type ModelRole =
  | "conversation"
  | "planner"
  | "coding"
  | "analysis";

export interface ModelRoute {
  role: ModelRole;
  model: string;
}
