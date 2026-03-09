import { TOOL_REGISTRY } from "../registry/tool_registry";
import { logActivity } from "../../activity/activity_logger";
import { addReplayEvent } from "../../replay/replay_store";
import {
  recordToolExecution,
  updateInspectorData,
} from "../../inspector/inspector_store";

export async function executeTool(name: string, input: any, sessionId?: string) {
  const tool = TOOL_REGISTRY[name as keyof typeof TOOL_REGISTRY];

  if (!tool) {
    recordToolExecution(name, false);
    throw new Error(`Tool not found: ${name}`);
  }

  logActivity("tool_execution", `Executing ${name}`);
  if (sessionId) {
    addReplayEvent(sessionId, {
      timestamp: Date.now(),
      type: "tool_execution",
      message: `Executing ${name}`,
      metadata: { name },
    });
  }
  updateInspectorData(
    {
      executionTrace: [`[tool_execution] Executing ${name}`],
    },
    true
  );
  try {
    const result = await tool(input);
    recordToolExecution(name, true);
    return result;
  } catch (error) {
    recordToolExecution(name, false);
    throw error;
  }
}
