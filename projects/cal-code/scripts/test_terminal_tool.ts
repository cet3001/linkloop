import { runTerminalCommand } from "../apps/tools/terminal/terminal_executor";

async function test(): Promise<void> {
  const nodeVersion = await runTerminalCommand({ command: "node -v" });
  console.log("node -v");
  console.log("exit:", nodeVersion.exitCode);
  console.log("stdout:", nodeVersion.stdout.trim());
  console.log("stderr:", nodeVersion.stderr.trim());

  const list = await runTerminalCommand({ command: "ls" });
  console.log("\nls");
  console.log("exit:", list.exitCode);
  console.log("stdout:", list.stdout.trim());
  console.log("stderr:", list.stderr.trim());
}

test().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Terminal tool test failed:");
  console.error(message);
  process.exit(1);
});
