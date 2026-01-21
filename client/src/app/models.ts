export type Conversation = {
  id: number;
  title: string;
  created_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type Report = {
  id: number;
  conversation_id: number;
  title: string;
  content: string;
  created_at: string;
};

export type ChatResponse = {
  conversationId: number;
  reply: string;
};
