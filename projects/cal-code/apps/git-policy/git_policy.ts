import { GitPolicyOperation, GitPolicyValidationResult } from "./policy_types";

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

export function validateGitOperation(
  operation: GitPolicyOperation
): GitPolicyValidationResult {
  const command = normalize(operation.command);
  const branch = normalize(operation.currentBranch ?? "");

  if (command.startsWith("commit") && (branch === "main" || branch === "master")) {
    return {
      allowed: false,
      blocked: true,
      reason: `Attempted commit to protected branch "${branch}" blocked.`,
    };
  }

  if (
    command.startsWith("push") &&
    (command.includes("--force") || command.includes(" -f"))
  ) {
    return {
      allowed: false,
      blocked: true,
      reason: "Attempted force push blocked by git safety policy.",
    };
  }

  if (
    command.startsWith("branch") &&
    /\s-(d|D)(\s|$)/.test(command)
  ) {
    return {
      allowed: false,
      blocked: true,
      reason: "Attempted branch deletion blocked by git safety policy.",
    };
  }

  return { allowed: true, blocked: false };
}
