import { useEffect, useState } from "react";
import {
  getInspectorData,
  subscribeToInspector,
} from "../../../../inspector/inspector_store";
import { InspectorData } from "../../../../inspector/inspector_types";
import { getReplay } from "../../../../replay/replay_store";
import { DiffViewer } from "./DiffViewer";
import { theme } from "../design/theme";

function renderList(items: string[]): string {
  return items.length === 0 ? "None" : items.join("\n");
}

export function InspectorPanel() {
  const [data, setData] = useState<InspectorData | null>(null);

  useEffect(() => {
    setData(getInspectorData());
    return subscribeToInspector((next) => {
      setData(next);
    });
  }, []);

  const replay = data?.sessionId ? getReplay(data.sessionId) : null;
  const replayLines =
    replay?.events
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return `${time} [${event.type}] ${event.message}`;
      }) ?? [];

  return (
    <section
      className="h-full border-l overflow-y-auto"
      style={{
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
      }}
    >
      <div
        className="border-b text-sm font-semibold"
        style={{
          borderColor: theme.colors.border,
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
        }}
      >
        AI Inspector
      </div>

      <div className="grid gap-3" style={{ padding: theme.spacing.md }}>
        {!data ? (
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
            No task data yet.
          </p>
        ) : (
          <>
            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">Task Summary</h3>
              <p className="text-sm whitespace-pre-wrap">{data.goal || "N/A"}</p>
              <p className="text-sm">Session ID: {data.sessionId || "N/A"}</p>
              <p className="text-sm">Model Role: {data.modelRole || "N/A"}</p>
              <p className="text-sm">Model Used: {data.modelUsed || "N/A"}</p>
              <p className="text-sm">Session Status: {data.sessionStatus}</p>
              <p className="text-sm">Steps Completed: {data.stepsCompleted}</p>
              <p className="text-sm">Steps Remaining: {data.stepsRemaining}</p>
              <p className="text-sm">Task Queue Length: {data.taskQueueLength}</p>
              <p className="text-sm">
                Active Worker Task: {data.activeWorkerTask || "None"}
              </p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">Plan</h3>
              <p className="text-sm whitespace-pre-wrap">{renderList(data.plan)}</p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">Tools Used</h3>
              <p className="text-sm whitespace-pre-wrap">
                {renderList(data.toolsUsed)}
              </p>
              <p className="text-sm">Current Branch: {data.currentBranch || "N/A"}</p>
              <p className="text-sm">
                Patch Guard Blocked Reason: {data.patchGuardBlockedReason || "None"}
              </p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">
                Files Modified
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {renderList(data.modifiedFiles.length ? data.modifiedFiles : data.filesModified)}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                Repo Modified Files: {renderList(data.repoModifiedFiles)}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                Repo Untracked Files: {renderList(data.repoUntrackedFiles)}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                Diff Summary:
                {"\n"}
                {data.gitDiffSummary || "N/A"}
              </p>
              <div className="mt-2">
                <h4 className="text-xs uppercase tracking-wide mb-1">
                  Full Diff Viewer
                </h4>
                <DiffViewer diffText={data.gitDiffSummary || ""} />
              </div>
              <p className="text-sm">
                Git Policy Blocked Operation:{" "}
                {data.gitPolicyBlockedOperation || "None"}
              </p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">
                Execution Metrics
              </h3>
              <p className="text-sm">Duration: {data.durationMs} ms</p>
              <p className="text-sm">
                Terminal Duration: {data.executionDuration} ms
              </p>
              <p className="text-sm">Last Command: {data.lastCommand || "N/A"}</p>
              <p className="text-sm whitespace-pre-wrap">
                Terminal Commands: {renderList(data.terminalCommandsUsed)}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                Verification Commands: {renderList(data.verificationCommands)}
              </p>
              <p className="text-sm">
                Verification Result: {data.verificationResult || "N/A"}
              </p>
              <p className="text-sm">
                Verification Duration: {data.verificationDuration} ms
              </p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">Confidence</h3>
              <p className="text-sm">{data.confidence.toFixed(2)}</p>
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide mb-1">
                Execution Trace
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {renderList(replayLines.length ? replayLines : data.executionTrace)}
              </p>
            </section>
          </>
        )}
      </div>
    </section>
  );
}
