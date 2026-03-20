import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useJobs } from '../context/JobContext';
import { useTeams } from '../context/TeamContext'; // Import TeamContext
import '../styles/pages/Chat.scss';

const Chat = () => {
    const { chatId } = useParams();
    const { user } = useAuth();
    const { getUserChats, getChatById, sendMessage, toggleChatBlock } = useChat();
    const { jobs, extendJobDeadline, updateJobStatus } = useJobs();
    const { teams, canPerformAction, sendMessage: sendTeamMessage } = useTeams(); // Get teams and actions
    const navigate = useNavigate();

    const [activeChat, setActiveChat] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [filterTab, setFilterTab] = useState('general'); // 'general', 'companies', 'clients', 'coops'
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [extensionDays, setExtensionDays] = useState('2');
    const messagesEndRef = useRef(null);

    // --- MERGE CHATS LOGIC ---
    const userChats = getUserChats();

    const teamChats = teams.flatMap(team => {
        const chats = [];
        const isMember = team.members.some(m => m.userId === user?.id);

        // 1. Internal Chat (Coops) - REMOVED per user feedback (exclusive to Dashboard)

        // 2. Client Chat (Coops interacting with Clients)
        // Show if user has permission 'client_communication' OR is the client (simulation?)
        // For now, check permission or if user is owner/admin/service_manager
        if (isMember && canPerformAction(team.id, 'client_communication', user?.id)) {
            chats.push({
                id: `team_${team.id}_client`,
                name: `${team.name} (Cliente)`,
                contextTitle: "Comunicación Cliente",
                type: 'coop_client',
                messages: (team.messages || []).filter(m => m.type === 'client').map(m => ({
                    ...m,
                    id: m.id || `msg_${m.timestamp}`, // Ensure ID
                    senderId: m.userId,
                    senderName: m.username,
                    attachments: m.attachment ? [m.attachment] : [],
                    timestamp: m.timestamp
                })),
                status: 'active',
                lastMessage: (team.messages || []).filter(m => m.type === 'client').slice(-1)[0]?.text || "Inicio comunicación cliente",
                lastMessageAt: (team.messages || []).filter(m => m.type === 'client').slice(-1)[0]?.timestamp || team.createdAt,
                participants: team.members.map(m => m.userId), // Simplified
                isTeam: true,
                teamId: team.id,
                channel: 'client'
            });
        }
        return chats;
    });

    // Combine and Sort
    const allChats = [...userChats, ...teamChats].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    // Filter based on Tab
    const filteredChats = allChats.filter(chat => {
        if (filterTab === 'general') return true;
        if (filterTab === 'companies') return ['order', 'project'].includes(chat.type);
        if (filterTab === 'clients') return ['direct'].includes(chat.type); // Only Direct messages
        if (filterTab === 'coops') return ['coop_client'].includes(chat.type); // Only Coop-Client messages
        return true;
    });

    useEffect(() => {
        if (chatId) {
            // Check global chats
            let chat = getChatById(chatId);
            // Check team chats if not found
            if (!chat) {
                chat = teamChats.find(c => c.id === chatId);
            }

            if (chat) {
                setActiveChat(chat);
            }
        } else if (filteredChats.length > 0) {
            // Default to first chat if none selected
            navigate(`/chat/${filteredChats[0].id}`);
        }
    }, [chatId, userChats, teams, filterTab, getChatById, navigate, jobs]); // Depend on jobs too to force re-calc

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Auto-scroll (unchanged)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChat?.messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!activeChat || activeChat.status === 'blocked') return;
        if (!messageInput.trim()) return;

        if (activeChat.isTeam) {
            // Team Context Send
            // activeChat.teamId, text, attachment, type
            try {
                sendTeamMessage(activeChat.teamId, messageInput, null, activeChat.channel);
            } catch (err) {
                alert(err.message);
            }
        } else {
            // Chat Context Send
            sendMessage(activeChat.id, messageInput);
        }
        setMessageInput('');
    };

    // Helper to calculate time remaining
    const getJobTimeRemaining = (chat) => {
        if (!chat || chat.type !== 'order' || !chat.contextId) return null;

        const job = jobs.find(j => j.id === parseInt(chat.contextId) || j.id === chat.contextId); // robustness
        if (!job) return null;

        if (job.status === 'completed') return 'Completado';

        const deadline = new Date(job.deadline);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();

        if (diffMs <= 0) return 'Vencido';

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h restantes`;
        return `${hours}h restantes`;
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
    const getChatName = (chat) => { /* ... */ const myId = user.id || user.username; const otherId = chat.participants.find(p => p !== myId); return otherId || 'Chat'; };

    // Helper: check if the other participant in a chat is on vacation, return days left or false
    const getOtherUserVacation = (chat) => {
        try {
            if (chat.isTeam) return false;
            const myId = user.id || user.username;
            const otherId = chat.participants?.find(p => p !== myId);
            if (!otherId) return false;
            const allUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            const otherUser = allUsers.find(u => u.id == otherId);
            if (!otherUser?.gamification?.vacation?.active) return false;
            const daysLeft = Math.max(0, 15 - Math.floor((Date.now() - otherUser.gamification.vacation.startDate) / 86400000));
            return daysLeft;
        } catch(e) { return false; }
    };

    if (!user) return <div className="container" style={{ padding: '4rem' }}>Inicia sesión para ver tus mensajes.</div>;

    // Sidebar interaction
    const handleChatSelect = (id) => {
        navigate('/chat/' + id);
    };

    // Handle block action
    const handleBlock = (chatId) => {
        toggleChatBlock(chatId);
        setActiveMenuId(null);
    };

    // Expired Jobs Logic
    const activeJob = activeChat?.type === 'order' && activeChat.contextId ? jobs.find(j => j.id === parseInt(activeChat.contextId) || j.id === activeChat.contextId) : null;
    const isJobExpired = getJobTimeRemaining(activeChat) === 'Vencido';
    const isClient = activeJob && activeJob.buyerId === user.id;

    const handleExtendDeadline = (days) => {
        if (!activeJob) return;

        // 1. Extend the job in global state (this updates jobs array)
        extendJobDeadline(activeJob.id, days);

        // 2. Send the system message notifying the extension
        sendMessage(activeChat.id, `🔄 El cliente ha extendido el plazo de entrega por ${days} días.`, [], { isSystem: true });

        // 3. Simulate Freelancer Reply (Demo Purpose)
        setTimeout(() => {
            try {
                const myId = user?.id || user?.username;
                const freelancerId = activeChat.participants?.find(p => p !== myId) || 'freelancer_sim_id';
                const freelancerName = activeJob?.freelancerName || 'Freelancer';

                sendMessage(activeChat.id, `¡Muchas gracias por la extensión! Seguimos trabajando. 🚀`, [], {
                    senderId: freelancerId,
                    senderName: freelancerName
                });
            } catch (err) {
                console.error("Simulation error", err);
                alert("Error de simulación: " + err.message);
            }
        }, 1500);

        // Note: Because ChatContext and JobContext update independently, 
        // the deriving variables 'activeJob' and 'isJobExpired' below 
        // will automatically recalculate on the next render cycle when jobs/chats change.
    };

    const handleCancelJob = () => {
        if (!activeJob) return;
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
                    <h3 className="chat-header">Mensajes</h3>

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
                                    <div className="chat-avatar-placeholder" style={{ background: chat.status === 'blocked' ? '#64748b' : 'var(--gradient-primary)' }}>
                                        {getChatName(chat).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="chat-info">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="chat-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {getChatName(chat)}
                                                {chat.contextTitle && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>• {chat.contextTitle}</span>}
                                                {getOtherUserVacation(chat) !== false && <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.6rem', fontWeight: '700', padding: '1px 6px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', whiteSpace: 'nowrap' }}>Vacaciones</span>}
                                            </div>
                                            {chat.status === 'blocked' && <span style={{ fontSize: '10px', color: '#ef4444' }}>BLOQUEADO</span>}
                                        </div>
                                        <div className="chat-preview">{chat.status === 'blocked' ? <i>Chat bloqueado</i> : (chat.lastMessage || 'Nuevo chat')}</div>
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
                                            <button onClick={() => alert("Usuario Reportado")}>
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
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Window */}
                <div className="chat-main">
                    {activeChat ? (
                        <>
                            <div className="chat-window-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <h3>{getChatName(activeChat)}</h3>
                                    {activeChat.contextTitle && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>| {activeChat.contextTitle}</span>}
                                    {getOtherUserVacation(activeChat) !== false && (
                                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                            De vacaciones — faltan {getOtherUserVacation(activeChat)} días
                                        </span>
                                    )}
                                </div>

                                {activeChat.type === 'order' && (
                                    <span className={`badge-order ${getJobTimeRemaining(activeChat) === 'Vencido' ? 'expired' : ''}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', marginRight: '4px', verticalAlign: 'middle' }}>
                                            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        {getJobTimeRemaining(activeChat) || 'Sin plazo'}
                                    </span>
                                )}
                            </div>

                            <div className="messages-container">
                                {activeChat.messages.length === 0 ? (
                                    <div className="empty-messages">
                                        <p>¡Este es el comienzo de tu historial de mensajes!</p>
                                    </div>
                                ) : (
                                    activeChat.messages.map((msg, index) => {
                                        const isMe = msg.senderId === user.id || msg.senderName === (user.firstName || user.companyName);
                                        const msgDate = new Date(msg.timestamp);
                                        const prevMsg = activeChat.messages[index - 1];
                                        const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;

                                        const showDateDivider = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDateDivider && (
                                                    <div className="date-divider">
                                                        <span>{msgDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span>
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
                                                            {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="chat-input"
                                        autoFocus
                                    />
                                    <button type="button" className="chat-send-btn outline" onClick={() => {
                                        const myId = user?.id || user?.username;
                                        const freelancerId = activeChat.participants?.find(p => p !== myId) || 'freelancer_sim_id';
                                        sendMessage(activeChat.id, `Hola! Este es un mensaje de prueba para ver el color celeste.`, [], {
                                            senderId: freelancerId,
                                            senderName: activeJob?.freelancerName || 'Freelancer'
                                        });
                                    }} title="Simular Respuesta" style={{ padding: '0 0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                        🤖
                                    </button>
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
        </div >
    );
};

export default Chat;
