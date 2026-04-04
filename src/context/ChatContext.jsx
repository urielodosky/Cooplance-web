import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import { registerActivity } from '../utils/gamification';
import * as NotificationService from '../services/NotificationService';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [chats, setChats] = useState([]);

    const loadChats = useCallback(async () => {
        if (!user) {
            setChats([]);
            return;
        }

        try {
            // Fetch chats where the user is a participant
            const { data: participations, error: pError } = await supabase
                .from('chat_participants')
                .select('chat_id, chats(*)')
                .eq('user_id', user.id);

            if (pError) throw pError;

            const userChats = (participations || []).map(p => ({
                ...p.chats,
                messages: [] // We'll load messages on demand or subscribe
            }));

            setChats(userChats);
        } catch (error) {
            console.error("[ChatContext] Failed to fetch chats", error);
        }
    }, [user]);

    // Load on mount or user change
    useEffect(() => {
        loadChats();
    }, [loadChats]);

    // Global Message Subscription (optional, can be done per chat)
    useEffect(() => {
        if (!user) return;

        // Simplified: Listen for any new messages in any of my chats
        const channel = supabase
            .channel('realtime:messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages'
            }, (payload) => {
                // Check if the chat of the new message is one of mine
                if (chats.some(c => c.id === payload.new.chat_id)) {
                   // Refresh that chat or last message
                   loadChats(); 
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user, chats, loadChats]); 

    const createChat = async (participants, type = 'direct', contextId = null, contextTitle = '') => {
        // ... (existing participants are IDs here usually after migration)
        const { data: chat, error } = await supabase
            .from('chats')
            .insert({
                type,
                context_id: contextId,
                context_title: contextTitle,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        // Add participants
        const participantRecords = participants.map(pId => ({
            chat_id: chat.id,
            user_id: pId
        }));

        await supabase.from('chat_participants').insert(participantRecords);

        setChats(prev => [...prev, { ...chat, messages: [] }]);
        return chat.id;
    };

    const toggleChatBlock = (chatId) => {
        setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                return { ...chat, status: chat.status === 'blocked' ? 'active' : 'blocked' };
            }
            return chat;
        }));
    };

    const sendMessage = async (chatId, text, attachments = [], options = {}) => {
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: options.isSystem ? null : (user?.id),
                sender_name: options.senderName || (options.isSystem ? 'Sistema Cooplance' : (user?.firstName || user?.username)),
                content: text,
                attachments,
                is_system: options.isSystem || false
            })
            .select()
            .single();

        if (error) throw error;

        // Update chat last message
        await supabase
            .from('chats')
            .update({ 
                last_message: text || (attachments.length ? 'Adjunto enviado' : ''),
                last_message_at: new Date().toISOString()
            })
            .eq('id', chatId);

        // Register activity on message send
        if (user && !options.isSystem) {
            const updated = registerActivity(user);
            updateUser(updated);
        }

        return message;
    };

    const getChatById = (chatId) => {
        return chats.find(c => c.id === chatId);
    };

    const getUserChats = () => {
        if (!user) return [];
        // Filter chats where user is a participant
        // For simplicity using ID or Name matching
        const userId = user.id || user.username; // Normalize identifier usage
        return chats.filter(c => c.participants.includes(userId)).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    };

    const fetchMessages = async (chatId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ChatContext] Error fetching messages:', error);
            return [];
        }

        return data.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            text: m.content,
            attachments: m.attachments,
            timestamp: m.created_at,
            isSystem: m.is_system
        }));
    };

    return (
        <ChatContext.Provider value={{
            chats,
            createChat,
            sendMessage,
            toggleChatBlock,
            getChatById,
            getUserChats,
            fetchMessages,
            refreshChats: loadChats
        }}>
            {children}
        </ChatContext.Provider>
    );
};
