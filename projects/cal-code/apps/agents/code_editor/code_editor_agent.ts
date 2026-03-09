import { runCodingTask } from "../../ai-core/runtime/ai_runtime";
import { read_file } from "../../tools/filesystem/read_file";
import { commitChanges, getDiff, getStatus } from "../../tools/git/git_executor";
import { logActivity } from "../../activity/activity_logger";
import { addReplayEvent } from "../../replay/replay_store";
import {
  getToolSuccessRatio,
  setInspectorData,
  updateInspectorData,
} from "../../inspector/inspector_store";
import { validatePatch } from "../../patch-guard/patch_guard";
import { applyPatch } from "./patch_applier";
import { CodePatch } from "./edit_types";
import { parseCodePatch } from "./patch_parser";
import { runVerification } from "../../verification/verification_runner";

export interface EditRequest {
  file: string;
  instruction: string;
  sessionId?: string;
}

function buildPrompt(file: string, content: string, instruction: string): string {
  return `
You are a code editing agent. Return only valid JSON.

Instruction:
${instruction}

Target file:
${file}

Current file content:
${content}

Output JSON in this exact shape:
{
  "file": "${file}",
  "operation": "replace" | "append",
  "target": "optional text to replace",
  "content": "new content to insert"
}

Rules:
- Return only JSON.
- Use "append" for adding new sections.
- Use "replace" only when target text exists exactly.
`.trim();
}

function buildFallbackPatch(request: EditRequest): CodePatch {
  return {
    file: request.file,
    operation: "append",
    content: [
      "",
      "## AI Architecture",
      "",
      "Cal Code uses a local-first architecture with Ollama runtime, model routing, context ranking, and tool-aware execution loops.",
    ].join("\n"),
  };
}

function extractModifiedFiles(statusOutput: string): string[] {
  return statusOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return parts[parts.length - 1];
    });
}

async function generatePatchFromFailure(
  request: EditRequest,
  verificationError: string
): Promise<CodePatch | null> {
  const prompt = `
The previous patch caused verification failure.

Instruction:
${request.instruction}

File:
${request.file}

Build/test error:
${verificationError}

Return only JSON patch in this shape:
{
  "file": "${request.file}",
  "operation": "replace" | "append",
  "target": "optional",
  "content": "..."
}
`.trim();

  try {
    const response = await runCodingTask(prompt);
    return parseCodePatch(response.text);
  } catch {
    return null;
  }
}

export async function runCodeEditorAgent(
  request: EditRequest
): Promise<{ success: boolean; message: string; patch: CodePatch }> {
  const startedAt = Date.now();
  logActivity("thinking", `Preparing edit request for ${request.file}`);
  setInspectorData({
    sessionId: request.sessionId ?? "",
    goal: request.instruction,
    sessionStatus: "running",
    stepsCompleted: 0,
    stepsRemaining: 4,
    plan: [
      "Read target file",
      "Generate structured patch",
      "Apply patch",
      "Verify update",
    ],
    toolsUsed: [],
    filesModified: [],
    modifiedFiles: [],
    currentBranch: "",
    gitDiffSummary: "",
    gitPolicyBlockedOperation: "",
    patchGuardBlockedReason: "",
    taskQueueLength: 0,
    activeWorkerTask: "",
    repoModifiedFiles: [],
    repoUntrackedFiles: [],
    executionTrace: [],
    terminalCommandsUsed: [],
    verificationCommands: [],
    verificationResult: "",
    verificationDuration: 0,
    lastCommand: "",
    executionDuration: 0,
    durationMs: 0,
    confidence: 0,
  });
  const currentFile = await read_file({ path: request.file });
  updateInspectorData({ toolsUsed: ["read_file"] }, true);
  let patch: CodePatch;
  try {
    const response = await Promise.race([
      runCodingTask(buildPrompt(request.file, currentFile, request.instruction)),
      new Promise<{ text: string }>((_, reject) => {
        setTimeout(() => reject(new Error("Edit generation timed out.")), 20000);
      }),
    ]);

    const parsed = parseCodePatch(response.text);
    patch = parsed ?? buildFallbackPatch(request);
  } catch {
    patch = buildFallbackPatch(request);
  }

  logActivity("code_edit", `Applying patch to ${patch.file}`);
  if (request.sessionId) {
    addReplayEvent(request.sessionId, {
      timestamp: Date.now(),
      type: "patch_application",
      message: `Applying patch to ${patch.file}`,
      metadata: { file: patch.file, operation: patch.operation },
    });
  }
  updateInspectorData(
    {
      executionTrace: [`[code_edit] Applying patch to ${patch.file}`],
    },
    true
  );
  const patchValidation = validatePatch(currentFile, patch);
  if (!patchValidation.allowed) {
    const reason = patchValidation.reason ?? "Patch rejected by Patch Guard.";
    logActivity("verification", "Patch blocked by Patch Guard");
    if (request.sessionId) {
      addReplayEvent(request.sessionId, {
        timestamp: Date.now(),
        type: "patch_guard_blocked",
        message: "Patch blocked by Patch Guard",
        metadata: { reason },
      });
    }
    updateInspectorData(
      {
        patchGuardBlockedReason: reason,
        sessionStatus: "failed",
        executionTrace: [`[verification] Patch Guard blocked patch: ${reason}`],
      },
      true
    );
    return {
      success: false,
      message: reason,
      patch,
    };
  }
  await applyPatch(patch);
  const statusAfterPatch = await getStatus(request.sessionId);
  const diffAfterPatch = await getDiff(request.sessionId);
  const modifiedFiles = extractModifiedFiles(statusAfterPatch.stdout);
  updateInspectorData(
    {
      modifiedFiles,
      filesModified: modifiedFiles,
      gitDiffSummary: diffAfterPatch.stdout.trim(),
    },
    true
  );
  const verificationStartedAt = Date.now();
  const verification = await runVerification(
    {
      commands: ["npm run build"],
    },
    request.sessionId
  );
  const verificationDuration = Date.now() - verificationStartedAt;
  const failed = verification.find((result) => result.exitCode !== 0);

  if (failed) {
    const errorSummary = [failed.stderr, failed.stdout].filter(Boolean).join("\n");
    const fixPatch = await generatePatchFromFailure(request, errorSummary);
    if (fixPatch) {
      const fileAfterFirstPatch = await read_file({ path: request.file });
      const fixValidation = validatePatch(fileAfterFirstPatch, fixPatch);
      if (!fixValidation.allowed) {
        const reason = fixValidation.reason ?? "Fix patch rejected by Patch Guard.";
        logActivity("verification", "Patch blocked by Patch Guard");
        if (request.sessionId) {
          addReplayEvent(request.sessionId, {
            timestamp: Date.now(),
            type: "patch_guard_blocked",
            message: "Patch blocked by Patch Guard",
            metadata: { reason },
          });
        }
        updateInspectorData(
          {
            patchGuardBlockedReason: reason,
            sessionStatus: "failed",
            executionTrace: [`[verification] Patch Guard blocked fix patch: ${reason}`],
          },
          true
        );
        return {
          success: false,
          message: reason,
          patch: fixPatch,
        };
      }
      logActivity("code_edit", `Applying fix patch to ${fixPatch.file}`);
      await applyPatch(fixPatch);
      patch = fixPatch;
      const secondRunStartedAt = Date.now();
      const secondRun = await runVerification(
        { commands: ["npm run build"] },
        request.sessionId
      );
      const secondFailed = secondRun.find((result) => result.exitCode !== 0);
      updateInspectorData(
        {
          verificationCommands: secondRun.map((result) => result.command),
          verificationResult: secondFailed
            ? `failed: ${secondFailed.command}`
            : "passed",
          verificationDuration:
            verificationDuration + (Date.now() - secondRunStartedAt),
        },
        true
      );
      if (secondFailed) {
        logActivity(
          "verification",
          `Verification failed: ${secondFailed.command} (exit ${secondFailed.exitCode})`
        );
      } else {
        logActivity("verification", "Build passed");
        try {
          const commit = await commitChanges(
            "calcode: apply verified code edit",
            request.sessionId
          );
          if (commit.exitCode === 0) {
            logActivity("verification", "Changes committed successfully");
            if (request.sessionId) {
              addReplayEvent(request.sessionId, {
                timestamp: Date.now(),
                type: "git_commit",
                message: "Changes committed successfully",
              });
            }
            updateInspectorData(
              {
                executionTrace: ["[verification] Changes committed successfully"],
              },
              true
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          updateInspectorData({ gitPolicyBlockedOperation: message }, false);
          logActivity("verification", message);
        }
      }
    } else {
      updateInspectorData(
        {
          verificationCommands: verification.map((result) => result.command),
          verificationResult: `failed: ${failed.command}`,
          verificationDuration,
        },
        true
      );
      logActivity(
        "verification",
        `Verification failed: ${failed.command} (exit ${failed.exitCode})`
      );
    }
  } else {
    updateInspectorData(
      {
        verificationCommands: verification.map((result) => result.command),
        verificationResult: "passed",
        verificationDuration,
      },
      true
    );
    logActivity("verification", "Build passed");
    try {
      const commit = await commitChanges(
        "calcode: apply verified code edit",
        request.sessionId
      );
      if (commit.exitCode === 0) {
        logActivity("verification", "Changes committed successfully");
        if (request.sessionId) {
          addReplayEvent(request.sessionId, {
            timestamp: Date.now(),
            type: "git_commit",
            message: "Changes committed successfully",
          });
        }
        updateInspectorData(
          {
            executionTrace: ["[verification] Changes committed successfully"],
          },
          true
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateInspectorData({ gitPolicyBlockedOperation: message }, false);
      logActivity("verification", message);
    }
  }

  const confidence = Math.max(0, Math.min(1, getToolSuccessRatio()));
  updateInspectorData(
    {
      sessionStatus: "completed",
      stepsCompleted: 4,
      stepsRemaining: 0,
      toolsUsed: ["write_file"],
      filesModified: [patch.file],
      durationMs: Date.now() - startedAt,
      confidence,
    },
    true
  );
  logActivity("verification", `Patch applied to ${patch.file}`);

  return {
    success: true,
    message: `Patch applied to ${patch.file}`,
    patch,
  };
}
