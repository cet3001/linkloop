export interface ModelStreamEvent {
  type: "model_stream";
  sessionId: string;
  token: string;
}

type ModelStreamSubscriber = (event: ModelStreamEvent) => void;

const subscribers = new Set<ModelStreamSubscriber>();

export function subscribeToModelStream(
  callback: ModelStreamSubscriber
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function publishModelStream(event: ModelStreamEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}
