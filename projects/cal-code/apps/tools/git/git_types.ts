export interface GitCommand {
  command: string;
}

export interface GitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
