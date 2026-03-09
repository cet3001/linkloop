import { useEffect } from "react";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor, languages as MonacoLanguages } from "monaco-editor";
import {
  setActiveFile,
  setCursorPosition,
  setOpenFiles,
} from "../../../../../packages/open-file-context/open_file_store";
import { logActivity } from "../../../../activity/activity_logger";
import { theme } from "../design/theme";

const defaultCode = `function helloCalCode() {
  console.log("Cal Code desktop shell is ready.");
}

helloCalCode();
`;

interface RuntimeModule {
  runCodingTask: (prompt: string) => Promise<{ text: string }>;
}

interface DependencyGraphModule {
  buildDependencyGraph: (rootPath: string) => Promise<number>;
  getDependencies: (file: string) => string[];
}

function shouldTriggerSuggestion(
  lineText: string,
  previousLine: string,
  prefixContent: string
): boolean {
  const trimmed = lineText.trim();
  const prevTrimmed = previousLine.trim();
  if (prevTrimmed.length === 0) {
    return true;
  }
  if (/todo/i.test(lineText)) {
    return true;
  }
  if (
    prefixContent.includes("function ") ||
    prefixContent.includes("=> {") ||
    prefixContent.includes("class ")
  ) {
    return true;
  }
  if (trimmed === "") {
    return true;
  }
  return false;
}

function buildEditorSnippet(
  model: MonacoEditor.ITextModel,
  position: { lineNumber: number }
): string {
  const startLine = Math.max(1, position.lineNumber - 20);
  const endLine = Math.min(model.getLineCount(), position.lineNumber + 20);
  const lines: string[] = [];
  for (let line = startLine; line <= endLine; line += 1) {
    lines.push(`${line}: ${model.getLineContent(line)}`);
  }
  return lines.join("\n");
}

function extractSuggestion(response: string): string {
  const cleaned = response.trim();
  if (!cleaned) {
    return "";
  }
  const lines = cleaned.split(/\r?\n/);
  return lines.slice(0, 8).join("\n");
}

export function EditorPanel() {
  useEffect(() => {
    const defaultOpenFiles = [
      "apps/ai-core/runtime/ai_runtime.ts",
      "apps/ai-core/runtime/tool_runtime.ts",
      "README.md",
    ];
    setOpenFiles(defaultOpenFiles);
    setActiveFile(defaultOpenFiles[0]);
    setCursorPosition(1);
  }, []);

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
        padding: theme.spacing.layout.shellPadding,
      }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden border"
        style={{
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.spacing.panelRadius,
        }}
      >
        <div
          className="flex items-center justify-between border-b text-sm"
          style={{
            borderColor: theme.colors.border,
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.colors.success }}
            />
            <span style={{ color: theme.colors.textPrimary }}>main.tsx</span>
          </div>
          <span style={{ color: theme.colors.textSecondary }}>TypeScript</span>
        </div>
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            defaultValue={defaultCode}
            theme="vs-dark"
            onMount={(editor) => {
              setCursorPosition(editor.getPosition()?.lineNumber ?? 1);
              const disposable = editor.onDidChangeCursorPosition((event) => {
                setCursorPosition(event.position.lineNumber);
              });
              editor.onDidDispose(() => {
                disposable.dispose();
              });
            }}
            beforeMount={(monaco) => {
              let graphReady = false;
              monaco.languages.registerInlineCompletionsProvider("typescript", {
                provideInlineCompletions: async (
                  model: MonacoEditor.ITextModel,
                  position: { lineNumber: number; column: number },
                  _context: unknown,
                  token: { isCancellationRequested: boolean }
                ) => {
                  const lineText = model.getLineContent(position.lineNumber);
                  const previousLine =
                    position.lineNumber > 1
                      ? model.getLineContent(position.lineNumber - 1)
                      : "";
                  const prefix = model.getValueInRange(
                    new monaco.Range(1, 1, position.lineNumber, position.column)
                  );

                  if (!shouldTriggerSuggestion(lineText, previousLine, prefix)) {
                    return { items: [] };
                  }

                  logActivity("thinking", "Preparing inline AI suggestion");
                  let dependencyContext = "Dependency context unavailable.";
                  try {
                    logActivity("searching", "Collecting dependency context");
                    const graphModulePath =
                      "../../../../../packages/dependency-graph/graph_store";
                    const dependencyModule = (await import(
                      /* @vite-ignore */ graphModulePath
                    )) as DependencyGraphModule;
                    if (!graphReady) {
                      await dependencyModule.buildDependencyGraph(".");
                      graphReady = true;
                    }
                    const deps = dependencyModule.getDependencies(
                      "apps/ai-core/runtime/ai_runtime.ts"
                    );
                    dependencyContext = `Dependencies: ${
                      deps.length ? deps.join(", ") : "None"
                    }`;
                  } catch {
                    dependencyContext = "Dependency context unavailable.";
                  }

                  const snippet = buildEditorSnippet(model, position);
                  const prompt = [
                    "Continue or improve the following code.",
                    "",
                    "Current file snippet:",
                    snippet,
                    "",
                    `Cursor line: ${position.lineNumber}`,
                    dependencyContext,
                    "",
                    "Return only the code continuation text.",
                  ].join("\n");

                  try {
                    const runtimeModulePath = "../../../../ai-core/runtime/ai_runtime";
                    const { runCodingTask } = (await import(
                      /* @vite-ignore */ runtimeModulePath
                    )) as RuntimeModule;
                    const result = await runCodingTask(prompt);
                    if (token.isCancellationRequested) {
                      return { items: [] };
                    }
                    const suggestion = extractSuggestion(result.text);
                    if (!suggestion) {
                      return { items: [] };
                    }
                    logActivity("verification", "Inline suggestion generated");
                    return {
                      items: [
                        {
                          insertText: suggestion,
                          range: new monaco.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            position.column
                          ),
                        },
                      ],
                    };
                  } catch {
                    return { items: [] };
                  }
                },
                freeInlineCompletions: () => {},
              });
            }}
            onChange={(_, event) => {
              const line = event?.changes?.[0]?.range.endLineNumber ?? 1;
              setCursorPosition(line);
            }}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: theme.typography.editorFontFamily,
              scrollBeyondLastLine: false,
              inlineSuggest: { enabled: true },
            }}
          />
        </div>
      </div>
      <div
        className="h-28 border"
        style={{
          marginTop: theme.spacing.sm,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.spacing.panelRadius,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        }}
      >
        <div
          className="mb-2 text-xs uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Terminal (Placeholder)
        </div>
        <div
          className="h-[70px] rounded border text-xs"
          style={{
            borderColor: theme.colors.border,
            backgroundColor: `${theme.colors.background}cc`,
            color: theme.colors.textSecondary,
            padding: theme.spacing.sm,
            fontFamily: theme.typography.editorFontFamily,
          }}
        >
          Local terminal integration will appear here.
        </div>
      </div>
    </section>
  );
}
