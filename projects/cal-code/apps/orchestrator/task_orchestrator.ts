import { generateExecutionPlan } from "../agents/planner/planner_agent";
import { logActivity } from "../activity/activity_logger";
import { runToolAwareConversation } from "../ai-core/runtime/tool_runtime";
import { addMessage } from "../memory/memory_store";
import { createBranch } from "../tools/git/git_executor";
import {
  clearInspector,
  getInspectorData,
  getToolSuccessRatio,
  setInspectorData,
  updateInspectorData,
} from "../inspector/inspector_store";
import {
  markStepCompleted,
  markTaskCompleted,
  markTaskFailed,
  resetTaskSession,
  setTaskTotalSteps,
  startTaskSession,
} from "../session/session_manager";
import { addReplayEvent, createReplay } from "../replay/replay_store";
import { enqueueTask, getQueueLength } from "../worker/task_queue";
import { startTaskWorker } from "../worker/task_worker";
import { TaskResult } from "./orchestrator_types";

const STEP_TIMEOUT_MS = 60000;

function withStepTimeout(task: Promise<string>): Promise<string> {
  return Promise.race([
    task,
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Step execution timed out.")), STEP_TIMEOUT_MS);
    }),
  ]);
}

export function queueTaskOrchestrator(goal: string): TaskResult {
  const task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    goal,
    createdAt: Date.now(),
  };
  enqueueTask(task);
  startTaskWorker();
  updateInspectorData(
    {
      goal,
      sessionStatus: "running",
      stepsCompleted: 0,
      stepsRemaining: 0,
      taskQueueLength: getQueueLength(),
      activeWorkerTask: "",
    },
    false
  );
  logActivity("thinking", "🧠 Task queued");
  updateInspectorData(
    {
      executionTrace: [`[thinking] Task queued: ${goal}`],
    },
    true
  );
  return { success: true, message: "Task queued for background worker." };
}

export async function runTaskOrchestrator(goal: string): Promise<TaskResult> {
  const start = Date.now();
  resetTaskSession();
  clearInspector();
  const session = startTaskSession(goal, 0);
  createReplay(session.id, goal);
  updateInspectorData(
    {
      sessionId: session.id,
    },
    false
  );
  addReplayEvent(session.id, {
    timestamp: Date.now(),
    type: "worker_start",
    message: "Worker started task",
    metadata: { goal },
  });
  const branchName = `calcode/${Date.now()}`;
  const branchResult = await createBranch(branchName, session.id);
  const plan = await generateExecutionPlan(goal, session.id);
  const updatedSession = setTaskTotalSteps(plan.steps.length);
  addReplayEvent(session.id, {
    timestamp: Date.now(),
    type: "session_start",
    message: "Task session started",
    metadata: { sessionId: session.id, goal },
  });
  updateInspectorData(
    {
      executionTrace: [`[planning] Session started: ${session.id}`],
    },
    true
  );
  updateInspectorData(
    {
      goal,
      sessionStatus: session.status,
      stepsCompleted: updatedSession?.stepsCompleted ?? session.stepsCompleted,
      stepsRemaining: updatedSession?.stepsRemaining ?? session.stepsRemaining,
      plan: plan.steps.map((step) => step.description),
      toolsUsed: [],
      filesModified: [],
      modifiedFiles: [],
      currentBranch: branchResult.exitCode === 0 ? branchName : "branch-creation-failed",
      gitDiffSummary: "",
      gitPolicyBlockedOperation: "",
      patchGuardBlockedReason: "",
      taskQueueLength: getQueueLength(),
      activeWorkerTask: goal,
      repoModifiedFiles: [],
      repoUntrackedFiles: [],
      executionTrace: [],
      sessionId: session.id,
      terminalCommandsUsed: [],
      verificationCommands: [],
      verificationResult: "",
      verificationDuration: 0,
      lastCommand: "",
      executionDuration: 0,
      durationMs: 0,
      confidence: 0,
    },
    false
  );

  console.log("Generated plan:");
  for (const step of plan.steps) {
    console.log(`- [${step.status}] ${step.id}. ${step.description}`);
  }

  for (const step of plan.steps) {
    step.status = "in_progress";
    console.log(`\nRunning step ${step.id}: ${step.description}`);
    addMessage({
      role: "tool",
      content: `Orchestrator step ${step.id} started: ${step.description}`,
      timestamp: Date.now(),
    });

    try {
      const result = await withStepTimeout(
        runToolAwareConversation(step.description, session.id)
      );
      step.status = "completed";
      const progressedSession = markStepCompleted();
      addReplayEvent(session.id, {
        timestamp: Date.now(),
        type: "step_completed",
        message: `Step ${step.id} completed`,
        metadata: { stepId: step.id, description: step.description },
      });
      updateInspectorData(
        {
          executionTrace: [`[verification] Step ${step.id} completed`],
        },
        true
      );
      console.log(`Step ${step.id} completed.`);
      addMessage({
        role: "assistant",
        content: `Orchestrator step ${step.id} result: ${result}`,
        timestamp: Date.now(),
      });
      updateInspectorData(
        {
          sessionStatus: progressedSession?.status ?? "running",
          stepsCompleted: progressedSession?.stepsCompleted ?? 0,
          stepsRemaining: progressedSession?.stepsRemaining ?? 0,
        },
        false
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Step ${step.id} failed: ${message}`);
      addMessage({
        role: "assistant",
        content: `Orchestrator step ${step.id} failed: ${message}`,
        timestamp: Date.now(),
      });
      const successfulSteps = plan.steps.filter(
        (candidate) => candidate.status === "completed"
      ).length;
      const totalSteps = plan.steps.length === 0 ? 1 : plan.steps.length;
      const stepSuccessRatio = successfulSteps / totalSteps;
      const toolSuccessRatio = getToolSuccessRatio();
      const confidence = Math.max(
        0,
        Math.min(1, stepSuccessRatio * toolSuccessRatio)
      );
      const failedSession = markTaskFailed();
      addReplayEvent(session.id, {
        timestamp: Date.now(),
        type: "session_failed",
        message: `Session failed at step ${step.id}`,
        metadata: { stepId: step.id, error: message },
      });
      addReplayEvent(session.id, {
        timestamp: Date.now(),
        type: "worker_finish",
        message: "Worker failed task",
        metadata: { goal, error: message },
      });
      updateInspectorData(
        {
          executionTrace: [`[verification] Session failed at step ${step.id}: ${message}`],
        },
        true
      );
      const existing = getInspectorData();

      setInspectorData({
        sessionId: session.id,
        goal,
        sessionStatus: failedSession?.status ?? "failed",
        stepsCompleted: failedSession?.stepsCompleted ?? successfulSteps,
        stepsRemaining: failedSession?.stepsRemaining ?? totalSteps - successfulSteps,
        plan: plan.steps.map((candidate) => candidate.description),
        toolsUsed: existing?.toolsUsed ?? [],
        filesModified: existing?.filesModified ?? [],
        modifiedFiles: existing?.modifiedFiles ?? [],
        currentBranch: existing?.currentBranch ?? "",
        gitDiffSummary: existing?.gitDiffSummary ?? "",
        gitPolicyBlockedOperation: existing?.gitPolicyBlockedOperation ?? "",
        patchGuardBlockedReason: existing?.patchGuardBlockedReason ?? "",
        taskQueueLength: getQueueLength(),
        activeWorkerTask: "",
        repoModifiedFiles: existing?.repoModifiedFiles ?? [],
        repoUntrackedFiles: existing?.repoUntrackedFiles ?? [],
        executionTrace: existing?.executionTrace ?? [],
        terminalCommandsUsed: existing?.terminalCommandsUsed ?? [],
        verificationCommands: existing?.verificationCommands ?? [],
        verificationResult: existing?.verificationResult ?? "",
        verificationDuration: existing?.verificationDuration ?? 0,
        lastCommand: existing?.lastCommand ?? "",
        executionDuration: existing?.executionDuration ?? 0,
        durationMs: Date.now() - start,
        confidence,
      });

      return {
        success: false,
        message: `Execution stopped at step ${step.id}: ${message}`,
        sessionId: session.id,
      };
    }
  }

  const successfulSteps = plan.steps.filter(
    (candidate) => candidate.status === "completed"
  ).length;
  const totalSteps = plan.steps.length === 0 ? 1 : plan.steps.length;
  const stepSuccessRatio = successfulSteps / totalSteps;
  const toolSuccessRatio = getToolSuccessRatio();
  const confidence = Math.max(0, Math.min(1, stepSuccessRatio * toolSuccessRatio));
  const completedSession = markTaskCompleted();
  addReplayEvent(session.id, {
    timestamp: Date.now(),
    type: "session_completed",
    message: "Session completed successfully",
    metadata: { sessionId: completedSession?.id ?? "", steps: successfulSteps },
  });
  addReplayEvent(session.id, {
    timestamp: Date.now(),
    type: "worker_finish",
    message: "Worker completed task",
    metadata: { goal },
  });
  updateInspectorData(
    {
      executionTrace: ["[verification] Session completed successfully"],
    },
    true
  );

  const current = {
    goal,
    sessionStatus: completedSession?.status ?? "completed",
    stepsCompleted: completedSession?.stepsCompleted ?? successfulSteps,
    stepsRemaining: completedSession?.stepsRemaining ?? 0,
    plan: plan.steps.map((step) => step.description),
    durationMs: Date.now() - start,
    confidence,
  };
  const existing = getInspectorData();
  setInspectorData({
    sessionId: session.id,
    ...current,
    toolsUsed: existing?.toolsUsed ?? [],
    filesModified: existing?.filesModified ?? [],
    modifiedFiles: existing?.modifiedFiles ?? [],
    currentBranch: existing?.currentBranch ?? "",
    gitDiffSummary: existing?.gitDiffSummary ?? "",
    gitPolicyBlockedOperation: existing?.gitPolicyBlockedOperation ?? "",
    patchGuardBlockedReason: existing?.patchGuardBlockedReason ?? "",
    taskQueueLength: getQueueLength(),
    activeWorkerTask: "",
    repoModifiedFiles: existing?.repoModifiedFiles ?? [],
    repoUntrackedFiles: existing?.repoUntrackedFiles ?? [],
    executionTrace: existing?.executionTrace ?? [],
    terminalCommandsUsed: existing?.terminalCommandsUsed ?? [],
    verificationCommands: existing?.verificationCommands ?? [],
    verificationResult: existing?.verificationResult ?? "",
    verificationDuration: existing?.verificationDuration ?? 0,
    lastCommand: existing?.lastCommand ?? "",
    executionDuration: existing?.executionDuration ?? 0,
  });

  return {
    success: true,
    message: `Completed ${plan.steps.length} steps successfully.`,
    sessionId: session.id,
  };
}
