import {
  generateResponse,
  streamGenerateResponse,
} from "../ollama/ollama_client";
import { logActivity } from "../../activity/activity_logger";
import { updateInspectorData } from "../../inspector/inspector_store";
import { getModelForRole } from "../router/model_router";
import { ModelRole } from "../router/router_types";

async function runByRole(
  role: ModelRole,
  prompt: string,
  sessionId?: string
) {
  const model = await getModelForRole(role);
  const inspectorUpdate = {
    modelRole: role,
    modelUsed: model,
    ...(sessionId ? { sessionId } : {}),
  };
  updateInspectorData(
    inspectorUpdate,
    false
  );
  logActivity("thinking", `Model inference started (${role} -> ${model})`);
  const response = await generateResponse({
    model,
    prompt,
  });
  logActivity("verification", `Model inference completed (${role} -> ${model})`);
  return response;
}

async function runByRoleStream(
  role: ModelRole,
  prompt: string,
  onToken?: (token: string) => void,
  sessionId?: string
) {
  const model = await getModelForRole(role);
  const inspectorUpdate = {
    modelRole: role,
    modelUsed: model,
    ...(sessionId ? { sessionId } : {}),
  };
  updateInspectorData(
    inspectorUpdate,
    false
  );
  logActivity("thinking", `Model inference started (${role} -> ${model})`);
  const text = await streamGenerateResponse(
    {
      model,
      prompt,
    },
    onToken
  );
  logActivity("verification", `Model inference completed (${role} -> ${model})`);
  return { text };
}

export async function runConversation(prompt: string, sessionId?: string) {
  return runByRole("conversation", prompt, sessionId);
}

export async function runConversationStream(
  prompt: string,
  onToken?: (token: string) => void,
  sessionId?: string
) {
  return runByRoleStream("conversation", prompt, onToken, sessionId);
}

export async function runCodingTask(prompt: string, sessionId?: string) {
  return runByRole("coding", prompt, sessionId);
}

export async function runPlanningTask(prompt: string, sessionId?: string) {
  return runByRole("planner", prompt, sessionId);
}

export async function runAnalysisTask(prompt: string, sessionId?: string) {
  return runByRole("analysis", prompt, sessionId);
}

export async function runAnalysisStream(
  prompt: string,
  onToken?: (token: string) => void,
  sessionId?: string
) {
  return runByRoleStream("analysis", prompt, onToken, sessionId);
}
