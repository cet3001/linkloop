export interface ParsedToolCall {
  tool: string;
  input: Record<string, unknown>;
}

function isToolCallShape(value: unknown): value is ParsedToolCall {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { tool?: unknown; input?: unknown };
  return (
    typeof candidate.tool === "string" &&
    !!candidate.input &&
    typeof candidate.input === "object" &&
    !Array.isArray(candidate.input)
  );
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseToolCall(output: string | unknown): ParsedToolCall | null {
  if (isToolCallShape(output)) {
    return output;
  }

  if (typeof output !== "string") {
    return null;
  }

  const direct = tryParseJson(output.trim());
  if (isToolCallShape(direct)) {
    return direct;
  }

  const fencedMatch = output.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    const fenced = tryParseJson(fencedMatch[1]);
    if (isToolCallShape(fenced)) {
      return fenced;
    }
  }

  const objectMatch = output.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const embedded = tryParseJson(objectMatch[0]);
    if (isToolCallShape(embedded)) {
      return embedded;
    }
  }

  return null;
}
