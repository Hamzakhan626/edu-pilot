/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Search, Plus, ArrowLeft } from "lucide-react";
import type { Conversation, Message, User } from "@/types/chat";
import {
  getUserConversations,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
  getOrCreateConversation,
} from "@/lib/chat-utils";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          loadConversations(); // Update conversation list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const convs = await getUserConversations();
      setConversations(convs);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation, newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const users = await searchUsers(query);
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const conversationId = await getOrCreateConversation(userId);
      await loadConversations();
      setSelectedConversation(conversationId);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return "Group Chat";

    const otherParticipant = conv.participants?.find(
      (p) => p.user_id !== currentUser?.id
    );
    return (
      otherParticipant?.user?.full_name ||
      otherParticipant?.user?.email ||
      "Unknown User"
    );
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
          <p className="text-gray-500 mt-1">
            Connect with teachers and students
          </p>
        </div>
        <Button
          onClick={() => setShowNewChat(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
        {/* Conversations List */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">
                    Start a new chat to get started
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 border-b hover:bg-gray-50 text-left transition ${
                      selectedConversation === conv.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold">
                          {getConversationName(conv)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm truncate">
                            {getConversationName(conv)}
                          </h3>
                          {conv.last_message && (
                            <span className="text-xs text-gray-500">
                              {formatTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="border-0 shadow-lg lg:col-span-2 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {getConversationName(
                          conversations.find(
                            (c) => c.id === selectedConversation
                          )!
                        )[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {getConversationName(
                          conversations.find(
                            (c) => c.id === selectedConversation
                          )!
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conversations
                          .find((c) => c.id === selectedConversation)
                          ?.participants?.find(
                            (p) => p.user_id !== currentUser?.id
                          )?.user?.role || "User"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === currentUser?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === currentUser?.id
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-900 border"
                        }`}
                      >
                        {msg.sender_id !== currentUser?.id && (
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.sender?.full_name || msg.sender?.email}
                          </p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender_id === currentUser?.id
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t bg-white"
                >
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : showNewChat ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChat(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">New Chat</h2>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search for teachers or students..."
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user.id)}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {user.full_name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No users found
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a conversation from the list or start a new chat
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
