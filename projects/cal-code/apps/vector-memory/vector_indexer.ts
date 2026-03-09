import path from "node:path";
import { buildProjectContext } from "../../packages/context-engine/context/context_builder";
import { readFile } from "../../packages/context-engine/readers/file_reader";
import { upsertDocuments } from "./vector_store";
import { VectorDocument } from "./vector_types";

const MAX_FILE_CHARS = 8000;

export async function indexProjectFiles(rootPath: string): Promise<number> {
  const projectContext = await buildProjectContext(rootPath);

  const documents: VectorDocument[] = [];
  for (const file of projectContext.files) {
    const absolutePath = path.join(rootPath, file.path);
    try {
      const rawContent = await readFile(absolutePath);
      const content = rawContent.slice(0, MAX_FILE_CHARS);

      if (!content.trim()) {
        continue;
      }

      documents.push({
        id: file.path,
        path: file.path,
        content,
      });
    } catch {
      // Skip unreadable/binary files during indexing.
    }
  }

  await upsertDocuments(documents);
  return documents.length;
}
