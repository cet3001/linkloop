import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  clearActivity,
  getActivityEvents,
} from "../../../../activity/activity_logger";
import { subscribeToActivity } from "../../../../activity/activity_stream";
import { ActivityEvent, ActivityType } from "../../../../activity/activity_types";
import { theme } from "../design/theme";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

interface ProjectContextShape {
  files: Array<{ path: string }>;
}

interface ToolRuntimeModule {
  runToolAwareConversation: (prompt: string) => Promise<string>;
}

interface ContextBuilderModule {
  buildProjectContext: (rootPath: string) => Promise<ProjectContextShape>;
}

function buildMessage(role: Role, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  useEffect(() => {
    setActivityEvents(getActivityEvents().sort((a, b) => a.timestamp - b.timestamp));
    const unsubscribe = subscribeToActivity((event) => {
      setActivityEvents((prev) =>
        [...prev, event].sort((a, b) => a.timestamp - b.timestamp)
      );
    });
    return unsubscribe;
  }, []);

  function getActivityIcon(type: ActivityType): string {
    switch (type) {
      case "thinking":
        return "🧠";
      case "planning":
        return "🧩";
      case "searching":
        return "🔎";
      case "tool_execution":
        return "🛠";
      case "code_edit":
        return "✏️";
      case "verification":
        return "✅";
      default:
        return "•";
    }
  }

  async function buildContextPrompt(userPrompt: string): Promise<string> {
    const runtime = globalThis as unknown as {
      process?: { cwd?: () => string };
    };

    const rootPath =
      typeof runtime.process?.cwd === "function" ? runtime.process.cwd() : ".";

    try {
      const contextModulePath =
        "../../../../../packages/context-engine/context/context_builder";
      const { buildProjectContext } = (await import(
        /* @vite-ignore */ contextModulePath
      )) as ContextBuilderModule;
      const projectContext = await buildProjectContext(rootPath);
      const firstFiles = projectContext.files
        .slice(0, 20)
        .map((file) => `- ${file.path}`)
        .join("\n");

      return [
        "User Prompt:",
        userPrompt,
        "",
        "Project Files:",
        firstFiles || "- (no files found)",
      ].join("\n");
    } catch {
      return [
        "User Prompt:",
        userPrompt,
        "",
        "Project Files:",
        "- (context unavailable)",
      ].join("\n");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isSending) {
      return;
    }

    const userMessage = buildMessage("user", prompt);
    clearActivity();
    setActivityEvents([]);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const contextPrompt = await buildContextPrompt(prompt);
      const toolRuntimeModulePath = "../../../../ai-core/runtime/tool_runtime";
      const { runToolAwareConversation } = (await import(
        /* @vite-ignore */ toolRuntimeModulePath
      )) as ToolRuntimeModule;
      const responseText = await runToolAwareConversation(contextPrompt);
      const assistantMessage = buildMessage("assistant", responseText);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const assistantMessage = buildMessage(
        "assistant",
        `Failed to reach local Ollama runtime: ${message}`
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
      clearActivity();
      setActivityEvents([]);
    }
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col border-l"
      style={{
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
      }}
    >
      <div
        className="border-b text-sm font-semibold"
        style={{
          borderColor: theme.colors.border,
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
        }}
      >
        AI Chat
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: theme.spacing.md,
          display: "grid",
          gap: theme.spacing.sm,
          alignContent: "start",
        }}
      >
        {messages.length === 0 ? (
          <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Start a conversation with your local model.
          </p>
        ) : null}
        {isSending && activityEvents.length > 0 ? (
          <div
            className="border text-sm"
            style={{
              borderRadius: theme.spacing.bubbleRadius,
              padding: theme.spacing.sm,
              borderColor: theme.colors.border,
              backgroundColor: `${theme.colors.panel}dd`,
            }}
          >
            <div
              className="mb-2 text-xs uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              AI Activity
            </div>
            <div className="grid gap-1">
              {activityEvents.map((event) => (
                <div key={`${event.timestamp}-${event.message}`}>
                  {getActivityIcon(event.type)} {event.message}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            className="border text-sm"
            key={message.id}
            style={{
              borderRadius: theme.spacing.bubbleRadius,
              padding: theme.spacing.sm,
              borderColor:
                message.role === "user"
                  ? `${theme.colors.accentSoft}66`
                  : theme.colors.border,
              backgroundColor:
                message.role === "user"
                  ? `${theme.colors.accentSoft}1a`
                  : theme.colors.panel,
            }}
          >
            <div
              className="mb-1 text-xs uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              {message.role}
            </div>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>

      <form
        className="border-t"
        onSubmit={onSubmit}
        style={{ borderColor: theme.colors.border, padding: theme.spacing.sm }}
      >
        <textarea
          className="h-24 w-full resize-none border text-sm outline-none"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Cal Code..."
          value={input}
          style={{
            marginBottom: theme.spacing.xs,
            borderRadius: theme.spacing.panelRadius,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            color: theme.colors.textPrimary,
            padding: theme.spacing.sm,
          }}
        />
        <button
          className="w-full rounded px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSend}
          type="submit"
          style={{
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.spacing.bubbleRadius,
          }}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
