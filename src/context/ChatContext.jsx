import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import { registerActivity } from '../utils/gamification';
import { sanitizeText } from '../utils/security';
import * as NotificationService from '../services/NotificationService';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [isCleaning, setIsCleaning] = useState(false);
    const [hiddenChats, setHiddenChats] = useState(() => {
        try {
            const stored = localStorage.getItem(`cooplance_hidden_chats_${user?.id}`);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    // Persist hidden chats
    useEffect(() => {
        if (user?.id) {
            localStorage.setItem(`cooplance_hidden_chats_${user.id}`, JSON.stringify(hiddenChats));
        }
    }, [hiddenChats, user?.id]);

    const loadChats = useCallback(async () => {
        if (!user?.id) return;
        try {
            // 1. Obtener chats donde participo
            const { data: participations, error: pError } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', user.id);

            if (pError) throw pError;
            const chatIds = (participations || []).map(p => p.chat_id);

            if (chatIds.length === 0) {
                setChats([]);
                return;
            }

            // 2. Obtener los detalles de esos chats
            const { data: chatsData, error: cError } = await supabase
                .from('chats')
                .select('*')
                .in('id', chatIds)
                .order('last_message_at', { ascending: false });

            if (cError) throw cError;

            // 3. Obtener participantes con sus nombres (desde la tabla profiles)
            const { data: allParticipants, error: apError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id, 
                    user_id,
                    user:user_id(username, first_name, last_name, avatar_url, role)
                `)
                .in('chat_id', chatIds);

            if (apError) throw apError;

            const enrichedChats = (chatsData || []).map(chat => {
                const participants = (allParticipants || [])
                    .filter(p => p.chat_id === chat.id)
                    .map(p => ({
                        id: p.user_id,
                        username: p.user?.username || 'Usuario',
                        fullName: p.user?.first_name ? `${p.user.first_name} ${p.user.last_name || ''}`.trim() : null,
                        avatar: p.user?.avatar_url,
                        role: p.user?.role
                    }));

                // Calcular nombre amigable
                let chatDisplayName = chat.context_title;
                if (!chatDisplayName && chat.type === 'direct') {
                    const other = participants.find(p => p.id !== user.id);
                    chatDisplayName = other ? (other.fullName || other.username) : 'Chat Privado';
                }

                return {
                    ...chat,
                    displayName: chatDisplayName || 'Conversación',
                    participants,
                    messages: []
                };
            });

            // FILTER: Hide chats that the user manually deleted (Soft Delete)
            const visibleChats = enrichedChats.filter(c => !hiddenChats.includes(c.id));
            setChats(visibleChats);
        } catch (error) {
            console.error("[ChatContext] Error loading chats:", error);
        }
    }, [user?.id, hiddenChats]);

    // --- GLOBAL REAL-TIME SYNC ---
    useEffect(() => {
        if (!user?.id) return;

        // Subscribe to NEW MESSAGES where I am the receiver
        const messagesSubscription = supabase
            .channel('global-messages-sync')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, (payload) => {
                console.log("[ChatContext] Global message received, refreshing chats...");
                loadChats();
            })
            .subscribe();

        // Subscribe to CHAT updates (status, last_message, etc.)
        const chatsSubscription = supabase
            .channel('global-chats-sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chats'
            }, (payload) => {
                // If the chat belongs to me, refresh
                setChats(prev => {
                    if (prev.some(c => c.id === payload.new.id)) {
                        loadChats();
                    }
                    return prev;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messagesSubscription);
            supabase.removeChannel(chatsSubscription);
        };
    }, [user?.id, loadChats]);

    const createChat = useCallback(async (participantIds, type = 'direct', contextId = null, contextTitle = null, options = {}) => {
        if (!user?.id) throw new Error("Debe estar autenticado");

        const normalizedContextId = contextId?.toString();
        
        try {
            console.log(`[ChatContext] Iniciando búsqueda/creación de chat. Tipo: ${type}, ContextID: ${normalizedContextId}`);
            
            // 1. BUSCAR CHAT EXISTENTE GLOBALMENTE EN LA BASE DE DATOS
            let targetChatId = null;

            if (normalizedContextId) {
                const { data: existingChats } = await supabase
                    .from('chats')
                    .select('id, type')
                    .eq('context_id', normalizedContextId);
                
                if (existingChats && existingChats.length > 0) {
                    targetChatId = existingChats[0].id;
                    console.log(`[ChatContext] Found existing chat for context ${normalizedContextId}:`, targetChatId);
                }
            } 
            
            if (!targetChatId && type === 'direct') {
                const otherId = participantIds.find(id => id !== user.id);
                if (otherId) {
                    const { data: commonPart } = await supabase
                        .rpc('get_common_chats', { user_a: user.id, user_b: otherId });
                    
                    if (commonPart && commonPart.length > 0) {
                        const { data: directChats } = await supabase
                            .from('chats')
                            .select('id')
                            .in('id', commonPart.map(cp => cp.chat_id))
                            .eq('type', 'direct')
                            .limit(1);
                        
                        if (directChats && directChats.length > 0) {
                            targetChatId = directChats[0].id;
                            console.log("[ChatContext] Encontrado chat directo compartido por participantes:", targetChatId);
                        }
                    }
                }
            }

            if (targetChatId) {
                const { data: currentParticipants } = await supabase
                    .from('chat_participants')
                    .select('user_id')
                    .eq('chat_id', targetChatId);
                
                const existingUserIds = (currentParticipants || []).map(p => String(p.user_id));
                const missingParticipants = participantIds.filter(pid => !existingUserIds.includes(String(pid)));

                if (missingParticipants.length > 0) {
                    const joinData = missingParticipants.map(pid => ({
                        chat_id: targetChatId,
                        user_id: pid
                    }));
                    await supabase.from('chat_participants').insert(joinData);
                }

                if (!chats.some(c => c.id === targetChatId)) {
                    await loadChats();
                }
                return targetChatId;
            }

            const { data: chat, error: cError } = await supabase
                .from('chats')
                .insert({
                    type,
                    context_id: normalizedContextId,
                    context_title: contextTitle,
                    status: options.initialStatus || 'active',
                    last_message: 'Nueva conversación',
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (cError) throw cError;

            const pData = participantIds.map(pid => ({
                chat_id: chat.id,
                user_id: pid
            }));

            const { error: pError } = await supabase
                .from('chat_participants')
                .insert(pData);

            if (pError) throw pError;

            await loadChats();
            return chat.id;

        } catch (error) {
            console.error("[ChatContext] Error crítico en createChat:", error);
            throw error;
        }
    }, [user?.id, chats, loadChats]);

    // Cargar al montar o cambiar usuario
    useEffect(() => {
        loadChats().catch(err => console.error("[ChatContext] Unhandled loadChats error:", err));
    }, [loadChats]);

    // Suscripción Global a Mensajes
    const toggleChatBlock = useCallback(async (chatId) => {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        const newStatus = chat.status === 'blocked' ? 'active' : 'blocked';

        try {
            const { error } = await supabase
                .from('chats')
                .update({ status: newStatus })
                .eq('id', chatId);

            if (error) throw error;

            setChats(prev => prev.map(c =>
                c.id === chatId ? { ...c, status: newStatus } : c
            ));
        } catch (error) {
            console.error("[ChatContext] Error al bloquear chat:", error);
        }
    }, [chats]);

    const fetchMessages = useCallback(async (chatId) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(m => ({
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                text: m.content,
                attachments: m.attachments || [],
                timestamp: m.created_at,
                isSystem: m.is_system,
                isRead: m.is_read,
                deliveredAt: m.delivered_at
            }));
        } catch (error) {
            console.error("[ChatContext] Error al obtener mensajes:", error);
            return [];
        }
    }, []);

    // Track last notification time per chat to avoid spam
    const [lastNotifMap, setLastNotifMap] = useState({});

    const sendMessage = useCallback(async (chatId, text, attachments = [], options = {}) => {
        if (!user?.id && !options.isSystem) throw new Error("Debe estar autenticado");

        try {
            let receiverId = options.receiverId;

            if (!receiverId) {
                const chat = chats.find(c => c.id === chatId);
                if (chat && chat.participants) {
                    const other = chat.participants.find(p => p.id !== user?.id);
                    receiverId = other ? other.id : null;
                }

                if (!receiverId) {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select('user_id')
                        .eq('chat_id', chatId);
                    
                    const other = participants?.find(p => p.user_id !== user?.id);
                    if (other) receiverId = other.user_id;
                }
            }

            const cleanText = text ? sanitizeText(text) : text;

            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    chat_id: chatId,
                    sender_id: options.isSystem ? null : user.id,
                    sender_name: options.senderName || (options.isSystem ? 'Sistema' : (user.username || user.first_name || 'Usuario')),
                    receiver_id: receiverId, 
                    content: cleanText,
                    attachments: attachments,
                    is_system: options.isSystem || false
                })
                .select()
                .single();

            if (error) throw error;

            await supabase
                .from('chats')
                .update({
                    last_message: cleanText || (attachments.length ? 'Archivo adjunto' : ''),
                    last_message_at: new Date().toISOString()
                })
                .eq('id', chatId);

            if (receiverId && !options.isSystem && cleanText) {
                const now = Date.now();
                const lastTime = lastNotifMap[chatId] || 0;
                
                if (now - lastTime > 15000) {
                    const senderName = user.first_name || user.username || 'Un usuario';
                    
                    try {
                        const notifResult = await NotificationService.createNotification(receiverId, {
                            type: 'new_message',
                            title: 'Nuevo mensaje',
                            message: `Tienes nuevos mensajes de ${senderName}.`,
                            link: `/chat/${chatId}`
                        });
                        
                        if (notifResult) {
                            setLastNotifMap(prev => ({ ...prev, [chatId]: now }));
                        }
                    } catch (notifErr) {
                        console.error("[ChatContext] Error crítico al crear notificación:", notifErr);
                    }
                }
            }

            if (user && !options.isSystem) {
                const updated = registerActivity(user);
                updateUser(updated).catch(e => console.warn('[ChatContext] Activity sync failed:', e));
            }

            return message;
        } catch (error) {
            console.error("[ChatContext] Error al enviar mensaje:", error);
            throw error;
        }
    }, [user, chats, lastNotifMap, updateUser]);

    const deleteChat = useCallback(async (chatId) => {
        if (!user?.id) return;
        setHiddenChats(prev => [...new Set([...prev, chatId])]);
        setChats(prev => prev.filter(c => c.id !== chatId));
        return true;
    }, [user?.id]);

    const purgeDuplicateChats = useCallback(async () => {
        if (!user?.id || isCleaning) return 0;
        setIsCleaning(true);
        
        try {
            const groups = {};
            const { data: participations } = await supabase.from('chat_participants').select('chat_id').eq('user_id', user.id);
            const chatIds = (participations || []).map(p => p.chat_id);
            const { data: chatsData } = await supabase.from('chats').select('*').in('id', chatIds);
            
            (chatsData || []).forEach(chat => {
                let key = '';
                if (chat.type === 'order' && chat.context_id) key = `order_${chat.context_id}`;
                if (key) {
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(chat);
                }
            });

            const idsToHide = [];
            Object.values(groups).forEach(group => {
                if (group.length > 1) {
                    const sorted = [...group].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
                    idsToHide.push(...sorted.slice(1).map(c => c.id));
                }
            });

            if (idsToHide.length > 0) {
                setHiddenChats(prev => [...new Set([...prev, ...idsToHide])]);
                await loadChats();
                return idsToHide.length;
            }
            return 0;
        } catch (error) {
            console.error("[ChatContext] Error in purge:", error);
            return 0;
        } finally {
            setIsCleaning(false);
        }
    }, [user?.id, isCleaning, loadChats]);

    const markMessagesAsRead = useCallback(async (chatId) => {
        if (!user?.id) return;
        try {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('chat_id', chatId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);
        } catch (error) {
            console.error("[ChatContext] Error marking as read:", error);
        }
    }, [user?.id]);

    const markMessagesAsDelivered = useCallback(async (chatId) => {
        if (!user?.id) return;
        try {
            await supabase
                .from('messages')
                .update({ delivered_at: new Date().toISOString() })
                .eq('chat_id', chatId)
                .eq('receiver_id', user.id)
                .is('delivered_at', null);
        } catch (error) {
            console.error("[ChatContext] Error marking as delivered:", error);
        }
    }, [user?.id]);

    const value = React.useMemo(() => ({
        chats,
        createChat,
        toggleChatBlock,
        deleteChat,
        purgeDuplicateChats,
        isCleaning,
        sendMessage,
        fetchMessages,
        markMessagesAsRead,
        markMessagesAsDelivered,
        getChatById: (chatId) => chats.find(c => c.id === chatId),
        getUserChats: () => chats,
        loadChats
    }), [
        chats,
        createChat,
        toggleChatBlock,
        deleteChat,
        purgeDuplicateChats,
        isCleaning,
        sendMessage,
        fetchMessages,
        markMessagesAsRead,
        markMessagesAsDelivered,
        loadChats
    ]);

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatProvider;
