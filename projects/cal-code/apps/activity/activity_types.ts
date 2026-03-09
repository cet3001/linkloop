export type ActivityType =
  | "thinking"
  | "planning"
  | "searching"
  | "tool_execution"
  | "code_edit"
  | "verification";

export interface ActivityEvent {
  type: ActivityType;
  message: string;
  timestamp: number;
}
