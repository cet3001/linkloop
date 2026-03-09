import { CodePatch } from "./edit_types";

function isCodePatch(value: unknown): value is CodePatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    file?: unknown;
    operation?: unknown;
    target?: unknown;
    content?: unknown;
  };

  const validOperation =
    candidate.operation === "replace" || candidate.operation === "append";

  const validTarget =
    candidate.target === undefined || typeof candidate.target === "string";

  return (
    typeof candidate.file === "string" &&
    validOperation &&
    validTarget &&
    typeof candidate.content === "string"
  );
}

function safeJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseCodePatch(response: string | unknown): CodePatch | null {
  if (isCodePatch(response)) {
    return response;
  }

  if (typeof response !== "string") {
    return null;
  }

  const direct = safeJsonParse(response.trim());
  if (isCodePatch(direct)) {
    return direct;
  }

  const fenced = response.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    const parsed = safeJsonParse(fenced[1]);
    if (isCodePatch(parsed)) {
      return parsed;
    }
  }

  const objectLike = response.match(/\{[\s\S]*\}/);
  if (objectLike) {
    const parsed = safeJsonParse(objectLike[0]);
    if (isCodePatch(parsed)) {
      return parsed;
    }
  }

  return null;
}
