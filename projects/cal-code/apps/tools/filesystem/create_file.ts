import fs from "fs/promises";

export async function create_file({
  path,
  content,
}: {
  path: string;
  content: string;
}) {
  await fs.writeFile(path, content, { flag: "wx" }).catch(async () => {
    await fs.writeFile(path, content);
  });

  return { success: true };
}
