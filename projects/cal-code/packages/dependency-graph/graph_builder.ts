import { promises as fs } from "node:fs";
import path from "node:path";
import { scanProject } from "../context-engine/scanner/project_scanner";
import { indexProjectSymbols } from "../code-intelligence/symbol_store";
import { DependencyEdge } from "./graph_types";

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const IMPORT_REGEX = /import[\s\S]*?from\s+["']([^"']+)["']/g;

function withCodeExtension(candidate: string): string[] {
  const withExt = CODE_EXTENSIONS.map((ext) => `${candidate}${ext}`);
  return [...withExt, path.join(candidate, "index.ts"), path.join(candidate, "index.js")];
}

function resolveImportTarget(fromFile: string, rawImport: string): string | null {
  if (!rawImport.startsWith(".")) {
    return null;
  }

  const baseDir = path.dirname(fromFile);
  const normalized = path.normalize(path.join(baseDir, rawImport));
  return normalized.split(path.sep).join("/");
}

export async function buildGraphEdges(rootPath: string): Promise<DependencyEdge[]> {
  // Ensure symbol index is warm before dependency extraction.
  await indexProjectSymbols(rootPath);

  const files = await scanProject(rootPath);
  const fileSet = new Set(files.map((file) => file.path.split(path.sep).join("/")));
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    const ext = path.extname(file.path);
    if (!CODE_EXTENSIONS.includes(ext)) {
      continue;
    }

    const normalizedFrom = file.path.split(path.sep).join("/");
    const absolutePath = path.join(rootPath, file.path);
    let content = "";
    try {
      content = await fs.readFile(absolutePath, "utf-8");
    } catch {
      continue;
    }

    for (const match of content.matchAll(IMPORT_REGEX)) {
      const rawImport = match[1];
      const resolvedBase = resolveImportTarget(normalizedFrom, rawImport);
      if (!resolvedBase) {
        continue;
      }

      const candidates = withCodeExtension(resolvedBase);
      const target = candidates.find((candidate) => fileSet.has(candidate)) ?? resolvedBase;
      if (!fileSet.has(target)) {
        continue;
      }

      edges.push({
        fromFile: normalizedFrom,
        toFile: target,
        type: "import",
      });
    }
  }

  return edges;
}
