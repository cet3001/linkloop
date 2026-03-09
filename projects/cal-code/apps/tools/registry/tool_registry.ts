import { read_file } from "../filesystem/read_file";
import { write_file } from "../filesystem/write_file";
import { create_file } from "../filesystem/create_file";
import { list_directory } from "../filesystem/list_directory";
import {
  commitChanges,
  createBranch,
  getDiff,
  getStatus,
} from "../git/git_executor";
import { runTerminalCommand } from "../terminal/terminal_executor";

export const TOOL_REGISTRY = {
  read_file,
  write_file,
  create_file,
  list_directory,
  git_create_branch: ({ name }: { name: string }) => createBranch(name),
  git_status: () => getStatus(),
  git_diff: () => getDiff(),
  git_commit: ({ message }: { message: string }) => commitChanges(message),
  run_terminal: runTerminalCommand,
};
