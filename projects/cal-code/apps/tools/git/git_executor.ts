import { spawn } from "node:child_process";
import { logActivity } from "../../activity/activity_logger";
import { updateInspectorData } from "../../inspector/inspector_store";
import { validateGitOperation } from "../../git-policy/git_policy";
import { addReplayEvent } from "../../replay/replay_store";
import { GitResult } from "./git_types";

function runRawGit(args: string[]): Promise<GitResult> {
  return new Promise<GitResult>((resolve) => {
    const child = spawn("git", args, {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        exitCode: 1,
      });
    });

    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
  });
}

async function getCurrentBranchName(): Promise<string> {
  const result = await runRawGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (result.exitCode !== 0) {
    return "";
  }
  return result.stdout.trim();
}

async function runGit(args: string[], sessionId?: string): Promise<GitResult> {
  const command = args.join(" ");
  const currentBranch = await getCurrentBranchName();
  const policy = validateGitOperation({ command, currentBranch });
  if (!policy.allowed) {
    const reason = policy.reason ?? "Git operation blocked by safety policy.";
    updateInspectorData({ gitPolicyBlockedOperation: reason }, false);
    if (sessionId) {
      addReplayEvent(sessionId, {
        timestamp: Date.now(),
        type: "git_policy_blocked",
        message: reason,
        metadata: { command, currentBranch },
      });
    }
    updateInspectorData(
      { executionTrace: [`[verification] ${reason}`] },
      true
    );
    throw new Error(reason);
  }

  logActivity("tool_execution", `Running git ${command}`);
  if (sessionId) {
    addReplayEvent(sessionId, {
      timestamp: Date.now(),
      type: command.startsWith("commit") ? "git_commit" : "git_command",
      message: `Running git ${command}`,
      metadata: { command, currentBranch },
    });
  }
  updateInspectorData(
    { executionTrace: [`[tool_execution] Running git ${command}`] },
    true
  );
  return runRawGit(args);
}

export async function createBranch(name: string, sessionId?: string): Promise<GitResult> {
  const created = await runGit(["checkout", "-b", name], sessionId);
  if (created.exitCode === 0) {
    return created;
  }
  // Branch may already exist; attempt checkout as fallback.
  return runGit(["checkout", name], sessionId);
}

export function getStatus(sessionId?: string): Promise<GitResult> {
  return runGit(["status", "--short"], sessionId);
}

export function getDiff(sessionId?: string): Promise<GitResult> {
  return runGit(["diff", "--stat"], sessionId);
}

export function commitChanges(message: string, sessionId?: string): Promise<GitResult> {
  return runGit(["commit", "-am", message], sessionId);
}
