import { executeTool } from "../apps/tools/executor/tool_executor";
import { parseToolCall } from "../apps/tools/executor/tool_parser";

async function test() {
  const listing = await executeTool("list_directory", { path: "." });
  if (!Array.isArray(listing)) {
    throw new Error("Expected list_directory to return an array.");
  }
  console.log("DIRECTORY LISTING (first 10):", listing.slice(0, 10));

  const readmeContent = await executeTool("read_file", { path: "README.md" });
  if (typeof readmeContent !== "string") {
    throw new Error("Expected read_file to return a string.");
  }
  console.log("README SNIPPET:", readmeContent.substring(0, 200));

  const parsed = parseToolCall(`{
    "tool": "read_file",
    "input": {
      "path": "README.md"
    }
  }`);
  console.log("PARSED TOOL CALL:", parsed);
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Tool executor test failed:");
  console.error(message);
  process.exit(1);
});
