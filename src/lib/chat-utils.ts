/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/chat-utils.ts

import { supabase } from '@/lib/supabase/client';
import type { Conversation, Message, User } from '@/types/chat';

/**
 * Get or create a 1-on-1 conversation between two users
 * Uses RPC function to avoid RLS recursion issues
 */
export async function getOrCreateConversation(otherUserId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('Current user:', user.id);
    console.log('Creating conversation with:', otherUserId);

    // Use RPC function to handle conversation creation server-side
    // This bypasses RLS recursion issues
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      user_id_1: user.id,
      user_id_2: otherUserId
    });

    if (error) {
      console.error('RPC error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to get or create conversation: ${error.message}`);
    }

    console.log('Conversation ID:', data);
    return data;
  } catch (error) {
    console.error('getOrCreateConversation error:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: participantData } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      conversations (
        id,
        name,
        is_group,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id);

  if (!participantData) return [];

  const conversations: Conversation[] = [];

  for (const item of participantData) {
    const conv = item.conversations as any;
    if (!conv) continue;

    // Get participants - try with foreign key first, fallback to manual fetch
    let participants;
    const { data: participantsData, error: partError } = await supabase
      .from('conversation_participants')
      .select(`
        id,
        user_id,
        users!conversation_participants_user_id_fkey (
          id,
          email,
          full_name,
          role,
          profile_picture_url
        )
      `)
      .eq('conversation_id', conv.id);

    if (partError || !participantsData) {
      // Fallback: fetch participants and users separately
      const { data: partIds } = await supabase
        .from('conversation_participants')
        .select('id, user_id')
        .eq('conversation_id', conv.id);

      if (partIds && partIds.length > 0) {
        const userIds = partIds.map(p => p.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name, role, profile_picture_url')
          .in('id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        participants = partIds.map(p => ({
          id: p.id,
          conversation_id: conv.id,
          user_id: p.user_id,
          joined_at: '',
          last_read_at: '',
          user: usersMap.get(p.user_id) || {
            id: p.user_id,
            email: 'Unknown',
            full_name: 'Unknown User',
            role: 'student'
          }
        }));
      }
    } else {
      participants = participantsData.map(p => ({
        id: p.id,
        conversation_id: conv.id,
        user_id: p.user_id,
        joined_at: '',
        last_read_at: '',
        user: {
          id: (p.users as any)?.id || p.user_id,
          email: (p.users as any)?.email || 'Unknown',
          full_name: (p.users as any)?.full_name || 'Unknown User',
          role: (p.users as any)?.role || 'student'
        }
      }));
    }

    // Get last message
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    conversations.push({
      ...conv,
      participants,
      last_message: lastMessage || undefined
    });
  }

  return conversations.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

/**
 * Send a message
 */
export async function sendMessage(conversationId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    // Try alternative approach - fetch messages and users separately
    const { data: messagesData, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', {
        message: msgError.message,
        details: msgError.details,
        hint: msgError.hint,
        code: msgError.code
      });
      throw msgError;
    }

    if (!messagesData || messagesData.length === 0) {
      return [];
    }

    // Fetch user details for all unique sender IDs
    const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, profile_picture_url')
      .in('id', senderIds);

    if (usersError) {
      console.error('Error fetching users:', {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      });
      // Continue without user data rather than failing completely
    }

    // Map users to messages
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
    
    return messagesData.map(msg => ({
      ...msg,
      sender: usersMap.get(msg.sender_id) || {
        id: msg.sender_id,
        email: 'Unknown',
        full_name: 'Unknown User',
        role: 'student'
      }
    }));
  } catch (error) {
    console.error('getMessages error:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

/**
 * Search for users to chat with
 * @param query - Search query string
 * @param filterRoles - Optional array of roles to filter by (e.g., ['teacher', 'admin'])
 */
export async function searchUsers(query: string, filterRoles?: string[]): Promise<User[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  console.log('Searching for:', query);

  let queryBuilder = supabase
    .from('users')
    .select('id, email, full_name, role, profile_picture_url')
    .neq('id', user.id)
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);

  // Filter by roles if provided
  if (filterRoles && filterRoles.length > 0) {
    queryBuilder = queryBuilder.in('role', filterRoles);
  }

  const { data, error } = await queryBuilder.limit(20);

  if (error) {
    console.error('Search users error:', error);
    return [];
  }

  console.log('Search results:', data);
  return data || [];
}