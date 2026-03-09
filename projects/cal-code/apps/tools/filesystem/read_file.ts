import fs from "fs/promises";

export async function read_file({ path }: { path: string }) {
  const content = await fs.readFile(path, "utf-8");
  return content;
}
