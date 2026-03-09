import { runToolAwareConversation } from "../apps/ai-core/runtime/tool_runtime";
import { clearMemory, getMemory } from "../apps/memory/memory_store";

async function test(): Promise<void> {
  clearMemory();

  const first = await runToolAwareConversation("What is Cal Code?");
  console.log("FIRST RESPONSE:\n", first);

  const second = await runToolAwareConversation(
    "Read README.md and summarize it in two bullet points."
  );
  console.log("\nSECOND RESPONSE:\n", second);

  const memory = getMemory();
  console.log("\nSTORED MEMORY:");
  console.log(JSON.stringify(memory, null, 2));
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Memory test failed:");
  console.error(message);
  process.exit(1);
});
