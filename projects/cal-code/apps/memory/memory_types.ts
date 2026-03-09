export interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
}

export interface ConversationMemory {
  messages: Message[];
}
