import { runPlanningTask } from "../../ai-core/runtime/ai_runtime";
import { logActivity } from "../../activity/activity_logger";
import { addReplayEvent } from "../../replay/replay_store";
import { updateInspectorData } from "../../inspector/inspector_store";
import { getDiff, getStatus } from "../../tools/git/git_executor";
import { ExecutionPlan, PlanStep } from "./planner_types";

interface RawPlanStep {
  description?: unknown;
}

interface RawPlanPayload {
  steps?: unknown;
}

const DEFAULT_PLANNER_TIMEOUT_MS = 20000;

function buildPlannerPrompt(goal: string, repositoryState: string): string {
  return `
Break the following goal into concrete development steps and return JSON only.

Goal: ${goal}

Repository State:
${repositoryState}

Return JSON in this exact shape:
{
  "steps": [
    { "description": "..." }
  ]
}

Rules:
- Output valid JSON only (no markdown, no prose).
- Include 4-8 practical implementation steps.
- Keep each description short and actionable.
`.trim();
}

function parsePlanSteps(modelOutput: string): PlanStep[] {
  let parsed: RawPlanPayload | null = null;

  try {
    parsed = JSON.parse(modelOutput) as RawPlanPayload;
  } catch {
    const fencedMatch = modelOutput.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch) {
      try {
        parsed = JSON.parse(fencedMatch[1]) as RawPlanPayload;
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error("Planner output did not contain a valid JSON steps array.");
  }

  const normalized: PlanStep[] = [];
  for (const [index, step] of (parsed.steps as RawPlanStep[]).entries()) {
    const description =
      typeof step.description === "string" ? step.description.trim() : "";
    if (!description) {
      continue;
    }

    normalized.push({
      id: index + 1,
      description,
      status: "pending",
    });
  }

  if (normalized.length === 0) {
    throw new Error("Planner returned no usable steps.");
  }

  return normalized;
}

function parseStatusFiles(statusOutput: string): {
  modifiedFiles: string[];
  untrackedFiles: string[];
} {
  const modifiedFiles: string[] = [];
  const untrackedFiles: string[] = [];

  for (const rawLine of statusOutput.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("?? ")) {
      untrackedFiles.push(line.slice(3).trim());
      continue;
    }
    const file = line.slice(3).trim() || line;
    modifiedFiles.push(file);
  }

  return { modifiedFiles, untrackedFiles };
}

export async function generateExecutionPlan(
  goal: string,
  sessionId?: string
): Promise<ExecutionPlan> {
  logActivity("planning", "Generating execution plan");
  if (sessionId) {
    addReplayEvent(sessionId, {
      timestamp: Date.now(),
      type: "planner_generation",
      message: "Generating execution plan",
      metadata: { goal },
    });
  }
  updateInspectorData(
    {
      executionTrace: ["[planning] Generating execution plan"],
    },
    true
  );
  const status = await getStatus(sessionId);
  const diff = await getDiff(sessionId);
  const { modifiedFiles, untrackedFiles } = parseStatusFiles(status.stdout);
  const repositoryState = [
    "Modified Files:",
    modifiedFiles.length ? modifiedFiles.map((f) => `- ${f}`).join("\n") : "- None",
    "",
    "Untracked Files:",
    untrackedFiles.length ? untrackedFiles.map((f) => `- ${f}`).join("\n") : "- None",
    "",
    "Diff Summary:",
    diff.stdout.trim() || "No diff summary available.",
  ].join("\n");

  let responseText: string;
  try {
    const response = await Promise.race([
      runPlanningTask(buildPlannerPrompt(goal, repositoryState), sessionId),
      new Promise<{ text: string }>((_, reject) => {
        setTimeout(
          () => reject(new Error("Planning model timed out.")),
          DEFAULT_PLANNER_TIMEOUT_MS
        );
      }),
    ]);
    responseText = response.text;
  } catch {
    responseText = JSON.stringify({
      steps: [
        { description: "Set up project scaffold and dependencies" },
        { description: "Implement core API endpoint" },
        { description: "Add run and verification commands" },
        { description: "Document usage and next improvements" },
      ],
    });
  }

  let steps: PlanStep[];
  try {
    steps = parsePlanSteps(responseText);
  } catch {
    steps = [
      {
        id: 1,
        description: "Clarify requirements and choose API framework",
        status: "pending",
      },
      {
        id: 2,
        description: "Create server with one endpoint and response payload",
        status: "pending",
      },
      {
        id: 3,
        description: "Run and verify endpoint behavior locally",
        status: "pending",
      },
    ];
  }

  updateInspectorData(
    {
      goal,
      plan: steps.map((step) => step.description),
      repoModifiedFiles: modifiedFiles,
      repoUntrackedFiles: untrackedFiles,
    },
    true
  );

  return {
    goal,
    steps,
  };
}
