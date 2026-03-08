import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { registerActivity } from '../utils/gamification';
import * as NotificationService from '../services/NotificationService';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [chats, setChats] = useState([]);

    // Load chats from localStorage
    useEffect(() => {
        try {
            const storedChats = JSON.parse(localStorage.getItem('cooplance_db_chats') || '[]');
            setChats(storedChats);
        } catch (error) {
            console.error("Failed to parse chats from storage", error);
            setChats([]);
        }
    }, []);

    // Save chats to localStorage whenever they change
    useEffect(() => {
        if (chats.length > 0) {
            localStorage.setItem('cooplance_db_chats', JSON.stringify(chats));
        }
    }, [chats]);

    const createChat = (participants, type = 'direct', contextId = null, contextTitle = '') => {
        // Check if chat already exists
        const existingChat = chats.find(c =>
            c.type === type &&
            c.contextId === contextId &&
            participants.every(p => c.participants.includes(p))
        );

        if (existingChat) {
            return existingChat.id;
        }

        const newChat = {
            id: 'chat_' + Date.now(),
            participants, // Array of user IDs or names
            type, // 'order', 'project', 'direct'
            contextId, // orderId or projectId
            contextTitle, // Service Name or Project Title
            status: 'active', // 'active', 'blocked'
            messages: [],
            createdAt: new Date().toISOString(),
            lastMessage: null,
            lastMessageAt: new Date().toISOString()
        };

        setChats(prev => [...prev, newChat]);
        return newChat.id;
    };

    const toggleChatBlock = (chatId) => {
        setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                return { ...chat, status: chat.status === 'blocked' ? 'active' : 'blocked' };
            }
            return chat;
        }));
    };

    const sendMessage = (chatId, text, attachments = [], options = {}) => {
        const chatToNotify = chats.find(c => c.id === chatId);
        if (chatToNotify && chatToNotify.status !== 'blocked' && !options.isSystem) {
            const senderId = options.senderId || (user?.id || user?.username);
            const receivers = chatToNotify.participants.filter(p => String(p) !== String(senderId) && p !== 'system');
            receivers.forEach(receiverId => {
                NotificationService.createNotification(receiverId, {
                    type: NotificationService.NOTIFICATION_TYPES.MESSAGE,
                    title: `Nuevo mensaje en ${chatToNotify.contextTitle || 'Chat'}`,
                    message: text || 'Adjunto enviado',
                    link: `/chat/${chatId}`
                });
            });
        }

        setChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                // Prevent sending if blocked, EXCEPT for system messages
                if (chat.status === 'blocked' && !options.isSystem) return chat;

                const newMessage = {
                    id: 'msg_' + Date.now(),
                    senderId: options.senderId || (options.isSystem ? 'system' : (user?.id || user?.username)),
                    senderName: options.senderName || (options.isSystem ? 'Sistema Cooplance' : (user?.firstName || user?.companyName || user?.username)),
                    text,
                    attachments, // Array of { type: 'image'|'video', url: '...' }
                    timestamp: new Date().toISOString(),
                    isSystem: options.isSystem || false
                };
                return {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                    lastMessage: text || (attachments.length ? 'Adjunto enviado' : ''),
                    lastMessageAt: newMessage.timestamp
                };
            }
            return chat;
        }));

        // Register activity on message send
        if (user) {
            const updated = registerActivity(user);
            // Updating user state here might cause re-renders or loops if not careful,
            // but since it updates a timestamp, it's generally safe for gamification.
            // However, ChatContext usually shouldn't drive User updates directly if avoidable,
            // but for this MVP feature it's the direct way.
            updateUser(updated);
        }
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

    return (
        <ChatContext.Provider value={{
            chats,
            createChat,
            sendMessage,
            toggleChatBlock,
            getChatById,
            getUserChats
        }}>
            {children}
        </ChatContext.Provider>
    );
};
