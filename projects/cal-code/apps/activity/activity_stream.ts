import { ActivityEvent } from "./activity_types";

type ActivitySubscriber = (event: ActivityEvent) => void;

const subscribers = new Set<ActivitySubscriber>();

export function subscribeToActivity(
  callback: ActivitySubscriber
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function publishActivity(event: ActivityEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}
