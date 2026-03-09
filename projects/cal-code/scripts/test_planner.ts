import { executePlan } from "../apps/agents/planner/plan_executor";
import { generateExecutionPlan } from "../apps/agents/planner/planner_agent";
import { clearMemory, getMemory } from "../apps/memory/memory_store";

async function test(): Promise<void> {
  const goal = "Create a simple Node.js REST API with one endpoint.";
  clearMemory();

  console.log("GOAL:");
  console.log(goal);

  const plan = await generateExecutionPlan(goal);
  console.log("\nGENERATED PLAN:");
  plan.steps.forEach((step) => {
    console.log(`- [${step.status}] ${step.id}. ${step.description}`);
  });

  const simulationPlan = {
    ...plan,
    steps: plan.steps.slice(0, 3),
  };

  console.log("\nEXECUTION LOG:");
  console.log(`Simulating first ${simulationPlan.steps.length} steps...`);
  const executed = await executePlan(simulationPlan);
  executed.steps.forEach((step) => {
    console.log(`- [${step.status}] ${step.id}. ${step.description}`);
  });

  const memory = getMemory();
  console.log(`\nMEMORY ENTRIES: ${memory.length}`);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Planner test failed:");
  console.error(message);
  process.exit(1);
});
