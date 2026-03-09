import { ReplayEvent, TaskReplay } from "./replay_types";

const replaySessions = new Map<string, TaskReplay>();

export function createReplay(sessionId: string, goal: string): TaskReplay {
  const replay: TaskReplay = {
    sessionId,
    goal,
    events: [],
  };
  replaySessions.set(sessionId, replay);
  return {
    ...replay,
    events: [...replay.events],
  };
}

export function addReplayEvent(
  sessionId: string,
  event: Omit<ReplayEvent, "sessionId">
): void {
  const replay = replaySessions.get(sessionId);
  if (!replay) {
    return;
  }
  replay.events.push({
    ...event,
    sessionId,
  });
}

export function getReplay(sessionId: string): TaskReplay | null {
  const replay = replaySessions.get(sessionId);
  if (!replay) {
    return null;
  }
  return {
    ...replay,
    events: [...replay.events],
  };
}
