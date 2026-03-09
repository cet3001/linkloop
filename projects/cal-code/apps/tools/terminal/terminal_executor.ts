import { spawn } from "node:child_process";
import path from "node:path";
import { logActivity } from "../../activity/activity_logger";
import { updateInspectorData } from "../../inspector/inspector_store";
import { TerminalCommand, TerminalResult } from "./terminal_types";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function runTerminalCommand(
  cmd: TerminalCommand
): Promise<TerminalResult> {
  const startedAt = Date.now();
  const cwd = cmd.cwd ? path.resolve(cmd.cwd) : process.cwd();
  const timeoutMs = cmd.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  logActivity("tool_execution", `Running command: ${cmd.command}`);

  return new Promise<TerminalResult>((resolve) => {
    const child = spawn(cmd.command, {
      cwd,
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");

      const duration = Date.now() - startedAt;
      updateInspectorData(
        {
          terminalCommandsUsed: [cmd.command],
          lastCommand: cmd.command,
          executionDuration: duration,
        },
        true
      );

      resolve({
        stdout,
        stderr: `${stderr}\nCommand timed out after ${timeoutMs}ms`.trim(),
        exitCode: 124,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);

      const duration = Date.now() - startedAt;
      updateInspectorData(
        {
          terminalCommandsUsed: [cmd.command],
          lastCommand: cmd.command,
          executionDuration: duration,
        },
        true
      );

      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        exitCode: 1,
      });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);

      const duration = Date.now() - startedAt;
      updateInspectorData(
        {
          terminalCommandsUsed: [cmd.command],
          lastCommand: cmd.command,
          executionDuration: duration,
        },
        true
      );

      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
  });
}
