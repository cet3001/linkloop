import { promises as fs } from "node:fs";
import path from "node:path";
import { scanProject } from "../context-engine/scanner/project_scanner";
import { CodeSymbol } from "./symbol_types";

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const NON_METHOD_NAMES = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "constructor",
]);

function parseFileSymbols(filePath: string, content: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;

    const functionMatch = line.match(
      /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/
    );
    if (functionMatch) {
      symbols.push({
        name: functionMatch[1],
        type: "function",
        file: filePath,
        line: lineNumber,
      });
    }

    const classMatch = line.match(/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1],
        type: "class",
        file: filePath,
        line: lineNumber,
      });
    }

    const variableMatch = line.match(
      /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/
    );
    if (variableMatch) {
      symbols.push({
        name: variableMatch[1],
        type: "variable",
        file: filePath,
        line: lineNumber,
      });
    }

    const importMatch = line.match(/^\s*import\s+(.+?)\s+from\s+["'][^"']+["']/);
    if (importMatch) {
      symbols.push({
        name: importMatch[1].trim(),
        type: "import",
        file: filePath,
        line: lineNumber,
      });
    }

    const exportNamed = line.match(/^\s*export\s+\{([^}]+)\}/);
    if (exportNamed) {
      exportNamed[1]
        .split(",")
        .map((token) => token.trim().split(/\s+as\s+/)[0])
        .filter(Boolean)
        .forEach((name) => {
          symbols.push({
            name,
            type: "export",
            file: filePath,
            line: lineNumber,
          });
        });
    } else {
      const exportDirect = line.match(
        /^\s*export\s+(?:default\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/
      );
      if (exportDirect) {
        symbols.push({
          name: exportDirect[1],
          type: "export",
          file: filePath,
          line: lineNumber,
        });
      }
    }

    const methodMatch = line.match(
      /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*\{/
    );
    if (methodMatch && !NON_METHOD_NAMES.has(methodMatch[1])) {
      symbols.push({
        name: methodMatch[1],
        type: "method",
        file: filePath,
        line: lineNumber,
      });
    }
  });

  return symbols;
}

export async function extractProjectSymbols(rootPath: string): Promise<CodeSymbol[]> {
  const files = await scanProject(rootPath);
  const symbols: CodeSymbol[] = [];

  for (const file of files) {
    const ext = path.extname(file.path);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    const absolutePath = path.join(rootPath, file.path);
    try {
      const content = await fs.readFile(absolutePath, "utf-8");
      symbols.push(...parseFileSymbols(file.path, content));
    } catch {
      // Ignore files that fail to read.
    }
  }

  return symbols;
}
