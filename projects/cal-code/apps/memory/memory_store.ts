import { ConversationMemory, Message } from "./memory_types";

const memory: ConversationMemory = {
  messages: [],
};

export function addMessage(message: Message) {
  memory.messages.push(message);
}

export function getMemory(): Message[] {
  return memory.messages;
}

export function clearMemory() {
  memory.messages = [];
}
