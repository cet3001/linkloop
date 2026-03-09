export interface GitPolicyOperation {
  command: string;
  currentBranch?: string;
}

export interface GitPolicyValidationResult {
  allowed: boolean;
  blocked: boolean;
  reason?: string;
}
