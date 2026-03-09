import { logActivity } from "../activity/activity_logger";
import { addReplayEvent } from "../replay/replay_store";
import { updateInspectorData } from "../inspector/inspector_store";
import { runTerminalCommand } from "../tools/terminal/terminal_executor";
import { VerificationConfig, VerificationResult } from "./verification_types";

export async function runVerification(
  config: VerificationConfig,
  sessionId?: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const command of config.commands) {
    logActivity("verification", `Running verification: ${command}`);
    if (sessionId) {
      addReplayEvent(sessionId, {
        timestamp: Date.now(),
        type: "verification_start",
        message: `Running verification: ${command}`,
        metadata: { command },
      });
    }
    updateInspectorData(
      {
        executionTrace: [`[verification] Running verification: ${command}`],
      },
      true
    );
    const result = await runTerminalCommand({ command });
    results.push({
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });

    if (result.exitCode !== 0) {
      logActivity(
        "verification",
        `Verification failed: ${command} (exit ${result.exitCode})`
      );
      if (sessionId) {
        addReplayEvent(sessionId, {
          timestamp: Date.now(),
          type: "verification_result",
          message: `Verification failed: ${command} (exit ${result.exitCode})`,
          metadata: { command, exitCode: result.exitCode },
        });
      }
      updateInspectorData(
        {
          executionTrace: [
            `[verification] Verification failed: ${command} (exit ${result.exitCode})`,
          ],
        },
        true
      );
      break;
    }
    logActivity("verification", `Verification passed: ${command}`);
    if (sessionId) {
      addReplayEvent(sessionId, {
        timestamp: Date.now(),
        type: "verification_result",
        message: `Verification passed: ${command}`,
        metadata: { command, exitCode: result.exitCode },
      });
    }
    updateInspectorData(
      {
        executionTrace: [`[verification] Verification passed: ${command}`],
      },
      true
    );
  }

  return results;
}
