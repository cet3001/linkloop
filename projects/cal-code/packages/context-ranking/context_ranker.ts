import path from "node:path";
import { getMemory } from "../../apps/memory/memory_store";
import { searchRelevantFiles } from "../../apps/vector-memory/vector_search";
import { indexProjectSymbols, getSymbols } from "../code-intelligence/symbol_store";
import { searchSymbols } from "../code-intelligence/symbol_search";
import { buildProjectContext } from "../context-engine/context/context_builder";
import { readFile } from "../context-engine/readers/file_reader";
import {
  buildDependencyGraph,
  getDependencies,
  getDependents,
} from "../dependency-graph/graph_store";
import { getOpenFileContext } from "../open-file-context/open_file_store";
import { RankedContext } from "./ranking_types";

const WEIGHTS = {
  openFiles: 1.0,
  vector: 0.9,
  symbol: 0.8,
  dependency: 0.75,
  memory: 0.6,
  project: 0.3,
} as const;

const MAX_VECTOR_RESULTS = 5;
const MAX_SYMBOL_RESULTS = 5;
const MAX_MEMORY_MESSAGES = 6;
const MAX_PROJECT_FILES = 20;
const MAX_CONTEXT_ITEMS = 10;
let dependencyGraphReady = false;

function getActiveFileSnippet(content: string, cursorLine: number): string {
  const lines = content.split(/\r?\n/);
  const start = Math.max(1, cursorLine - 10);
  const end = Math.min(lines.length, cursorLine + 10);
  const snippet = lines
    .slice(start - 1, end)
    .map((line, index) => `${start + index}: ${line}`)
    .join("\n");

  return `Lines ${start}-${end}\n${snippet}`;
}

export async function rankContext(query: string): Promise<RankedContext[]> {
  const ranked: RankedContext[] = [];

  try {
    const openFileContext = getOpenFileContext();
    if (openFileContext.activeFile) {
      const activePath = path.join(process.cwd(), openFileContext.activeFile);
      const content = await readFile(activePath);
      ranked.push({
        source: "open_file_context",
        score: WEIGHTS.openFiles,
        content: [
          "Active File Context",
          `${openFileContext.activeFile}`,
          getActiveFileSnippet(content, openFileContext.cursorLine),
          "",
          "Open Files:",
          openFileContext.openFiles.map((file) => `- ${file}`).join("\n") ||
            "- None",
        ].join("\n"),
      });
    } else {
      ranked.push({
        source: "open_file_context",
        score: WEIGHTS.openFiles * 0.4,
        content: "No active file context available.",
      });
    }
  } catch {
    ranked.push({
      source: "open_file_context",
      score: WEIGHTS.openFiles * 0.4,
      content: "Open file context unavailable.",
    });
  }

  try {
    const openFileContext = getOpenFileContext();
    if (!dependencyGraphReady) {
      await buildDependencyGraph(process.cwd());
      dependencyGraphReady = true;
    }

    if (openFileContext.activeFile) {
      const deps = getDependencies(openFileContext.activeFile).slice(0, 8);
      const revDeps = getDependents(openFileContext.activeFile).slice(0, 8);
      ranked.push({
        source: "dependency_graph",
        score: WEIGHTS.dependency,
        content: [
          "File Dependencies:",
          openFileContext.activeFile,
          `imports -> ${deps.length ? deps.join(", ") : "None"}`,
          `imported by -> ${revDeps.length ? revDeps.join(", ") : "None"}`,
        ].join("\n"),
      });
    } else {
      ranked.push({
        source: "dependency_graph",
        score: WEIGHTS.dependency * 0.5,
        content: "Dependency graph available, but no active file selected.",
      });
    }
  } catch {
    ranked.push({
      source: "dependency_graph",
      score: WEIGHTS.dependency * 0.5,
      content: "Dependency graph unavailable.",
    });
  }

  try {
    const vectorResults = await searchRelevantFiles(query);
    vectorResults.slice(0, MAX_VECTOR_RESULTS).forEach((result, index) => {
      ranked.push({
        source: "vector",
        score: WEIGHTS.vector - index * 0.05,
        content: `File: ${result.path}\nSnippet:\n${result.content.slice(0, 500)}`,
      });
    });
  } catch {
    ranked.push({
      source: "vector",
      score: WEIGHTS.vector * 0.5,
      content: "Vector search unavailable.",
    });
  }

  try {
    if (getSymbols().length === 0) {
      await indexProjectSymbols(process.cwd());
    }
    const symbolResults = searchSymbols(query).slice(0, MAX_SYMBOL_RESULTS);
    if (symbolResults.length === 0) {
      ranked.push({
        source: "symbol_index",
        score: WEIGHTS.symbol * 0.5,
        content: "No direct symbol matches found for query.",
      });
    } else {
      symbolResults.forEach((symbol, index) => {
        ranked.push({
          source: "symbol_index",
          score: WEIGHTS.symbol - index * 0.04,
          content: `${symbol.type} ${symbol.name} (${symbol.file}:${symbol.line})`,
        });
      });
    }
  } catch {
    ranked.push({
      source: "symbol_index",
      score: WEIGHTS.symbol * 0.5,
      content: "Symbol index unavailable.",
    });
  }

  const memory = getMemory();
  const recentMessages = memory.slice(-MAX_MEMORY_MESSAGES);
  recentMessages.forEach((message, index) => {
    ranked.push({
      source: "memory",
      score: WEIGHTS.memory - index * 0.03,
      content: `[${message.role}] ${message.content}`,
    });
  });

  try {
    const projectContext = await buildProjectContext(process.cwd());
    const fileList = projectContext.files
      .slice(0, MAX_PROJECT_FILES)
      .map((file) => `- ${file.path}`)
      .join("\n");

    ranked.push({
      source: "project_structure",
      score: WEIGHTS.project,
      content: `Project Files:\n${fileList || "- (no files found)"}`,
    });
  } catch {
    ranked.push({
      source: "project_structure",
      score: WEIGHTS.project * 0.5,
      content: "Project structure unavailable.",
    });
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, MAX_CONTEXT_ITEMS);
}

export async function buildRankedContext(query: string): Promise<string> {
  const ranked = await rankContext(query);
  const blocks = ranked.map(
    (item, index) =>
      `#${index + 1} [${item.source}] (score: ${item.score.toFixed(2)})\n${item.content}`
  );

  return [
    "Ranked Context:",
    ...blocks,
    "",
    "Use the above context blocks when responding to the query.",
  ].join("\n\n");
}
