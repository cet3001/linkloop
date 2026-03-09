import { addMessage } from "../../memory/memory_store";
import { runToolAwareConversation } from "../../ai-core/runtime/tool_runtime";
import { ExecutionPlan } from "./planner_types";

async function runWithTimeout(
  task: Promise<string>,
  timeoutMs: number
): Promise<string> {
  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve("Step execution timed out. Move to the next step.");
    }, timeoutMs);
  });

  return Promise.race([task, timeoutPromise]);
}

export async function executePlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
  for (const step of plan.steps) {
    step.status = "in_progress";
    addMessage({
      role: "tool",
      content: `Planner step ${step.id} started: ${step.description}`,
      timestamp: Date.now(),
    });

    const executionPrompt = `
You are executing one step of a development plan.
Step: ${step.description}

Provide a concise execution result and next action.
`.trim();

    let result = "Step executed.";
    try {
      result = await runWithTimeout(
        runToolAwareConversation(executionPrompt),
        12000
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = `Step execution failed: ${message}`;
    }

    step.status = "completed";
    addMessage({
      role: "assistant",
      content: `Planner step ${step.id} completed: ${result}`,
      timestamp: Date.now(),
    });
  }

  return plan;
}
