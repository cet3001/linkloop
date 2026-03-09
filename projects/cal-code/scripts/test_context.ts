import path from "node:path";
import {
  buildFileContext,
  buildProjectContext,
} from "../packages/context-engine/context/context_builder";

async function test(): Promise<void> {
  const projectRoot = process.cwd();
  const context = await buildProjectContext(projectRoot);

  console.log("Detected project files:");
  console.log(`Total files: ${context.files.length}`);

  const firstTwenty = context.files.slice(0, 20);
  firstTwenty.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}`);
  });

  if (context.files.length === 0) {
    console.log("No files found to read.");
    return;
  }

  const selected = context.files[0];
  const selectedPath = path.join(projectRoot, selected.path);
  const fileContext = await buildFileContext(selectedPath);
  const snippet = fileContext.content.slice(0, 500);

  console.log("\nSample file:");
  console.log(selected.path);
  console.log("\nContent snippet:");
  console.log(snippet);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Context engine test failed:");
  console.error(message);
  process.exit(1);
});
