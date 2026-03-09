import { CodePatch } from "../agents/code_editor/edit_types";
import { PatchValidationResult } from "./patch_guard_types";

function extractHeadings(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#{1,6}\s+/.test(line));
}

function extractImports(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("import "));
}

function extractFunctionNames(content: string): string[] {
  const names = new Set<string>();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    /\bexport\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const name = match[1];
      if (name) {
        names.add(name);
      }
    }
  }

  return [...names];
}

export function validatePatch(
  fileContent: string,
  patch: CodePatch
): PatchValidationResult {
  if (patch.operation === "replace") {
    if (!patch.target || !fileContent.includes(patch.target)) {
      return { allowed: false, reason: "Patch target not found in file." };
    }
  }

  if (patch.content.trim() && fileContent.includes(patch.content)) {
    return { allowed: false, reason: "Patch content already exists in file." };
  }

  const existingHeadings = new Set(extractHeadings(fileContent));
  for (const heading of extractHeadings(patch.content)) {
    if (existingHeadings.has(heading)) {
      return {
        allowed: false,
        reason: `Duplicate heading detected: ${heading}`,
      };
    }
  }

  const existingImports = new Set(extractImports(fileContent));
  for (const importLine of extractImports(patch.content)) {
    if (existingImports.has(importLine)) {
      return {
        allowed: false,
        reason: `Duplicate import detected: ${importLine}`,
      };
    }
  }

  const existingFunctions = new Set(extractFunctionNames(fileContent));
  for (const fnName of extractFunctionNames(patch.content)) {
    if (existingFunctions.has(fnName)) {
      return {
        allowed: false,
        reason: `Duplicate function definition detected: ${fnName}`,
      };
    }
  }

  return { allowed: true };
}
