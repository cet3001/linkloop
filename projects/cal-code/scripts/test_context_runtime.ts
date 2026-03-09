import { runToolAwareConversation } from "../apps/ai-core/runtime/tool_runtime";

async function test(): Promise<void> {
  const prompt = "Explain how Cal Code communicates with Ollama.";
  const response = await runToolAwareConversation(prompt);

  console.log("\nCONTEXT-RUNTIME RESPONSE:\n");
  console.log(response);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Context runtime test failed:");
  console.error(message);
  process.exit(1);
});
