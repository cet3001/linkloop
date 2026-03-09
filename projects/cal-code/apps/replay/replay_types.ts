export interface ReplayEvent {
  sessionId: string;
  timestamp: number;
  type: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface TaskReplay {
  sessionId: string;
  goal: string;
  events: ReplayEvent[];
}
