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

            setChats(enrichedChats);
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
                // Si hay un contexto (Pedido, Propuesta, Proyecto), es la clave única definitiva.
                // Buscamos cualquier chat con ese context_id, sin importar el tipo exacto (robustez).
                const { data: existingChats } = await supabase
                    .from('chats')
                    .select('id, type')
                    .eq('context_id', normalizedContextId)
                    .order('created_at', { ascending: false });
                
                if (existingChats && existingChats.length > 0) {
                    // Si encontramos uno que coincida con el tipo pedido, lo priorizamos
                    const perfectMatch = existingChats.find(c => c.type === type);
                    targetChatId = perfectMatch ? perfectMatch.id : existingChats[0].id;
                    console.log(`[ChatContext] Encontrado chat existente para contexto ${normalizedContextId}:`, targetChatId);
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

            // 2. SI EL CHAT EXISTE, ASEGURAR QUE EL USUARIO ACTUAL ES PARTICIPANTE (RE-UNIÓN)
            if (targetChatId) {
                const { data: participation } = await supabase
                    .from('chat_participants')
                    .select('id')
                    .eq('chat_id', targetChatId)
                    .eq('user_id', user.id)
                    .maybeSingle();
                
                if (!participation) {
                    console.log("[ChatContext] El chat existe pero el usuario no es participante. Re-uniendo...");
                    await supabase
                        .from('chat_participants')
                        .insert({ chat_id: targetChatId, user_id: user.id });
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

    const sendMessage = async (chatId, text, attachments = [], options = {}) => {
        if (!user && !options.isSystem) throw new Error("Debe estar autenticado");

        try {
            // Determinar el receiver_id (ID del otro participante)
            let receiverId = options.receiverId;

            if (!receiverId) {
                // Intentar encontrarlo en el estado local
                const chat = chats.find(c => c.id === chatId);
                if (chat && chat.participants) {
                    const other = chat.participants.find(p => p.id !== user?.id);
                    receiverId = other ? other.id : null;
                }

                // Búsqueda exhaustiva en la base de datos si no está en el estado local
                if (!receiverId) {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select('user_id')
                        .eq('chat_id', chatId);
                    
                    const other = participants?.find(p => p.user_id !== user?.id);
                    if (other) receiverId = other.user_id;
                }
            }

            if (!receiverId && !options.isSystem) {
                console.warn("[ChatContext] No se pudo determinar el receptor del mensaje.");
            }

            // Sanitización contra inyección/XSS antes de guardar a DB
            const cleanText = text ? sanitizeText(text) : text;

            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    chat_id: chatId,
                    sender_id: options.isSystem ? null : user.id,
                    sender_name: options.senderName || (options.isSystem ? 'Sistema' : (user.username || user.first_name || 'Usuario')),
                    receiver_id: receiverId, // Campo obligatorio crítico
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

        try {
            // Solo eliminamos nuestra participación, no el chat completo para todos
            const { error } = await supabase
                .from('chat_participants')
                .delete()
                .eq('chat_id', chatId)
                .eq('user_id', user.id);

            if (error) throw error;

            setChats(prev => prev.filter(c => c.id !== chatId));
            return true;
        } catch (error) {
            console.error("[ChatContext] Error deleting chat participation:", error);
            return false;
        }
    };

    const purgeDuplicateChats = async () => {
        if (!user || isCleaning) return 0;
        setIsCleaning(true);
        console.log("[ChatContext] Iniciando purga masiva...");

        // Seguridad: Si en 15s no ha terminado, desbloquear el botón pase lo que pase
        const safetyTimeout = setTimeout(() => {
            if (isCleaning) {
                console.warn("[ChatContext] La purga ha excedido el tiempo de seguridad. Desbloqueando...");
                setIsCleaning(false);
            }
        }, 15000);

        try {
            // 1. Agrupar chats por contexto y tipo
            const groups = {};
            chats.forEach(chat => {
                let key = '';
                if (chat.type === 'order' && chat.context_id) {
                    key = `order_${chat.context_id}`;
                } else if (chat.type === 'direct') {
                    const other = chat.participants.find(p => p.id !== user.id);
                    if (other) key = `direct_${other.id}`;
                }

                if (key) {
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(chat);
                }
            });

            // 2. Identificar víctimas (duplicados obsoletos)
            const idsToDelete = [];
            Object.keys(groups).forEach(key => {
                const group = groups[key];
                if (group.length > 1) {
                    // Ordenar: Priorizamos chats con mensajes reales, luego por fecha más reciente
                    const sorted = [...group].sort((a, b) => {
                        const aHasMsg = a.last_message && a.last_message !== 'Nueva conversación';
                        const bHasMsg = b.last_message && b.last_message !== 'Nueva conversación';
                        
                        if (aHasMsg !== bHasMsg) return bHasMsg ? 1 : -1;
                        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
                    });
                    
                    // Mantener el 1ero, borrar el resto
                    const victims = sorted.slice(1).map(c => c.id);
                    idsToDelete.push(...victims);
                }
            });

            // PLUS: Purga agresiva por NOMBRE (Para los que no tienen context_id pero se llaman igual y están vacíos)
            const emptyByName = {};
            chats.forEach(chat => {
                if (!chat.context_id && chat.last_message === 'Nueva conversación') {
                    if (!emptyByName[chat.displayName]) emptyByName[chat.displayName] = [];
                    emptyByName[chat.displayName].push(chat);
                }
            });

            Object.values(emptyByName).forEach(list => {
                if (list.length > 1) {
                    const sorted = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    idsToDelete.push(...sorted.slice(1).map(c => c.id));
                }
            });

            const uniqueIdsToDelete = [...new Set(idsToDelete)];

            if (uniqueIdsToDelete.length === 0) {
                console.log("[ChatContext] No hay duplicados para limpiar.");
                return 0;
            }

            console.log(`[ChatContext] Eliminando participación en ${uniqueIdsToDelete.length} chats...`);

            // 3. Ejecutar borrado masivo
            const { error: deleteError } = await supabase
                .from('chat_participants')
                .delete()
                .in('chat_id', uniqueIdsToDelete)
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // 4. Pequeña espera para que DB procese
            await new Promise(r => setTimeout(r, 500));

            // 5. Recargar estado
            await loadChats();
            console.log(`[ChatContext] Éxito: Se han limpiado ${uniqueIdsToDelete.length} duplicados.`);
            clearTimeout(safetyTimeout);
            return uniqueIdsToDelete.length;

        } catch (error) {
            console.error("[ChatContext] Error crítico en la purga:", error);
            throw error;
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
