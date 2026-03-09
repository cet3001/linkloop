import path from "node:path";
import { readFile } from "../readers/file_reader";
import { scanProject } from "../scanner/project_scanner";
import { FileContext, ProjectContext } from "../types/context_types";

export async function buildFileContext(filePath: string): Promise<FileContext> {
  const content = await readFile(filePath);
  return {
    path: filePath,
    content,
  };
}

export async function buildProjectContext(
  rootPath: string
): Promise<ProjectContext> {
  const files = await scanProject(rootPath);
  return {
    files: files.map((file) => ({
      ...file,
      path: file.path.split(path.sep).join("/"),
    })),
  };
}
