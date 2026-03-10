import { InspectorData } from "./inspector_types";

type InspectorSubscriber = (data: InspectorData | null) => void;

const subscribers = new Set<InspectorSubscriber>();

let inspectorData: InspectorData | null = null;
let toolAttempts = 0;
let toolSuccesses = 0;

function notify(): void {
  for (const subscriber of subscribers) {
    subscriber(inspectorData ? { ...inspectorData } : null);
  }
}

function ensureData(): InspectorData {
  if (!inspectorData) {
    inspectorData = {
      sessionId: "",
      modelRole: "",
      modelUsed: "",
      goal: "",
      sessionStatus: "running",
      stepsCompleted: 0,
      stepsRemaining: 0,
      plan: [],
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
    };
  }
  return inspectorData;
}

export function setInspectorData(data: InspectorData): void {
  inspectorData = {
    ...data,
    confidence: Math.max(0, Math.min(1, data.confidence)),
  };
  notify();
}

export function getInspectorData(): InspectorData | null {
  return inspectorData ? { ...inspectorData } : null;
}

export function clearInspector(): void {
  inspectorData = null;
  toolAttempts = 0;
  toolSuccesses = 0;
  notify();
}

export function subscribeToInspector(
  callback: InspectorSubscriber
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function updateInspectorData(
  update: Partial<InspectorData>,
  mergeLists = false
): void {
  const current = ensureData();
  inspectorData = {
    ...current,
    ...update,
    sessionId: update.sessionId ?? current.sessionId,
    modelRole: update.modelRole ?? current.modelRole,
    modelUsed: update.modelUsed ?? current.modelUsed,
    sessionStatus: update.sessionStatus ?? current.sessionStatus,
    stepsCompleted: update.stepsCompleted ?? current.stepsCompleted,
    stepsRemaining: update.stepsRemaining ?? current.stepsRemaining,
    plan:
      mergeLists && update.plan
        ? [...new Set([...current.plan, ...update.plan])]
        : update.plan ?? current.plan,
    toolsUsed:
      mergeLists && update.toolsUsed
        ? [...new Set([...current.toolsUsed, ...update.toolsUsed])]
        : update.toolsUsed ?? current.toolsUsed,
    filesModified:
      mergeLists && update.filesModified
        ? [...new Set([...current.filesModified, ...update.filesModified])]
        : update.filesModified ?? current.filesModified,
    modifiedFiles:
      mergeLists && update.modifiedFiles
        ? [...new Set([...current.modifiedFiles, ...update.modifiedFiles])]
        : update.modifiedFiles ?? current.modifiedFiles,
    currentBranch: update.currentBranch ?? current.currentBranch,
    gitDiffSummary: update.gitDiffSummary ?? current.gitDiffSummary,
    gitPolicyBlockedOperation:
      update.gitPolicyBlockedOperation ?? current.gitPolicyBlockedOperation,
    patchGuardBlockedReason:
      update.patchGuardBlockedReason ?? current.patchGuardBlockedReason,
    taskQueueLength: update.taskQueueLength ?? current.taskQueueLength,
    activeWorkerTask: update.activeWorkerTask ?? current.activeWorkerTask,
    repoModifiedFiles:
      mergeLists && update.repoModifiedFiles
        ? [...new Set([...current.repoModifiedFiles, ...update.repoModifiedFiles])]
        : update.repoModifiedFiles ?? current.repoModifiedFiles,
    repoUntrackedFiles:
      mergeLists && update.repoUntrackedFiles
        ? [...new Set([...current.repoUntrackedFiles, ...update.repoUntrackedFiles])]
        : update.repoUntrackedFiles ?? current.repoUntrackedFiles,
    executionTrace:
      mergeLists && update.executionTrace
        ? [...current.executionTrace, ...update.executionTrace]
        : update.executionTrace ?? current.executionTrace,
    terminalCommandsUsed:
      mergeLists && update.terminalCommandsUsed
        ? [
            ...new Set([
              ...current.terminalCommandsUsed,
              ...update.terminalCommandsUsed,
            ]),
          ]
        : update.terminalCommandsUsed ?? current.terminalCommandsUsed,
    verificationCommands:
      mergeLists && update.verificationCommands
        ? [
            ...new Set([
              ...current.verificationCommands,
              ...update.verificationCommands,
            ]),
          ]
        : update.verificationCommands ?? current.verificationCommands,
    verificationResult: update.verificationResult ?? current.verificationResult,
    verificationDuration:
      update.verificationDuration ?? current.verificationDuration,
    lastCommand: update.lastCommand ?? current.lastCommand,
    executionDuration: update.executionDuration ?? current.executionDuration,
  };
  notify();
}

export function recordToolExecution(name: string, success: boolean): void {
  toolAttempts += 1;
  if (success) {
    toolSuccesses += 1;
  }
  updateInspectorData({ toolsUsed: [name] }, true);
}

export function getToolSuccessRatio(): number {
  if (toolAttempts === 0) {
    return 1;
  }
  return toolSuccesses / toolAttempts;
}
