export interface TaskSession {
  id: string;
  goal: string;
  createdAt: number;
  stepsCompleted: number;
  stepsRemaining: number;
  status: "running" | "completed" | "failed";
}
