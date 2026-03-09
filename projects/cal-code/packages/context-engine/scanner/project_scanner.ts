import { promises as fs } from "node:fs";
import path from "node:path";
import { ProjectFile } from "../types/context_types";

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build"]);

export async function scanProject(rootPath: string): Promise<ProjectFile[]> {
  const discovered: ProjectFile[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      discovered.push({
        path: path.relative(rootPath, absolutePath),
        name: entry.name,
      });
    }
  }

  await walk(rootPath);
  return discovered.sort((a, b) => a.path.localeCompare(b.path));
}
