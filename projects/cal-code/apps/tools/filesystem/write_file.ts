import fs from "fs/promises";

export async function write_file({
  path,
  content,
}: {
  path: string;
  content: string;
}) {
  await fs.writeFile(path, content);
  return { success: true };
}
