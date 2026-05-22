'use client';

/**
 * HR Chat & Announcements Page
 *
 * RLS alignment (public.users synced with auth.users, same UUID):
 *  - resolveCurrentUser()      → fetches from public.users by auth.uid()
 *  - All FK joins              → hint to public.users (not auth.users)
 *  - loadConversations()       → NO userId arg; RLS filters participant rows automatically
 *  - getOrCreateConversation() → NEVER queries other user's participant rows (RLS blocks it);
 *                                checks in JS instead; falls back to RPC
 *  - sendMsg()                 → sender_id = currentUser.id (=auth.uid()) — matches RLS INSERT
 *  - loadNotifications()       → .eq('user_id', userId) mirrors RLS SELECT condition
 *  - Realtime filters          → use currentUser.id (from public.users) which = auth.uid()
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  MessageSquare, Send, Search, Plus, ArrowLeft,
  Bell, BellDot, Users, Clock, CheckCheck,
  ChevronRight, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { full_name: string; email: string; role: string } | null;
}

interface Participant {
  user_id: string;
  user?: { full_name: string; email: string; role: string } | null;
}

interface Conversation {
  id: string;
  name?: string | null;
  is_group: boolean;
  created_at: string;
  participants: Participant[];
  last_message?: { content: string; created_at: string } | null;
}

interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const hrs = (Date.now() - d.getTime()) / 3_600_000;
  if (hrs < 24)  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (hrs < 168) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

const avatarColor = (name = '') => {
  const palette = [
    'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
  ];
  return palette[(name.charCodeAt(0) ?? 0) % palette.length];
};

const NOTI_ICON: Record<string, string> = {
  announcement: '📢', alert: '🚨', reminder: '⏰', info: 'ℹ️', success: '✅',
};

const NOTI_BADGE: Record<string, string> = {
  alert:        'bg-rose-100 text-rose-600',
  success:      'bg-emerald-100 text-emerald-600',
  reminder:     'bg-amber-100 text-amber-600',
  info:         'bg-sky-100 text-sky-600',
  announcement: 'bg-violet-100 text-violet-600',
};

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }

let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'error'   ? 'bg-rose-600 text-white' :
                                   'bg-slate-800 text-white'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100 text-white leading-none">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Supabase Query Functions ─────────────────────────────────────────────────

async function resolveCurrentUser(): Promise<PublicUser | null> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (error) { console.error('[resolveCurrentUser]', error.message); return null; }
  return data as PublicUser;
}

async function loadConversations(): Promise<Conversation[]> {
  // Step 1 — get my participant rows
  const { data: myRows, error: pErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id');

  if (pErr) {
    console.error('[loadConversations:participants]', pErr.message);
    return [];
  }

  if (!myRows?.length) return [];

  const convIds = myRows.map((r: any) => r.conversation_id);

  // Step 2 — get conversations
  const { data: convs, error: cErr } = await supabase
    .from('conversations')
    .select(`
      id,
      name,
      is_group,
      created_at,
      conversation_participants (
        user_id
      )
    `)
    .in('id', convIds)
    .order('created_at', { ascending: false });

  if (cErr) {
    console.error('[loadConversations:convs]', cErr.message);
    return [];
  }

  // Step 3 — collect all user ids
  const allUserIds = [
    ...new Set(
      (convs ?? []).flatMap((c: any) =>
        (c.conversation_participants ?? []).map((p: any) => p.user_id)
      )
    ),
  ];

  // Step 4 — fetch users manually
  const { data: usersData, error: uErr } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('id', allUserIds);

  if (uErr) {
    console.error('[loadConversations:users]', uErr.message);
    return [];
  }

  // Step 5 — create lookup map
  const usersMap = new Map(
    (usersData ?? []).map((u: any) => [u.id, u])
  );

  // Step 6 — enrich conversations
  const enriched = await Promise.all(
    (convs ?? []).map(async (conv: any) => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        id: conv.id,
        name: conv.name ?? null,
        is_group: conv.is_group,
        created_at: conv.created_at,

        participants: (conv.conversation_participants ?? []).map((p: any) => ({
          user_id: p.user_id,
          user: usersMap.get(p.user_id) ?? null,
        })),

        last_message: msgs?.[0] ?? null,
      };
    })
  );

  return enriched.sort((a, b) => {
    const at = a.last_message?.created_at ?? a.created_at;
    const bt = b.last_message?.created_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

async function loadMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, created_at,
      sender:users!messages_sender_id_fkey (
        full_name, email, role
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) { console.error('[loadMessages]', error.message); return []; }
  const rows = (data ?? []) as any[];
  return rows.map(row => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
    sender: Array.isArray(row.sender) ? row.sender[0] ?? null : row.sender ?? null,
  })) as Message[];
}

async function sendMsg(conversationId: string, senderId: string, content: string) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
  });
  if (error) throw new Error(`[sendMsg] ${error.message}`);
}

async function searchPublicUsers(query: string, excludeId: string): Promise<PublicUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .neq('id', excludeId)
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) { console.error('[searchPublicUsers]', error.message); return []; }
  return (data ?? []) as PublicUser[];
}

/**
 * Safe 1-on-1 conversation lookup/creation.
 * NEVER queries other user's participant rows (RLS blocks it).
 * Falls back to RPC for creation to avoid INSERT policy issues.
 */
async function getOrCreateConversation(
  currentUserId: string,
  otherUserId: string,
): Promise<string> {
  // Step 1 — check existing conversations I'm in (RLS-safe)
  const { data: myConvs, error } = await supabase
    .from('conversations')
    .select(`id, conversation_participants ( user_id )`)
    .eq('is_group', false);

  if (error) throw new Error(`[getOrCreateConversation:fetch] ${error.message}`);

  // JS check — no out-of-scope query for another user's rows
  const existing = (myConvs ?? []).find((conv: any) => {
    const ids: string[] = (conv.conversation_participants ?? []).map((p: any) => p.user_id);
    return ids.includes(otherUserId);
  });

  if (existing) return existing.id;

  // Step 2 — use RPC to create conversation + add both participants atomically
  const { data, error: rpcError } = await supabase.rpc(
    'create_conversation_with_participants',
    { other_user: otherUserId }
  );

  if (rpcError) throw new Error(`[getOrCreateConversation:rpc] ${rpcError.message}`);
  return data;
}

async function loadNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, message, type, is_read, created_at, link')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { console.error('[loadNotifications]', error.message); return []; }
  return (data ?? []) as AppNotification[];
}

async function markOneRead(notifId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId);
  if (error) console.error('[markOneRead]', error.message);
}

async function markAllRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) console.error('[markAllRead]', error.message);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HRChatPage() {
  const [currentUser, setCurrentUser]     = useState<PublicUser | null>(null);
  const [tab, setTab]                     = useState<'chat' | 'announcements'>('chat');
  const [toasts, setToasts]               = useState<Toast[]>([]);

  // Chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv]   = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [newMsg, setNewMsg]               = useState('');
  const [sending, setSending]             = useState(false);
  const [showNewChat, setShowNewChat]     = useState(false);
  const [convSearch, setConvSearch]       = useState('');
  const [userQuery, setUserQuery]         = useState('');
  const [userResults, setUserResults]     = useState<PublicUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [convsLoading, setConvsLoading]   = useState(true);
  const [msgsLoading, setMsgsLoading]     = useState(false);

  // Announcements state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notiFilter, setNotiFilter]       = useState<'all' | 'unread'>('all');
  const [notiLoading, setNotiLoading]     = useState(true);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Toast helpers ──
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Boot ──
  useEffect(() => {
    resolveCurrentUser().then(user => {
      setCurrentUser(user);
      if (!user) return;
      refreshConversations();
      refreshNotifications(user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshConversations = useCallback(async () => {
    setConvsLoading(true);
    const data = await loadConversations();
    setConversations(data);
    setConvsLoading(false);
  }, []);

  const refreshNotifications = useCallback(async (uid: string) => {
    setNotiLoading(true);
    const data = await loadNotifications(uid);
    setNotifications(data);
    setNotiLoading(false);
  }, []);

  // ── Realtime: new messages ──
  useEffect(() => {
    if (!selectedConv) return;
    const ch = supabase
      .channel(`messages:conv:${selectedConv}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${selectedConv}` },
        async () => {
          const fresh = await loadMessages(selectedConv);
          setMessages(fresh);
          refreshConversations();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConv, refreshConversations]);

  // ── Realtime: new notifications ──
  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase
      .channel(`notifications:user:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${currentUser.id}` },
        () => {
          refreshNotifications(currentUser.id);
          addToast('You have a new notification', 'info');
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentUser, refreshNotifications, addToast]);

  // ── Auto-scroll ──
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load messages when conversation selected ──
  useEffect(() => {
    if (!selectedConv) return;
    setMsgsLoading(true);
    loadMessages(selectedConv).then(data => {
      setMessages(data);
      setMsgsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    });
  }, [selectedConv]);

  // ── Handlers ──
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedConv || !currentUser) return;
    setSending(true);
    try {
      await sendMsg(selectedConv, currentUser.id, newMsg);
      setNewMsg('');
    } catch (err) {
      console.error(err);
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleUserSearch = useCallback(async (q: string) => {
    setUserQuery(q);
    if (q.length < 2) { setUserResults([]); return; }
    setUserSearching(true);
    const results = await searchPublicUsers(q, currentUser!.id);
    setUserResults(results);
    setUserSearching(false);
  }, [currentUser]);

  const handleStartChat = async (otherUserId: string) => {
    if (!currentUser) return;
    try {
      const convId = await getOrCreateConversation(currentUser.id, otherUserId);
      await refreshConversations();
      setSelectedConv(convId);
      setShowNewChat(false);
      setUserQuery('');
      setUserResults([]);
    } catch (err) {
      console.error(err);
      addToast('Could not start conversation. Please try again.', 'error');
    }
  };

  const handleMarkOne = async (notif: AppNotification) => {
    if (notif.is_read) return;
    await markOneRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    if (!currentUser) return;
    await markAllRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    addToast('All notifications marked as read', 'success');
  };

  // ── Derived helpers ──
const convName = (conv: Conversation): string => {
  // Group chat
  if (conv.name?.trim()) {
    return conv.name;
  }

  if (conv.is_group) {
    return 'Group Chat';
  }

  // Find OTHER participant
  const otherParticipant = conv.participants.find(
    p => p.user_id !== currentUser?.id
  );
  
  return (
    otherParticipant?.user?.full_name ||
    otherParticipant?.user?.email ||
    'Unknown User'
  );
  console.log(conv.participants);
};

  const convRole = (conv: Conversation): string =>
    conv.participants.find(p => p.user_id !== currentUser?.id)?.user?.role ?? '';
  

  const filteredConvs = conversations.filter(c =>
    convName(c).toLowerCase().includes(convSearch.toLowerCase())
  );

  const unreadCount     = notifications.filter(n => !n.is_read).length;
  const displayedNotifs = notiFilter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;
  const selectedConvObj = conversations.find(c => c.id === selectedConv);

  // ── Boot loading ──
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {tab === 'chat' ? 'Messages' : 'Announcements'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tab === 'chat'
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                : `${unreadCount} unread`}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['chat', 'announcements'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'chat'
                  ? <MessageSquare className="h-4 w-4" />
                  : unreadCount > 0
                    ? <BellDot className="h-4 w-4 text-rose-500" />
                    : <Bell className="h-4 w-4" />}
                <span className="capitalize">{t}</span>
                {t === 'announcements' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ─── CHAT ─────────────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-11rem)]">

            {/* Sidebar — Conversations List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Conversations</h2>
                  <button
                    onClick={() => { setShowNewChat(true); setSelectedConv(null); }}
                    className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-colors"
                    title="New Chat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={convSearch}
                    onChange={e => setConvSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {convsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">
                      {convSearch ? 'No conversations match your search' : 'No conversations yet'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Tap + to start one</p>
                  </div>
                ) : (
                  filteredConvs.map(conv => {
                    const name       = convName(conv);
                    const isSelected = selectedConv === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => { setSelectedConv(conv.id); setShowNewChat(false); }}
                        className={`w-full px-4 py-3.5 border-b border-slate-50 text-left transition-all hover:bg-slate-50 ${
                          isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(name)}`}>
                            {name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                                {name}
                              </span>
                              {conv.last_message && (
                                <span className="text-[11px] text-slate-400 flex-shrink-0">
                                  {fmtTime(conv.last_message.created_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 capitalize mt-0.5">{convRole(conv)}</p>
                            {conv.last_message && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {conv.last_message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Main Panel — Messages / New Chat / Empty */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden lg:col-span-2">

              {/* New Chat Search Panel */}
              {showNewChat && (
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() => { setShowNewChat(false); setUserQuery(''); setUserResults([]); }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
                    >
                      <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <h3 className="font-semibold text-slate-800">New Chat</h3>
                  </div>
                  <div className="p-4 overflow-y-auto">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        autoFocus
                        value={userQuery}
                        onChange={e => handleUserSearch(e.target.value)}
                        placeholder="Search teachers or students..."
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {userSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {userResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleStartChat(u.id)}
                          className="w-full p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(u.full_name)}`}>
                              {u.full_name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate">
                                {u.full_name}
                              </p>
                              <p className="text-xs text-slate-500 capitalize">{u.role} · {u.email}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400" />
                          </div>
                        </button>
                      ))}

                      {userQuery.length >= 2 && !userSearching && userResults.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-8">
                          No users found for &quot;{userQuery}&quot;
                        </p>
                      )}

                      {userQuery.length < 2 && (
                        <div className="text-center py-10">
                          <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">Type at least 2 characters to search</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Active Conversation */}
              {!showNewChat && selectedConv && selectedConvObj && (
                <>
                  {/* Chat Header */}
                  <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                    >
                      <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(convName(selectedConvObj))}`}>
                      {convName(selectedConvObj)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {convName(selectedConvObj)}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {convRole(selectedConvObj) || 'User'}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/80">
                    {msgsLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400 text-sm">No messages yet. Say hello 👋</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe     = msg.sender_id === currentUser.id;
                        const showName = !isMe &&
                          (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isMe && (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(msg.sender?.full_name ?? '')}`}>
                                {msg.sender?.full_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                            )}
                            <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {showName && (
                                <span className="text-xs text-slate-500 font-medium mb-1 px-1">
                                  {msg.sender?.full_name}
                                </span>
                              )}
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-br-sm'
                                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                              }`}>
                                {msg.content}
                              </div>
                              <span className="text-[11px] mt-1 px-1 text-slate-400 flex items-center gap-1">
                                {fmtTime(msg.created_at)}
                                {isMe && <CheckCheck className="h-3 w-3 text-indigo-400" />}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                      <input
                        ref={inputRef}
                        value={newMsg}
                        onChange={e => setNewMsg(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend(e as unknown as React.FormEvent);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!newMsg.trim() || sending}
                        className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        {sending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Send className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Empty State */}
              {!showNewChat && !selectedConv && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">No conversation selected</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Choose a conversation from the list or start a new chat
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" /> New Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANNOUNCEMENTS ───────────────────────────────────────────── */}
        {tab === 'announcements' && (
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total',  value: notifications.length,               icon: Bell,       cls: 'text-slate-600 bg-slate-100' },
                { label: 'Unread', value: unreadCount,                         icon: BellDot,    cls: 'text-rose-600 bg-rose-50' },
                { label: 'Read',   value: notifications.length - unreadCount,  icon: CheckCheck, cls: 'text-emerald-600 bg-emerald-50' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.cls}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Notification List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  {(['all', 'unread'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setNotiFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                        notiFilter === f
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f}{f === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </button>
                  ))}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {notiLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : displayedNotifs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Bell className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">
                      {notiFilter === 'unread' ? 'All caught up!' : 'No announcements yet'}
                    </p>
                  </div>
                ) : (
                  displayedNotifs.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkOne(notif)}
                      className={`px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notif.is_read ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                          {NOTI_ICON[notif.type] ?? '🔔'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                              {notif.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-slate-400">{fmtTime(notif.created_at)}</span>
                              {!notif.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold ${
                              NOTI_BADGE[notif.type] ?? 'bg-slate-100 text-slate-600'
                            }`}>
                              {notif.type}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtFull(notif.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}