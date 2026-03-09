import { promises as fs } from "node:fs";

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}
