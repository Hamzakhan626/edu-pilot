/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Search, Plus, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import type { Conversation, Message, User } from '@/types/chat';
import {
  getUserConversations,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
  getOrCreateConversation,
} from '@/lib/chat-utils';

export default function StudentChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('student-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when a conversation is selected
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
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
      console.error('Error searching users:', error);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const conversationId = await getOrCreateConversation(userId);
      await loadConversations();
      setSelectedConversation(conversationId);
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return 'Group Chat';
    const other = conv.participants?.find((p) => p.user_id !== currentUser?.id);
    return other?.user?.full_name || other?.user?.email || 'Unknown';
  };

  const getParticipantRole = (conv: Conversation): string => {
    const other = conv.participants?.find((p) => p.user_id !== currentUser?.id);
    const role = other?.user?.role;
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'Teacher' || role === 'teacher') return <GraduationCap className="h-3 w-3" />;
    return <BookOpen className="h-3 w-3" />;
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = role?.toLowerCase();
    if (r === 'teacher') return 'bg-violet-100 text-violet-700';
    if (r === 'admin') return 'bg-rose-100 text-rose-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-violet-200 text-violet-700',
      'bg-sky-200 text-sky-700',
      'bg-emerald-200 text-emerald-700',
      'bg-amber-200 text-amber-700',
      'bg-pink-200 text-pink-700',
    ];
    const index = (name?.charCodeAt(0) ?? 0) % colors.length;
    return colors[index];
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Chat with your teachers and classmates</p>
        </div>
        <Button
          onClick={() => setShowNewChat(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-14rem)]">
        {/* Sidebar: Conversations List */}
        <Card className="border border-gray-100 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-700">Conversations</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                    <MessageSquare className="h-7 w-7 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">No chats yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start a conversation with a teacher or classmate
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const name = getConversationName(conv);
                  const role = getParticipantRole(conv);
                  const isSelected = selectedConversation === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-violet-50 border-l-2 border-violet-500'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${getAvatarColor(
                            name
                          )}`}
                        >
                          {name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold text-gray-800 truncate">
                              {name}
                            </span>
                            {conv.last_message && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0">
                                {formatTime(conv.last_message.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {role && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getRoleBadgeStyle(
                                  role
                                )}`}
                              >
                                {getRoleIcon(role)}
                                {role}
                              </span>
                            )}
                            {conv.last_message && (
                              <p className="text-xs text-gray-400 truncate">
                                {conv.last_message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main: Messages Area */}
        <Card className="border border-gray-100 shadow-md rounded-2xl lg:col-span-2 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {selectedConversation && selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-1.5 rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(
                      getConversationName(selectedConv)
                    )}`}
                  >
                    {getConversationName(selectedConv)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {getConversationName(selectedConv)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getParticipantRole(selectedConv) && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getRoleBadgeStyle(
                            getParticipantRole(selectedConv)
                          )}`}
                        >
                          {getRoleIcon(getParticipantRole(selectedConv))}
                          {getParticipantRole(selectedConv)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/40">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-2">
                        <MessageSquare className="h-6 w-6 text-violet-300" />
                      </div>
                      <p className="text-sm text-gray-400">
                        No messages yet. Say hello! 👋
                      </p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isOwn
                              ? 'bg-violet-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-[11px] font-semibold mb-1 text-violet-500">
                              {msg.sender?.full_name || msg.sender?.email}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isOwn ? 'text-violet-200 text-right' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="px-4 py-3 border-t border-gray-100 bg-white"
                >
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1 border border-gray-200 focus-within:border-violet-400 transition-colors">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message..."
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-gray-400 px-0"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="h-8 w-8 p-0 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 transition-all flex-shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </>
            ) : showNewChat ? (
              /* New Chat Search Panel */
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChat(false)}
                    className="p-1.5 rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Start a Chat</h2>
                    <p className="text-xs text-gray-400">Search for a teacher or classmate</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-10 rounded-xl border-gray-200 focus-visible:ring-violet-400 text-sm"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {searchResults.map((user) => {
                    const role = user.role || '';
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleStartChat(user.id)}
                        className="w-full p-3 border border-gray-100 rounded-xl hover:border-violet-200 hover:bg-violet-50/50 text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getAvatarColor(
                              user.full_name
                            )}`}
                          >
                            {user.full_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors">
                              {user.full_name}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${getRoleBadgeStyle(
                                role
                              )}`}
                            >
                              {getRoleIcon(role)}
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400">No users found for "{searchQuery}"</p>
                    </div>
                  )}

                  {searchQuery.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                        <Search className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">Type at least 2 characters to search</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-violet-300" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">
                    Pick a conversation
                  </h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Select a chat from the left, or start a new one with a teacher or classmate.
                  </p>
                  <Button
                    onClick={() => setShowNewChat(true)}
                    variant="outline"
                    className="mt-4 rounded-xl border-violet-200 text-violet-600 hover:bg-violet-50 text-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New Chat
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}