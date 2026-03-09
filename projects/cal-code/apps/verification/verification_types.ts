export interface VerificationConfig {
  commands: string[];
}

export interface VerificationResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}
