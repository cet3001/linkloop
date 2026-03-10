import { logActivity } from "../../activity/activity_logger";
import { checkModelAvailable } from "../model_health/model_health";
import { ModelRole, ModelRoute } from "./router_types";

const ROUTES: Record<ModelRole, string> = {
  conversation: "qwen3:14b",
  planner: "deepseek-r1:14b",
  coding: "qwen2.5-coder:14b",
  analysis: "qwen3:14b",
};

const FALLBACK_MODEL = "qwen3:14b";
const FALLBACK_ROLES = new Set<ModelRole>(["planner", "coding", "analysis"]);
const AVAILABILITY_TTL_MS = 30000;

const availabilityCache = new Map<string, { available: boolean; checkedAt: number }>();

async function isModelAvailable(model: string): Promise<boolean> {
  const cached = availabilityCache.get(model);
  const now = Date.now();
  if (cached && now - cached.checkedAt < AVAILABILITY_TTL_MS) {
    return cached.available;
  }
  const available = await checkModelAvailable(model);
  availabilityCache.set(model, { available, checkedAt: now });
  return available;
}

export async function getModelForRole(role: ModelRole): Promise<string> {
  const selected = ROUTES[role];
  const available = await isModelAvailable(selected);

  if (!available && FALLBACK_ROLES.has(role)) {
    logActivity(
      "verification",
      `Model fallback triggered: ${role} -> ${FALLBACK_MODEL}`
    );
    logActivity(
      "thinking",
      `Model routing selected: role=${role}, model=${FALLBACK_MODEL}`
    );
    return FALLBACK_MODEL;
  }

  logActivity("thinking", `Model routing selected: role=${role}, model=${selected}`);
  return selected;
}

export function getRoutingTable(): ModelRoute[] {
  return (Object.keys(ROUTES) as ModelRole[]).map((role) => ({
    role,
    model: ROUTES[role],
  }));
}
