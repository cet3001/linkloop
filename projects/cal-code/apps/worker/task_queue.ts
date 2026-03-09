import { WorkerTask } from "./worker_types";

const queue: WorkerTask[] = [];

export function enqueueTask(task: WorkerTask): void {
  queue.push(task);
}

export function getNextTask(): WorkerTask | undefined {
  return queue.shift();
}

export function getQueueLength(): number {
  return queue.length;
}
