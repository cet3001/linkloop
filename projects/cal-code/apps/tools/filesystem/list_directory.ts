import fs from "fs/promises";

export async function list_directory({ path }: { path: string }) {
  const files = await fs.readdir(path);
  return files;
}
