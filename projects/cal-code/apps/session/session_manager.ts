import {
  clearSession,
  completeSession,
  createSession,
  failSession,
  getSession,
  setSessionTotalSteps,
  updateSession,
} from "./session_store";
import { TaskSession } from "./session_types";

export function startTaskSession(goal: string, totalSteps: number): TaskSession {
  return createSession(goal, totalSteps);
}

export function setTaskTotalSteps(totalSteps: number): TaskSession | null {
  return setSessionTotalSteps(totalSteps);
}

export function markStepCompleted(): TaskSession | null {
  const session = getSession();
  if (!session) {
    return null;
  }

  const stepsCompleted = session.stepsCompleted + 1;
  const stepsRemaining = Math.max(0, session.stepsRemaining - 1);
  return updateSession({ stepsCompleted, stepsRemaining });
}

export function markTaskCompleted(): TaskSession | null {
  return completeSession();
}

export function markTaskFailed(): TaskSession | null {
  return failSession();
}

export function getTaskSession(): TaskSession | null {
  return getSession();
}

export function resetTaskSession(): void {
  clearSession();
}
