import { runConversation } from "../apps/ai-core/runtime/ai_runtime";

async function test() {
  const response = await runConversation("Explain what an IDE is.");

  console.log("\nAI RESPONSE:\n");
  console.log(response.text);
}

test();
