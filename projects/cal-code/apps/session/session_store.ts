import { randomUUID } from "node:crypto";
import { TaskSession } from "./session_types";

let activeSession: TaskSession | null = null;

export function createSession(goal: string, stepsTotal = 0): TaskSession {
  activeSession = {
    id: randomUUID(),
    goal,
    createdAt: Date.now(),
    stepsCompleted: 0,
    stepsRemaining: Math.max(0, stepsTotal),
    status: "running",
  };
  return { ...activeSession };
}

export function getSession(): TaskSession | null {
  return activeSession ? { ...activeSession } : null;
}

export function updateSession(update: Partial<TaskSession>): TaskSession | null {
  if (!activeSession) {
    return null;
  }
  activeSession = { ...activeSession, ...update };
  return { ...activeSession };
}

export function setSessionTotalSteps(stepsTotal: number): TaskSession | null {
  if (!activeSession) {
    return null;
  }
  activeSession = {
    ...activeSession,
    stepsCompleted: 0,
    stepsRemaining: Math.max(0, stepsTotal),
  };
  return { ...activeSession };
}

export function completeSession(): TaskSession | null {
  if (!activeSession) {
    return null;
  }
  activeSession = {
    ...activeSession,
    status: "completed",
    stepsRemaining: 0,
  };
  return { ...activeSession };
}

export function failSession(): TaskSession | null {
  if (!activeSession) {
    return null;
  }
  activeSession = {
    ...activeSession,
    status: "failed",
  };
  return { ...activeSession };
}

export function clearSession(): void {
  activeSession = null;
}
