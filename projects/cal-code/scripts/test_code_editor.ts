import { read_file } from "../apps/tools/filesystem/read_file";
import { runCodeEditorAgent } from "../apps/agents/code_editor/code_editor_agent";

async function test(): Promise<void> {
  const file = "README.md";

  const result = await runCodeEditorAgent({
    file,
    instruction: 'Add a new section called "AI Architecture" to the README.',
  });

  console.log("Patch detected/applied:");
  console.log(result);

  const updated = await read_file({ path: file });
  const hasSection = updated.includes("## AI Architecture");

  console.log("\nREADME.md updated:", hasSection);
  if (hasSection) {
    const sectionStart = updated.indexOf("## AI Architecture");
    console.log("\nSection snippet:");
    console.log(updated.slice(sectionStart, sectionStart + 240));
  }
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Code editor test failed:");
  console.error(message);
  process.exit(1);
});
