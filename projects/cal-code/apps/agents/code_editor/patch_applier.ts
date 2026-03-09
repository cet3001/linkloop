import path from "node:path";
import { read_file } from "../../tools/filesystem/read_file";
import { write_file } from "../../tools/filesystem/write_file";
import { CodePatch } from "./edit_types";

function toAbsolutePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(process.cwd(), filePath);
}

export async function applyPatch(patch: CodePatch): Promise<{ success: true }> {
  const absolutePath = toAbsolutePath(patch.file);
  const original = await read_file({ path: absolutePath });

  let updated = original;
  if (patch.operation === "append") {
    const separator = original.endsWith("\n") ? "" : "\n";
    updated = `${original}${separator}${patch.content}`;
  } else {
    if (!patch.target) {
      throw new Error("Replace operation requires a target string.");
    }
    if (!original.includes(patch.target)) {
      throw new Error(`Target not found in file: ${patch.target}`);
    }
    updated = original.replace(patch.target, patch.content);
  }

  await write_file({ path: absolutePath, content: updated });
  return { success: true };
}
