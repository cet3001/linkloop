export interface TerminalCommand {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
