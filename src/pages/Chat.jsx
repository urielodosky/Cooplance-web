import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useJobs } from '../context/JobContext';
import { supabase } from '../lib/supabase';
import { useTeams } from '../context/TeamContext'; // Import TeamContext
import ReportModal from '../components/common/ReportModal';
import { getProfilePicture } from '../utils/avatarUtils';
import '../styles/pages/Chat.scss';
import { createThrottler } from '../utils/security';

const chatThrottler = createThrottler(1500);

const Chat = () => {
    const { chatId } = useParams();
    const { user, isTutorView } = useAuth();
    const { getUserChats, getChatById, sendMessage, toggleChatBlock, deleteChat, fetchMessages, purgeDuplicateChats, isCleaning } = useChat();
    const { jobs, extendJobDeadline, updateJobStatus } = useJobs();
    const navigate = useNavigate();

    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [filterTab, setFilterTab] = useState('general'); // 'general', 'companies', 'clients', 'coops'
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [extensionDays, setExtensionDays] = useState('2');
    const [contextDeadline, setContextDeadline] = useState(null);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [purgeResult, setPurgeResult] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // FETCH CONTEXT DEADLINE (Project or Job)
    useEffect(() => {
        if (!activeChat || (!activeChat.context_id && !activeChat.contextId)) {
            setContextDeadline(null);
            return;
        }

        const cid = activeChat.context_id || activeChat.contextId;

        const fetchDeadline = async () => {
            // 1. Try to find in loaded jobs first
            const job = jobs.find(j => String(j.id) === String(cid) || String(j.projectId) === String(cid));

            if (job && job.deadline) {
                setContextDeadline(job.deadline);
                return;
            }

            // 2. Fallback: Fetch directly from projects table if it's a project context
            if (activeChat.type === 'project' || activeChat.type === 'order' || cid) {
                try {
                    const { data, error } = await supabase
                        .from('projects')
                        .select('deadline')
                        .eq('id', cid)
                        .maybeSingle();

                    if (data && data.deadline) {
                        setContextDeadline(data.deadline);
                    } else {
                        setContextDeadline(null);
                    }
                } catch (err) {
                    console.error("[Chat] Error fetching project deadline:", err);
                    setContextDeadline(null);
                }
            }
        };

        fetchDeadline();
    }, [activeChat, jobs]);

    // --- MERGE CHATS LOGIC ---
    const userChats = getUserChats();
    const allChats = [...userChats].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    // Filter based on Tab
    const filteredChats = allChats.filter(chat => {
        if (filterTab === 'general') return true;
        if (filterTab === 'companies') return ['order', 'project'].includes(chat.type);
        if (filterTab === 'clients') return ['direct'].includes(chat.type); // Only Direct messages
        if (filterTab === 'coops') return ['coop_client'].includes(chat.type); // Only Coop-Client messages
        return true;
    });

    useEffect(() => {
        if (!chatId) {
            setActiveChat(null);
            if (filteredChats.length > 0) navigate(`/chat/${filteredChats[0].id}`);
            return;
        }

        const chat = getChatById(chatId);
        if (chat) {
            setActiveChat(chat);
        } else {
            setActiveChat(null);
            navigate('/chat');
        }
    }, [chatId, userChats, filterTab, getChatById, navigate]);

    // FETCH MESSAGES & SUBSCRIBE
    useEffect(() => {
        if (!chatId) return;

        const load = async () => {
            setIsLoadingMessages(true);
            const msgs = await fetchMessages(chatId);
            setMessages(msgs);
            setIsLoadingMessages(false);
        };
        load();

        const channel = supabase
            .channel(`chat:${chatId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${chatId}`
            }, (payload) => {
                setMessages(prev => {
                    const exists = prev.find(m =>
                        (m.id === payload.new.id) ||
                        (m.isOptimistic && m.text === payload.new.content && String(m.senderId) === String(payload.new.sender_id))
                    );
                    if (exists) {
                        return prev.map(m => (m.isOptimistic && m.text === payload.new.content) ? {
                            id: payload.new.id,
                            senderId: payload.new.sender_id,
                            senderName: payload.new.sender_name,
                            text: payload.new.content,
                            attachments: payload.new.attachments || [],
                            timestamp: payload.new.created_at,
                            isSystem: payload.new.is_system
                        } : m);
                    }
                    return [...prev, {
                        id: payload.new.id,
                        senderId: payload.new.sender_id,
                        senderName: payload.new.sender_name,
                        text: payload.new.content,
                        attachments: payload.new.attachments || [],
                        timestamp: payload.new.created_at,
                        isSystem: payload.new.is_system
                    }];
                });
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [chatId, fetchMessages]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // AUTO-PURGE on load if too many duplicates
    useEffect(() => {
        if (allChats.length > 15 && !isCleaning) {
            console.log("[Chat] Detectados demasiados chats, lanzando auto-purga...");
            purgeDuplicateChats();
        }
    }, [allChats.length]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (isTutorView) {
            alert("Acción bloqueada en modo lectura.");
            return;
        }
        if (!activeChat || !messageInput.trim()) return;

        if (!chatThrottler()) {
            console.warn("Throttling activado: Evitando spam de mensajes.");
            return;
        }

        const text = messageInput.trim();
        setMessageInput('');

        // UI Optimista: Añadir el mensaje localmente al instante
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            chatId: activeChat.id,
            senderId: user.id,
            senderName: user.username || user.first_name || 'Tú',
            text: text,
            timestamp: new Date().toISOString(),
            isOptimistic: true
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            await sendMessage(activeChat.id, text);
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            alert("No se pudo enviar el mensaje. Inténtalo de nuevo.");
        }
    };

    // Helper to calculate time remaining
    const getJobTimeRemaining = (chat) => {
        const cid = chat?.context_id || chat?.contextId;
        if (!chat || !cid) return null;

        // Prioritize the reactive contextDeadline state
        let deadline = contextDeadline;

        // If contextDeadline is not set, try a quick look in jobs for fallback
        if (!deadline) {
            const job = jobs.find(j => String(j.id) === String(chat.contextId) || String(j.projectId) === String(chat.contextId));
            if (job) {
                if (job.status === 'completed') return 'Completado';
                deadline = job.deadline;
            }
        }

        if (!deadline) return 'Sin plazo';

        const deadlineDate = new Date(deadline);
        const now = new Date();
        const diffMs = deadlineDate.getTime() - now.getTime();

        if (diffMs <= 0) return 'Vencido';

        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else {
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to JPEG 60%
                };
            };
        });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (isTutorView) {
            alert("No puedes enviar archivos en modo lectura.");
            return;
        }
        if (!file || !activeChat || activeChat.status === 'blocked') return;

        if (file.type.startsWith('video')) {
            alert("Los videos son muy pesados para guardarlos en esta demo. Se enviará, pero podría no persistir si es muy grande.");
            // Videos are risky in localStorage. Keep original logic but warn.
            const reader = new FileReader();
            reader.onloadend = () => {
                const videoPayload = { type: 'video', url: reader.result };
                if (activeChat.isTeam) {
                    sendTeamMessage(activeChat.teamId, '', videoPayload, activeChat.channel);
                } else {
                    sendMessage(activeChat.id, '', [videoPayload]);
                }
            };
            reader.readAsDataURL(file);
        } else {
            try {
                const compressedUrl = await compressImage(file);
                const attachmentPayload = { type: 'image', url: compressedUrl };

                if (activeChat.isTeam) {
                    sendTeamMessage(activeChat.teamId, '', attachmentPayload, activeChat.channel);
                } else {
                    sendMessage(activeChat.id, '', [attachmentPayload]);
                }
            } catch (error) {
                console.error("Error compressing image:", error);
                alert("Error al procesar la imagen");
            }
        }

        e.target.value = null; // Reset input
    };

    // ... helper unchanged ...
    const getChatName = (chat) => {
        if (!chat) return 'Chat';
        return chat.displayName || chat.context_title || 'Conversación';
    };

    const getOtherUserVacation = (chat) => {
        // ... (This would now need a join on profiles table to be accurate)
        return false;
    };

    if (!user) return <div className="container" style={{ padding: '4rem' }}>Inicia sesión para ver tus mensajes.</div>;

    // Sidebar interaction
    const handleChatSelect = (id) => {
        navigate('/chat/' + id);
    };

    // Handle delete action
    const handleDelete = async (chatId) => {
        if (window.confirm("¿Estás seguro de que quieres borrar esta conversación? Se eliminarán todos los mensajes de forma permanente.")) {
            const success = await deleteChat(chatId);
            if (success) {
                setActiveMenuId(null);
                if (chatId === activeChat?.id) {
                    navigate('/chat');
                }
            }
        }
    };

    const handlePurge = async () => {
        if (isCleaning) return;
        try {
            const count = await purgeDuplicateChats();
            setPurgeResult(count);
            setTimeout(() => setPurgeResult(null), 3000);
        } catch (error) {
            console.error("Error en la purga:", error);
        }
    };

    // Expired Jobs Logic
    const cid = activeChat?.context_id || activeChat?.contextId;
    const activeJob = activeChat?.type === 'order' && cid ? jobs.find(j => j.id === parseInt(cid) || j.id === cid) : null;
    const isJobExpired = getJobTimeRemaining(activeChat) === 'Vencido';
    const isClient = activeJob && activeJob.buyerId === user.id;

    const handleExtendDeadline = (days) => {
        if (!activeJob) return;

        // 1. Extend the job via context
        extendJobDeadline(activeJob.id, days);

        // 2. Send the system message notifying the extension
        sendMessage(activeChat.id, `🔄 El cliente ha extendido el plazo de entrega por ${days} días.`, [], { isSystem: true });
    };

    const handleCancelJob = () => {
        if (!activeJob) return;
        if (isTutorView) {
            alert("Operación denegada en modo lectura.");
            return;
        }
        if (window.confirm("¿Estás seguro de cancelar este servicio? Esta acción no se puede deshacer y el pago será devuelto al monedero.")) {
            updateJobStatus(activeJob.id, 'canceled');
            sendMessage(activeChat.id, '❌ El servicio ha sido cancelado por expiración del plazo.', [], { isSystem: true });
        }
    };

    return (
        <div className="container" style={{
            height: 'calc(100vh - 95px)',
            paddingTop: '2rem',
            marginBottom: '-2rem', /* Eat into global padding to avoid scroll */
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch' /* Anchor to top (respecting padding) and stretch down */
        }}>
            <div className="chat-layout glass" style={{ height: '100%', width: '100%' }}>
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <div className="sidebar-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Mensajes</h2>
                            <button
                                className="btn-sweep"
                                onClick={handlePurge}
                                disabled={isCleaning}
                                title="Limpiar chats duplicados"
                                style={{
                                    background: purgeResult !== null ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.1)',
                                    border: `1px solid ${purgeResult !== null ? '#22c55e' : 'var(--primary)'}`,
                                    borderRadius: '8px',
                                    color: purgeResult !== null ? '#22c55e' : 'var(--primary)',
                                    padding: '0.4rem 0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.3s ease',
                                    opacity: isCleaning ? 0.5 : 1,
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12h18"></path>
                                    <path d="M3 6h18"></path>
                                    <path d="M3 18h18"></path>
                                </svg>
                                {isCleaning ? 'Limpiando...' : purgeResult !== null ? `¡Limpio! (${purgeResult})` : 'Limpiar'}
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="chat-filters">
                        {[
                            { id: 'general', label: 'General' },
                            { id: 'companies', label: 'Empresas' },
                            { id: 'clients', label: 'Clientes' },
                            { id: 'coops', label: 'Coops' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterTab(tab.id)}
                                className={`chat-filter-btn ${filterTab === tab.id ? 'active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="chat-list">
                        {filteredChats.length === 0 ? (
                            <p className="no-chats">No hay chats en esta sección.</p>
                        ) : (
                            filteredChats.map(chat => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                                    onClick={() => handleChatSelect(chat.id)}
                                    style={{ position: 'relative', opacity: chat.status === 'blocked' ? 0.6 : 1 }}
                                >
                                    <div className="chat-avatar-placeholder" style={{
                                        background: chat.status === 'blocked' ? '#64748b' : 'var(--gradient-primary)',
                                        padding: 0, overflow: 'hidden'
                                    }}>
                                        {(() => {
                                            // 1. Regular participant check
                                            let other = chat.participants?.find(p => p.id !== user.id);
                                            
                                            // 2. Context fallback for sidebar
                                            const cid = chat.context_id || chat.contextId;
                                            if (!other && cid) {
                                                const job = jobs.find(j => 
                                                    String(j.id) === String(cid) || 
                                                    String(j.projectId) === String(cid) ||
                                                    (j.chat_id && String(j.chat_id) === String(chat.id))
                                                );
                                                if (job) {
                                                    const isIClient = String(job.client_id || job.buyer_id) === String(user.id);
                                                    other = {
                                                        avatar: isIClient ? (job.provider_avatar || job.freelancer_avatar) : (job.client_avatar || job.buyer_avatar),
                                                        username: isIClient ? (job.provider_username || job.freelancer_username) : (job.client_username || job.buyer_username)
                                                    };
                                                }
                                            }

                                            if (other?.avatar) return <img src={other.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                            return (other?.username || getChatName(chat)).charAt(0).toUpperCase();
                                        })()}
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-name-row" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div className="chat-main-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                                {getChatName(chat)}
                                                {chat.status === 'blocked' && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '900' }}>[BLOQUEADO]</span>}
                                            </div>
                                            {(() => {
                                                let other = chat.participants?.find(p => p.id !== user.id);
                                                
                                                // Sidebar Name Fallback
                                                const cid = chat.context_id || chat.contextId;
                                                if (!other && cid) {
                                                    const job = jobs.find(j => 
                                                        String(j.id) === String(cid) || 
                                                        String(j.projectId) === String(cid)
                                                    );
                                                    if (job) {
                                                        const isIClient = String(job.client_id || job.buyer_id) === String(user.id);
                                                        other = {
                                                            username: isIClient ? (job.provider_username || job.freelancer_username) : (job.client_username || job.buyer_username),
                                                            fullName: isIClient ? (job.provider_name || job.freelancer_name) : (job.client_name || job.buyer_name)
                                                        };
                                                    }
                                                }

                                                if (!other) return null;
                                                return (
                                                    <div className="chat-sub-name" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                        @{other.username || 'usuario'} {other.fullName && <span style={{ opacity: 0.7 }}>({other.fullName})</span>}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="chat-preview" style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {chat.status === 'blocked' ? <i>Chat bloqueado</i> : (chat.last_message || 'Nueva conversación')}
                                        </div>
                                    </div>

                                    {/* Three Dots Button */}
                                    <button
                                        className="btn-chat-options"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                                        }}
                                    >
                                        ⋮
                                    </button>

                                    {/* Context Menu Dropdown */}
                                    {activeMenuId === chat.id && (
                                        <div className="chat-context-menu" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => alert("Chat Anclado (Simulado)")}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                Anclar
                                            </button>
                                            <button onClick={() => setIsReportModalOpen(true)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                                Reportar
                                            </button>
                                            <button onClick={() => handleBlock(chat.id)} style={{ color: chat.status === 'blocked' ? '#22c55e' : '#ef4444' }}>
                                                {chat.status === 'blocked' ? (
                                                    <>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        Desbloquear
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                                        Bloquear
                                                    </>
                                                )}
                                            </button>
                                            <hr style={{ margin: '4px 0', borderColor: 'var(--border)', opacity: 0.2 }} />
                                            <button onClick={() => handleDelete(chat.id)} style={{ color: '#ef4444' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                Borrar chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="chat-main">
                    {activeChat ? (
                        <>
                            <div className="chat-window-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {(() => {
                                        // 1. Try to find the other participant in the active participants list
                                        let other = activeChat.participants?.find(p => String(p.id) !== String(user.id));

                                        // 2. FALLBACK: If the other person deleted the chat or purged it, they are gone from participants.
                                        // We look for them in the associated JOB or PROJECT context.
                                        if (!other && activeChat.contextId) {
                                            // Check in loaded jobs
                                            const contextJob = jobs.find(j => 
                                                String(j.id) === String(activeChat.contextId) || 
                                                String(j.projectId) === String(activeChat.contextId) ||
                                                (j.chat_id && String(j.chat_id) === String(activeChat.id))
                                            );

                                            if (contextJob) {
                                                const isIClient = String(contextJob.client_id || contextJob.buyer_id) === String(user.id);
                                                other = {
                                                    id: isIClient ? (contextJob.provider_id || contextJob.freelancer_id) : (contextJob.client_id || contextJob.buyer_id),
                                                    username: isIClient ? (contextJob.provider_username || contextJob.freelancer_username) : (contextJob.client_username || contextJob.buyer_username),
                                                    fullName: isIClient ? (contextJob.provider_name || contextJob.freelancer_name) : (contextJob.client_name || contextJob.buyer_name),
                                                    avatar: isIClient ? (contextJob.provider_avatar || contextJob.freelancer_avatar) : (contextJob.client_avatar || contextJob.buyer_avatar),
                                                    role: isIClient ? 'freelancer' : 'client'
                                                };
                                            }
                                        }

                                        return (
                                            <>
                                                <div className="header-avatar" style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    border: '2px solid var(--primary)',
                                                    background: 'var(--gradient-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                }}>
                                                    {other?.avatar ? (
                                                        <img src={other.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        (activeChat.displayName || activeChat.context_title || 'C').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <h3
                                                        style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', cursor: activeChat.contextId ? 'pointer' : 'default', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                        className="chat-header-title-link"
                                                        onClick={() => {
                                                            if (activeChat.contextId) {
                                                                const isService = activeChat.type === 'service';
                                                                navigate(isService ? `/service/${activeChat.contextId}` : `/project/${activeChat.contextId}`);
                                                            }
                                                        }}
                                                    >
                                                        {activeChat.displayName || activeChat.context_title}
                                                        {activeChat.status === 'blocked' && <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>BLOQUEADO</span>}
                                                    </h3>
                                                    {other && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span
                                                                style={{ fontWeight: '700', color: 'var(--primary-soft)', cursor: 'pointer', textDecoration: 'underline' }}
                                                                className="chat-header-user-link"
                                                                onClick={() => {
                                                                    const role = other.role || (activeChat.type === 'order' ? 'client' : 'freelancer');
                                                                    if (role === 'company') navigate(`/company/${other.id}`);
                                                                    else if (role === 'freelancer') navigate(`/freelancer/${other.id}`);
                                                                    else navigate(`/client/${other.id}`);
                                                                }}
                                                            >
                                                                @{other.username || other.id}
                                                            </span>
                                                            {(other.fullName || other.first_name) && <span style={{ opacity: 0.8, fontWeight: '500' }}>• {other.fullName || `${other.first_name || ''} ${other.last_name || ''}`}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {(activeChat.type === 'order' || activeChat.type === 'project' || activeChat.context_id || activeChat.contextId) && (
                                        <div
                                            className={`badge-order ${getJobTimeRemaining(activeChat) === 'Vencido' ? 'expired' : ''}`}
                                            style={{
                                                background: getJobTimeRemaining(activeChat) === 'Vencido' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                                color: getJobTimeRemaining(activeChat) === 'Vencido' ? '#ef4444' : 'var(--primary)',
                                                padding: '0.6rem 1rem',
                                                borderRadius: '12px',
                                                fontSize: '0.9rem',
                                                fontWeight: '800',
                                                border: '1.5px solid currentColor',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            {getJobTimeRemaining(activeChat) || 'Sin plazo'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {activeChat.status === 'pre_contract' && (
                                <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.75rem', textAlign: 'center', color: '#0284c7', fontSize: '0.9rem', fontWeight: '500' }}>
                                    Chat de Consulta (Pre-Contrato). Mensajes restantes: <strong>{Math.max(0, 25 - messages.length)}/25</strong>
                                </div>
                            )}

                            <div className="messages-container">
                                {isLoadingMessages ? (
                                    <div className="skeleton-messages">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`skeleton-bubble ${i % 2 === 0 ? 'mine' : 'theirs'}`} />
                                        ))}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="empty-messages">
                                        <p>¡Este es el comienzo de tu historial de mensajes!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isMe = String(msg.senderId) === String(user.id);
                                        const msgDate = new Date(msg.timestamp);
                                        const prevMsg = messages[index - 1];
                                        const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;

                                        const showDateDivider = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDateDivider && (
                                                    <div className="date-divider">
                                                        <span>{msgDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}</span>
                                                    </div>
                                                )}

                                                {msg.isSystem ? (
                                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.25rem 0', margin: '0.25rem auto', width: '100%' }}>
                                                        {msg.text.replace('🔄 ', '')}
                                                    </div>
                                                ) : (
                                                    <div className={`message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="message-media">
                                                                {msg.attachments.map((att, idx) => (
                                                                    att.type === 'image' ? (
                                                                        <img
                                                                            key={idx}
                                                                            src={att.url}
                                                                            alt="attachment"
                                                                            className="chat-media-img clickable"
                                                                            onClick={() => setSelectedMedia({ type: 'image', url: att.url })}
                                                                        />
                                                                    ) : (
                                                                        <video
                                                                            key={idx}
                                                                            src={att.url}
                                                                            className="chat-media-video clickable"
                                                                            onClick={() => setSelectedMedia({ type: 'video', url: att.url })}
                                                                        />
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                        {msg.text && <span className="message-text">{msg.text}</span>}
                                                        <span className="message-time">
                                                            {msgDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        )
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Media Modal - rendered via Portal to bypass .glass backdrop-filter */}
                            {selectedMedia && ReactDOM.createPortal(
                                <div className="media-modal-overlay" onClick={() => setSelectedMedia(null)}>
                                    <button
                                        onClick={() => setSelectedMedia(null)}
                                        style={{
                                            position: 'fixed',
                                            top: '1.5rem',
                                            right: '1.5rem',
                                            zIndex: 1002,
                                            background: 'rgba(255,255,255,0.15)',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                    <div className="media-modal-content" onClick={e => e.stopPropagation()}>
                                        {selectedMedia.type === 'image' ? (
                                            <img src={selectedMedia.url} alt="Full view" className="media-modal-image" />
                                        ) : (
                                            <video src={selectedMedia.url} controls autoPlay className="media-modal-video" />
                                        )}
                                    </div>
                                </div>,
                                document.body
                            )}

                            {/* Extension Modal */}
                            {showExtensionModal && (
                                <div className="media-modal-overlay" onClick={() => setShowExtensionModal(false)} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                    <div className="media-modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', flexDirection: 'column' }}>
                                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', textAlign: 'center' }}>¿Cuántos días adicionales deseas agregar?</h3>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Ingresa un valor entre 1 y 7 días.</p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="7"
                                            value={extensionDays}
                                            onChange={(e) => setExtensionDays(e.target.value)}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', textAlign: 'center' }}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                            <button
                                                className="btn-primary"
                                                onClick={() => {
                                                    const days = parseInt(extensionDays, 10);
                                                    if (!isNaN(days) && days >= 1 && days <= 7) {
                                                        handleExtendDeadline(days);
                                                        setShowExtensionModal(false);
                                                    } else {
                                                        alert('Por favor ingresa un número válido de días entre 1 y 7.');
                                                    }
                                                }}
                                                style={{ padding: '0.6rem 2rem', borderRadius: '12px' }}
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => setShowExtensionModal(false)}
                                                style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', background: 'var(--bg-body)', border: 'none', color: 'var(--text-primary)', fontWeight: '500' }}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeChat.status === 'blocked' ? (
                                <div className="message-input-area" style={{ justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)' }}>
                                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Has bloqueado esta conversación.</p>
                                </div>
                            ) : activeChat.status === 'pre_contract' && (25 - messages.length) <= 0 ? (
                                <div className="message-input-area" style={{ flexDirection: 'column', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderTop: '1px solid var(--border)' }}>
                                    <p style={{ color: '#d97706', fontWeight: 'bold', margin: '0 0 5px 0', textAlign: 'center' }}>
                                        Límite de mensajes de consulta alcanzado
                                    </p>
                                    <div style={{ textAlign: 'center', width: '100%', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Para continuar conversando y habilitar el envío de archivos adjuntos, el Cliente debe Aceptar la postulación en la vista del Proyecto.
                                    </div>
                                </div>
                            ) : activeJob && activeJob.status === 'canceled' ? (
                                <div className="message-input-area" style={{ justifyContent: 'center', background: 'rgba(239, 68, 68, 0.05)', borderTop: '1px solid var(--border)' }}>
                                    <p style={{ color: '#ef4444', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                        Este servicio fue cancelado
                                    </p>
                                </div>
                            ) : activeJob && activeJob.status === 'completed' ? (
                                <div className="message-input-area" style={{ justifyContent: 'center', background: 'rgba(16, 185, 129, 0.05)', borderTop: '1px solid var(--border)' }}>
                                    <p style={{ color: '#10b981', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        Este servicio fue completado
                                    </p>
                                </div>
                            ) : isJobExpired ? (
                                <div className="message-input-area" style={{ flexDirection: 'column', gap: '1rem', background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ textAlign: 'center', width: '100%', color: 'var(--text-secondary)', fontWeight: '500', padding: '0.5rem' }}>
                                        El plazo de entrega ha vencido. No se pueden enviar mensajes.
                                    </div>
                                    {isClient && (
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                                            <button
                                                onClick={() => setShowExtensionModal(true)}
                                                className="btn-solid"
                                                style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: '#ffffff', fontWeight: '500' }}
                                            >
                                                Agregar plazo de días
                                            </button>
                                            <button
                                                onClick={handleCancelJob}
                                                className="btn-danger"
                                                style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#ffffff' }}
                                            >
                                                Cancelar Servicio
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form className="message-input-area" onSubmit={handleSendMessage}>
                                    {activeChat.status !== 'pre_contract' && (
                                        <>
                                            <button
                                                type="button"
                                                className="btn-attach"
                                                onClick={() => document.getElementById('chat-file-input').click()}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                                </svg>
                                            </button>
                                            <input
                                                type="file"
                                                id="chat-file-input"
                                                style={{ display: 'none' }}
                                                accept="image/*,video/*"
                                                onChange={handleFileSelect}
                                            />
                                        </>
                                    )}
                                    <input
                                        type="text"
                                        placeholder={activeChat.status === 'pre_contract' ? `Escribe un mensaje de consulta (${Math.max(0, 25 - messages.length)} restantes)...` : "Escribe un mensaje..."}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="chat-input"
                                        autoFocus
                                    />
                                    <button type="submit" className="btn-send">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <p>Selecciona una conversación para comenzar a chatear.</p>
                        </div>
                    )}
                </div>
            </div>

            {activeChat && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    itemId={activeChat.id}
                    itemType="chat"
                    itemName={getChatName(activeChat)}
                />
            )}
        </div >
    );
};

export default Chat;
