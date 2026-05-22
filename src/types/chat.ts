// types/chat.ts

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  sender?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}