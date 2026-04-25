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

    const loadChats = async () => {
        if (!user) return;
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
                    user:user_id(username, first_name, last_name, avatar_url)
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
                        avatar: p.user?.avatar_url
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
    };

    const createChat = async (participantIds, type = 'direct', contextId = null, contextTitle = null, options = {}) => {
        if (!user) throw new Error("Debe estar autenticado");

        const normalizedContextId = contextId?.toString();
        
        try {
            console.log(`[ChatContext] Iniciando búsqueda/creación de chat. Tipo: ${type}, ContextID: ${normalizedContextId}`);
            
            // 1. BUSCAR CHAT EXISTENTE GLOBALMENTE EN LA BASE DE DATOS
            let targetChatId = null;

            if (normalizedContextId) {
                // AGGRESSIVE SEARCH: If there's a contextId, we MUST find any existing chat for it
                // We don't care about the type here, because one context (Project/Order) should only have ONE chat.
                const { data: existingChats } = await supabase
                    .from('chats')
                    .select('id, type')
                    .eq('context_id', normalizedContextId);
                
                if (existingChats && existingChats.length > 0) {
                    // We found at least one. We take the one that is NOT empty if possible.
                    // But for now, just taking the first one found is enough to prevent duplicates.
                    targetChatId = existingChats[0].id;
                    console.log(`[ChatContext] Found existing chat for context ${normalizedContextId}:`, targetChatId);
                }
            } 
            
            // Si no encontramos por contexto o es un chat directo, buscamos por participantes
            if (!targetChatId && type === 'direct') {
                const otherId = participantIds.find(id => id !== user.id);
                if (otherId) {
                    // Buscamos chats de tipo direct donde ambos participemos
                    const { data: commonPart } = await supabase
                        .rpc('get_common_chats', { user_a: user.id, user_b: otherId });
                    
                    if (commonPart && commonPart.length > 0) {
                        // Verificamos cuál de esos es 'direct'
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

            // 2. SI EL CHAT EXISTE, ASEGURAR QUE TODOS LOS PARTICIPANTES ESTÁN DENTRO (RE-UNIÓN)
            if (targetChatId) {
                console.log("[ChatContext] El chat ya existe. Verificando participantes...");
                
                // Obtenemos participantes actuales en DB
                const { data: currentParticipants } = await supabase
                    .from('chat_participants')
                    .select('user_id')
                    .eq('chat_id', targetChatId);
                
                const existingUserIds = (currentParticipants || []).map(p => String(p.user_id));
                const missingParticipants = participantIds.filter(pid => !existingUserIds.includes(String(pid)));

                if (missingParticipants.length > 0) {
                    console.log("[ChatContext] Re-uniendo participantes faltantes:", missingParticipants);
                    const joinData = missingParticipants.map(pid => ({
                        chat_id: targetChatId,
                        user_id: pid
                    }));
                    await supabase.from('chat_participants').insert(joinData);
                }

                // Recargar si no está en el estado local
                if (!chats.some(c => c.id === targetChatId)) {
                    await loadChats();
                }
                return targetChatId;
            }

            // 3. SI NO EXISTE, ENTONCES SÍ CREAR UNO TOTALMENTE NUEVO
            console.log("[ChatContext] No se encontró chat previo. Creando nuevo registro...");
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

            // 4. Añadir participantes iniciales
            const pData = participantIds.map(pid => ({
                chat_id: chat.id,
                user_id: pid
            }));

            const { error: pError } = await supabase
                .from('chat_participants')
                .insert(pData);

            if (pError) throw pError;

            // Actualizar estado local y devolver
            await loadChats();
            return chat.id;

        } catch (error) {
            console.error("[ChatContext] Error crítico en createChat:", error);
            throw error;
        }
    };

    // Cargar al montar o cambiar usuario
    useEffect(() => {
        loadChats().catch(err => console.error("[ChatContext] Unhandled loadChats error:", err));
    }, [user]);

    // Suscripción Global a Mensajes
    const toggleChatBlock = async (chatId) => {
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
    };

    const fetchMessages = async (chatId) => {
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
                isSystem: m.is_system
            }));
        } catch (error) {
            console.error("[ChatContext] Error al obtener mensajes:", error);
            return [];
        }
    };

    // Track last notification time per chat to avoid spam
    const [lastNotifMap, setLastNotifMap] = useState({});

    const sendMessage = async (chatId, text, attachments = [], options = {}) => {
        if (!user && !options.isSystem) throw new Error("Debe estar autenticado");

        try {
            // Determinar el receiver_id (ID del otro participante)
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

            // Sanitización contra inyección/XSS antes de guardar a DB
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

            // Actualizar el "último mensaje" en el chat
            await supabase
                .from('chats')
                .update({
                    last_message: cleanText || (attachments.length ? 'Archivo adjunto' : ''),
                    last_message_at: new Date().toISOString()
                })
                .eq('id', chatId);

            // --- NOTIFICATION LOGIC ---
            if (receiverId && !options.isSystem && cleanText) {
                const now = Date.now();
                const lastTime = lastNotifMap[chatId] || 0;
                
                // Anti-spam: Only notify if 15 seconds have passed since last one for this chat
                if (now - lastTime > 15000) {
                    const senderName = user.first_name || user.username || 'Un usuario';
                    const words = cleanText.split(' ').filter(w => w.length > 0);
                    const preview = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
                    
                    await NotificationService.createNotification(receiverId, {
                        type: 'new_message',
                        title: 'Nuevo mensaje',
                        message: `Tienes nuevos mensajes de ${senderName}.`,
                        link: `/chat/${chatId}`
                    });
                    
                    setLastNotifMap(prev => ({ ...prev, [chatId]: now }));
                }
            }

            // Registro de actividad gamificada
            if (user && !options.isSystem) {
                const updated = registerActivity(user);
                updateUser(updated).catch(e => console.warn('[ChatContext] Activity sync failed:', e));
            }

            return message;
        } catch (error) {
            console.error("[ChatContext] Error al enviar mensaje:", error);
            throw error;
        }
    };

    const deleteChat = async (chatId) => {
        if (!user) return;
        // SOFT DELETE: We just hide it for this user, but keep participation 
        // to avoid breaking metadata for the other participant.
        setHiddenChats(prev => [...new Set([...prev, chatId])]);
        setChats(prev => prev.filter(c => c.id !== chatId));
        return true;
    };

    const purgeDuplicateChats = async () => {
        if (!user || isCleaning) return 0;
        setIsCleaning(true);
        
        try {
            // Group chats logic
            const groups = {};
            
            // Re-fetch all to be sure
            const { data: participations } = await supabase.from('chat_participants').select('chat_id').eq('user_id', user.id);
            const chatIds = (participations || []).map(p => p.chat_id);
            const { data: chatsData } = await supabase.from('chats').select('*').in('id', chatIds);
            
            // Reconstruct groups
            (chatsData || []).forEach(chat => {
                let key = '';
                if (chat.type === 'order' && chat.context_id) key = `order_${chat.context_id}`;
                else if (chat.type === 'direct') {
                    // For direct chats we need the other participant... this is tricky without the full enrichment
                    // But we can skip direct purge here and focus on order/project ones which are the most common duplicates
                }
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
    };

    const getChatById = (chatId) => {
        return chats.find(c => c.id === chatId);
    };

    const getUserChats = () => {
        return chats;
    };

    return (
        <ChatContext.Provider value={{
            chats,
            createChat,
            toggleChatBlock,
            deleteChat,
            purgeDuplicateChats,
            isCleaning,
            sendMessage,
            fetchMessages,
            getChatById,
            getUserChats,
            loadChats
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatProvider;
