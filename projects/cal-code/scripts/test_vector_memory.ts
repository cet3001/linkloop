import { indexProjectFiles } from "../apps/vector-memory/vector_indexer";
import { searchRelevantFiles } from "../apps/vector-memory/vector_search";

async function test(): Promise<void> {
  const rootPath = process.cwd();
  console.log("Indexing project files...");
  const indexedCount = await indexProjectFiles(rootPath);
  console.log(`Indexed files: ${indexedCount}`);

  console.log('\nRunning semantic search for: "Explain the AI runtime"');
  const results = await searchRelevantFiles("Explain the AI runtime");

  console.log("\nTop relevant files:");
  results.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.path}`);
  });
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Vector memory test failed:");
  console.error(message);
  process.exit(1);
});
