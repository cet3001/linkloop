import { executeTool } from "../../tools/executor/tool_executor";
import { parseToolCall } from "../../tools/executor/tool_parser";
import { addMessage, getMemory } from "../../memory/memory_store";
import { Message } from "../../memory/memory_types";
import { logActivity } from "../../activity/activity_logger";
import { buildRankedContext } from "../../../packages/context-ranking/context_ranker";
import { runAnalysisStream } from "./ai_runtime";
import { publishModelStream } from "./model_stream";

function buildInitialPrompt(prompt: string, history: Message[]): string {
  const formattedHistory =
    history.length === 0
      ? "No previous conversation history."
      : history
          .map((message) => `[${message.role}] ${message.content}`)
          .join("\n");

  return `
You are a local AI assistant with access to filesystem tools.
If you need to use a tool, respond with ONLY valid JSON in this shape:
{
  "tool": "<tool_name>",
  "input": { ... }
}

Available tools:
- read_file { "path": "..." }
- write_file { "path": "...", "content": "..." }
- create_file { "path": "...", "content": "..." }
- list_directory { "path": "..." }

If no tool is needed, answer normally.

Conversation history:
${formattedHistory}

User request:
${prompt}
`.trim();
}

async function buildEnrichedPrompt(
  prompt: string,
  history: Message[]
): Promise<string> {
  let rankedContext: string;
  try {
    rankedContext = await buildRankedContext(prompt);
  } catch {
    rankedContext = "Ranked context unavailable for this request.";
  }

  const runtimePrompt = buildInitialPrompt(prompt, history);
  return `
User Query:
${runtimePrompt}

Relevant Project Context:

${rankedContext}

Respond using the context above.
When possible, reference specific file paths from the provided context.
If present, explain the relationship between ai runtime, Ollama client, and model router files.
`.trim();
}

export async function runToolAwareConversation(
  prompt: string,
  sessionId?: string
): Promise<string> {
  const modelSessionId = sessionId ?? `runtime-${Date.now()}`;
  let firstTokenReceived = false;
  const forwardToken = (token: string) => {
    publishModelStream({
      type: "model_stream",
      sessionId: modelSessionId,
      token,
    });
    if (!firstTokenReceived) {
      firstTokenReceived = true;
      logActivity("thinking", "First token received");
    }
  };
  logActivity("thinking", "Understanding request");
  addMessage({
    role: "user",
    content: prompt,
    timestamp: Date.now(),
  });

  const history = getMemory();
  logActivity("searching", "Gathering ranked context");
  const firstEnrichedPrompt = await buildEnrichedPrompt(prompt, history);
  const firstPassTokens: string[] = [];
  const firstResponse = await runAnalysisStream(
    firstEnrichedPrompt,
    (token) => {
      firstPassTokens.push(token);
    },
    modelSessionId
  );
  const toolCall = parseToolCall(firstResponse.text);

  if (!toolCall) {
    if (firstPassTokens.length > 0) {
      for (const token of firstPassTokens) {
        forwardToken(token);
      }
    } else if (firstResponse.text) {
      forwardToken(firstResponse.text);
    }
    logActivity("verification", "Response generated without tool call");
    logActivity("verification", "Stream completed");
    addMessage({
      role: "assistant",
      content: firstResponse.text,
      timestamp: Date.now(),
    });
    return firstResponse.text;
  }

  const toolResult = await executeTool(toolCall.tool, toolCall.input, sessionId);
  addMessage({
    role: "tool",
    content: `${toolCall.tool}: ${JSON.stringify(toolResult)}`,
    timestamp: Date.now(),
  });

  const followUpPrompt = `
User request:
${prompt}

Tool used:
${toolCall.tool}

Tool result:
${JSON.stringify(toolResult)}

Now respond to the user using this information. Do not return tool-call JSON.
`.trim();

  const followUpEnrichedPrompt = await buildEnrichedPrompt(followUpPrompt, getMemory());
  const finalResponse = await runAnalysisStream(
    followUpEnrichedPrompt,
    forwardToken,
    modelSessionId
  );
  logActivity("verification", "Tool-assisted response generated");
  logActivity("verification", "Stream completed");
  addMessage({
    role: "assistant",
    content: finalResponse.text,
    timestamp: Date.now(),
  });

  return finalResponse.text;
}
