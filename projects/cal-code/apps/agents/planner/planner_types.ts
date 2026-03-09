export interface PlanStep {
  id: number;
  description: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ExecutionPlan {
  goal: string;
  steps: PlanStep[];
}
