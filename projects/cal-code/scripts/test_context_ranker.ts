import {
  buildRankedContext,
  rankContext,
} from "../packages/context-ranking/context_ranker";
import { addMessage, clearMemory } from "../apps/memory/memory_store";
import { indexProjectFiles } from "../apps/vector-memory/vector_indexer";

async function test(): Promise<void> {
  const query = "Explain how the AI runtime works.";
  await indexProjectFiles(process.cwd());
  clearMemory();
  addMessage({
    role: "user",
    content: "How does Cal Code talk to local models?",
    timestamp: Date.now(),
  });
  addMessage({
    role: "assistant",
    content: "It routes requests through ai_runtime and the Ollama client.",
    timestamp: Date.now(),
  });

  console.log(`Query: ${query}\n`);

  const ranked = await rankContext(query);
  console.log("Ranked context items:");
  ranked.forEach((item, index) => {
    console.log(
      `${index + 1}. source=${item.source}, score=${item.score.toFixed(2)}`
    );
  });

  const promptContext = await buildRankedContext(query);
  console.log("\nCombined context prompt:\n");
  console.log(promptContext);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Context ranker test failed:");
  console.error(message);
  process.exit(1);
});
