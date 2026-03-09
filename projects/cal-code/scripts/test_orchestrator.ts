import { clearMemory, getMemory } from "../apps/memory/memory_store";
import { runTaskOrchestrator } from "../apps/orchestrator/task_orchestrator";

async function test(): Promise<void> {
  const goal = "Create a simple README file explaining this project.";
  clearMemory();

  console.log("Goal:");
  console.log(goal);

  const result = await runTaskOrchestrator(goal);

  console.log("\nFinal result:");
  console.log(result);

  console.log(`\nMemory entries recorded: ${getMemory().length}`);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Orchestrator test failed:");
  console.error(message);
  process.exit(1);
});
