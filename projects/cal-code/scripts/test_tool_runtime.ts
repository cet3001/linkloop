import { runToolAwareConversation } from "../apps/ai-core/runtime/tool_runtime";

async function test(): Promise<void> {
  const prompt = "Read the README.md file and summarize it.";
  const result = await runToolAwareConversation(prompt);

  console.log("\nTOOL-AWARE RESPONSE:\n");
  console.log(result);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Tool-aware runtime test failed:");
  console.error(message);
  process.exit(1);
});
