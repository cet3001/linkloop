import { logActivity } from "../activity/activity_logger";
import { updateInspectorData } from "../inspector/inspector_store";
import { runTaskOrchestrator } from "../orchestrator/task_orchestrator";
import { getNextTask, getQueueLength } from "./task_queue";

let running = false;
let loopHandle: NodeJS.Timeout | null = null;
let executing = false;

async function processQueueTick(): Promise<void> {
  if (executing) {
    return;
  }

  const task = getNextTask();
  updateInspectorData({ taskQueueLength: getQueueLength() }, false);
  if (!task) {
    return;
  }

  executing = true;
  updateInspectorData({ activeWorkerTask: task.goal }, false);
  logActivity("thinking", "⚙️ Worker started task");
  updateInspectorData(
    {
      executionTrace: [`[thinking] Worker started task: ${task.goal}`],
    },
    true
  );
  try {
    await runTaskOrchestrator(task.goal);
    logActivity("verification", "🏁 Worker completed task");
    updateInspectorData(
      {
        executionTrace: [`[verification] Worker completed task: ${task.goal}`],
      },
      true
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logActivity("verification", `🏁 Worker failed task: ${message}`);
    updateInspectorData(
      {
        executionTrace: [`[verification] Worker failed task: ${message}`],
      },
      true
    );
  } finally {
    updateInspectorData(
      {
        activeWorkerTask: "",
        taskQueueLength: getQueueLength(),
      },
      false
    );
    executing = false;
  }
}

export function startTaskWorker(pollMs = 500): void {
  if (running) {
    return;
  }
  running = true;
  loopHandle = setInterval(() => {
    void processQueueTick();
  }, pollMs);
}

export function stopTaskWorker(): void {
  running = false;
  if (loopHandle) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
}
