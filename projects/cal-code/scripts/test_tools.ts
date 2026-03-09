import { list_directory } from "../apps/tools/filesystem/list_directory";
import { read_file } from "../apps/tools/filesystem/read_file";

async function test() {
  const files = await list_directory({ path: "." });
  console.log("FILES:", files.slice(0, 10));

  const file = await read_file({ path: "README.md" });
  console.log("README snippet:", file.substring(0, 200));
}

test();
