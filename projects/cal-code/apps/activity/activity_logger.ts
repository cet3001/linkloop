import { publishActivity } from "./activity_stream";
import { ActivityEvent, ActivityType } from "./activity_types";

const events: ActivityEvent[] = [];

export function logActivity(type: ActivityType, message: string): ActivityEvent {
  const event: ActivityEvent = {
    type,
    message,
    timestamp: Date.now(),
  };
  events.push(event);
  publishActivity(event);
  return event;
}

export function getActivityEvents(): ActivityEvent[] {
  return [...events];
}

export function clearActivity(): void {
  events.length = 0;
}
