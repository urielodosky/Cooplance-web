import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import CustomDropdown from '../../../components/common/CustomDropdown';
import CoopServiceCreateForm from '../components/CoopServiceCreateForm';

// Define explicit sub-components to isolate hook usage if any (though currently they are hookless)
// This ensures cleaner main component render

const TeamDashboard = () => {
    // --- 1. HOOKS (Strictly Top Level) ---
    const { teamId } = useParams();
    const navigate = useNavigate();

    // Custom Hooks
    const { teams, sendMessage, simulateDistribution, clearChat, deleteMessage, leaveTeam, addMemberToTeam, updateMemberRole, dissolveCoop, toggleService, addServiceToTeam, closeProject, updateRules, submitEvaluation, updateTeam, canPerformAction, acceptRules } = useTeams();
    const { user } = useAuth();
    const { createChat } = useChat();

    // --- 2. DERIVED STATE ---
    // Ensure activeTeam is derived from updated teams list
    const activeTeam = teams.find(t => t.id === teamId);

    // React Refs
    const fileInputRef = useRef(null);

    // React State
    const [activeTab, setActiveTab] = useState('members');
    const [messageInput, setMessageInput] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [simAmount, setSimAmount] = useState(1000);
    const [simulationResult, setSimulationResult] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [members, setMembers] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [roleSelectorMember, setRoleSelectorMember] = useState(null);

    // Mock Services State (Local for now, could be Context later)
    // Mock Services State Removed - using activeTeam.services
    const [reviewTarget, setReviewTarget] = useState(null); // { projectId, targetId, targetName }
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [chatView, setChatView] = useState('internal'); // 'internal' | 'client'
    const [showChatDropdown, setShowChatDropdown] = useState(false);
    const [selectedClientJob, setSelectedClientJob] = useState(null);
    const [clientJobFilter, setClientJobFilter] = useState('active'); // 'active' | 'completed'
    const [showCreateService, setShowCreateService] = useState(false);

    // Initialize edit state when activeTeam loads
    useEffect(() => {
        if (activeTeam) {
            setEditName(activeTeam.name);
            setEditDesc(activeTeam.description);
        }
    }, [activeTeam?.id]);

    // --- 2. DERIVED STATE ---
    const amIFounder = user && activeTeam && members.find(m => m.userId === user.id)?.role === 'owner';

    // --- 3. EFFECTS ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        const handleClickOutside = () => {
            setShowMenu(false);
            setOpenMenuId(null);
            setShowChatDropdown(false);
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Initial member load
    useEffect(() => {
        if (activeTeam) {
            // MOCK DATAMERGE
            const FAKE_MEMBERS = [
                { userId: 'fake-1', username: 'Elena_Dev', role: 'member', status: 'active', level: 5, joinedAt: new Date().toISOString() },
                { userId: 'fake-2', username: 'CarlosDesign', role: 'member', status: 'active', level: 3, joinedAt: new Date().toISOString() },
                { userId: 'fake-3', username: 'Sofia_Lead', role: 'member', status: 'active', level: 8, joinedAt: new Date().toISOString() }
            ];

            setMembers(prev => {
                // Combine real members with fake ones for demo
                const combined = [...activeTeam.members, ...FAKE_MEMBERS];
                return combined.map(m => {
                    // Update current user level dynamic
                    if (user && m.userId === user.id) {
                        return { ...m, level: user.level || 1, expulsionWarning: m.expulsionWarning || false };
                    }
                    return { ...m, expulsionWarning: m.expulsionWarning || false };
                });
            });
        }
    }, [activeTeam, user]); // Depend on user to update level

    // Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    // --- 4. HANDLERS ---
    const handleRoleChangeRequest = (memberId, currentRole) => {
        setRoleSelectorMember({ id: memberId, currentRole });
        setOpenMenuId(null);
    };

    const confirmRoleChange = async (newRole) => {
        if (roleSelectorMember) {
            try {
                await updateMemberRole(activeTeam.id, roleSelectorMember.id, newRole);
                setRoleSelectorMember(null);
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleWarnExpulsion = (memberId) => {
        if (window.confirm("¿Avisar expulsión en 2 días al miembro?\nSe le notificará inmediatamente.")) {
            setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, expulsionWarning: true } : m));
            setOpenMenuId(null);
        }
    };

    const handlePrivateMessage = (memberId) => {
        if (!user) return;
        const newChatId = createChat([user.id, memberId], 'direct');
        navigate(`/ chat / ${newChatId} `);
        setOpenMenuId(null);
    };

    const handleFileSelect = (e) => {
        if (!activeTeam) return;
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const type = file.type.startsWith('image/') ? 'image' : 'video';
            setAttachment({ url: event.target.result, type, name: file.name });
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!activeTeam || (!messageInput.trim() && !attachment)) return;

        try {
            sendMessage(activeTeam.id, messageInput, attachment, 'internal');
            setMessageInput('');
            setAttachment(null);
        } catch (error) {
            alert(error.message);
        }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const handleClearChat = () => {
        if (!activeTeam) return;
        if (window.confirm("¿Seguro que quieres vaciar el chat?")) {
            clearChat(activeTeam.id);
            setShowMenu(false);
        }
    };

    const handleSimulation = () => {
        if (!activeTeam) return;
        const result = simulateDistribution(simAmount, members);
        setSimulationResult({ ...result });
    };

    const handleLeaveTeam = async () => {
        if (window.confirm("¿Estás seguro de que deseas abandonar el equipo? Esta acción no se puede deshacer.")) {
            try {
                // leaveTeam is now expected to be available from useTeams hook
                // If not available yet, we need to update destructuring
                await leaveTeam(activeTeam.id);
                // alert("Has abandonado el equipo."); // Optional
                navigate('/my-coops');
            } catch (error) {
                alert(error.message || "No se pudo abandonar el equipo.");
            }
        }
    };

    const toggleServiceStatus = async (id) => {
        try {
            await toggleService(activeTeam.id, id);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAddService = async () => {
        const title = prompt("Título del Servicio:");
        if (!title) return;
        const price = prompt("Precio (ej: 'Desde $500'):");
        if (!price) return;

        try {
            await addServiceToTeam(activeTeam.id, { title, price });
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDissolveTeam = async () => {
        if (window.confirm("¡PELIGRO! ¿Estás seguro de ELIMINAR definitivamente este equipo? Esta acción no se puede deshacer.")) {
            try {
                await dissolveCoop(activeTeam.id);
                navigate('/my-coops');
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleInviteMember = async () => {
        const userId = prompt("Introduce el ID del usuario a invitar (Simulación: usa ids válidos)");
        if (userId) {
            try {
                await addMemberToTeam(activeTeam.id, userId);
                // alert("Miembro añadido exitosamente");
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleCompleteProject = async (projectId) => {
        const scoreStr = prompt("Simulación Cliente: Califica del 1 al 5:");
        if (!scoreStr) return;
        const score = parseInt(scoreStr);
        if (isNaN(score) || score < 1 || score > 5) {
            alert("Calificación inválida");
            return;
        }
        const feedback = prompt("Feedback del cliente:");

        try {
            await closeProject(activeTeam.id, projectId, { clientScore: score, feedback: feedback || "" });
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateRules = async () => {
        const newRules = prompt("Edita las reglas internas:", activeTeam.internalRules || "");
        if (newRules !== null) {
            try {
                await updateRules(activeTeam.id, newRules);
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleOpenReview = (projectId, targetId, targetName) => {
        setReviewTarget({ projectId, targetId, targetName });
    };

    const submitReview = async (score) => {
        if (!reviewTarget) return;
        try {
            await submitEvaluation(activeTeam.id, reviewTarget.projectId, reviewTarget.targetId, score, "Feedback simulado");
            setReviewTarget(null);
            alert("Evaluación enviada correctamente.");
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateInfos = async () => {
        try {
            await updateTeam(activeTeam.id, { name: editName, description: editDesc });
            alert("Información actualizada correctamente.");
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAcceptRules = async () => {
        try {
            await acceptRules(activeTeam.id);
        } catch (error) {
            alert(error.message);
        }
    };

    // --- 5. RENDER GUARD (Refactored to Conditional Rendering) ---
    // Instead of valid early return, we render content conditionally to ensure hooks passed this point (if any were added) wouldn't break it.
    // Although we don't have hooks after this, this pattern is safer for future edits.

    // --- 6. MAIN RENDER ---
    return (
        <div className="container" style={{ padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100vw', boxSizing: 'border-box' }}>

            {!activeTeam ? (
                <div className="container" style={{ padding: '4rem', textAlign: 'center', margin: 'auto' }}>
                    <h2>Coop no encontrada</h2>
                    <button className="btn-secondary" onClick={() => navigate('/my-coops')}>Volver</button>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="glass team-dashboard-header" style={{ marginBottom: '0.8rem', padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px', position: 'relative', overflow: 'visible', zIndex: 50 }}>
                        <div className="team-info-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button onClick={() => navigate('/my-coops')} className="btn-icon-soft" title="Volver">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="team-avatar" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', flexShrink: 0 }}>
                                {activeTeam.name.substring(0, 1)}
                            </div>
                            <div className="team-text-info">
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{activeTeam.name}</h2>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{members.length} miembros</span>
                            </div>
                        </div>
                        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {!isMobile && (
                                <div className="tab-pill-container">
                                    {[
                                        { id: 'chat', label: 'Chat', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path> },
                                        { id: 'members', label: 'Miembros', icon: <g><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></g> },
                                        { id: 'distribution', label: 'Reparto', icon: <g><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></g> },
                                        { id: 'services', label: 'Servicios', icon: <g><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></g> },
                                        { id: 'settings', label: 'Ajustes', icon: <g><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></g> }
                                    ].map(tab => (
                                        <div key={tab.id} style={{ position: 'relative' }}>
                                            <button
                                                onClick={(e) => {
                                                    if (tab.id === 'chat') {
                                                        e.stopPropagation();
                                                        if (activeTab === 'chat') {
                                                            setShowChatDropdown(!showChatDropdown);
                                                        } else {
                                                            setActiveTab('chat');
                                                            setShowChatDropdown(true);
                                                        }
                                                    } else {
                                                        setActiveTab(tab.id);
                                                        setShowChatDropdown(false);
                                                    }
                                                }}
                                                className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingRight: tab.id === 'chat' ? '0.8rem' : undefined }}
                                                title={tab.label}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', minWidth: '20px' }}>{tab.icon}</svg>
                                                <span className="tab-label">
                                                    {tab.id === 'chat' && activeTab === 'chat' ? (chatView === 'internal' ? 'Equipo Interno' : 'Historial Cliente') : tab.label}
                                                </span>
                                                {tab.id === 'chat' && (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', transition: 'transform 0.2s', transform: showChatDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                )}
                                            </button>
                                            {tab.id === 'chat' && showChatDropdown && (
                                                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: '0', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '12px', minWidth: '200px', zIndex: 1000, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
                                                    <button className="menu-item" onClick={(e) => { e.stopPropagation(); setChatView('internal'); setSelectedClientJob(null); setShowChatDropdown(false); setActiveTab('chat'); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: chatView === 'internal' ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', color: chatView === 'internal' ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        Equipo Interno
                                                    </button>
                                                    <button className="menu-item" onClick={(e) => { e.stopPropagation(); setChatView('client'); setSelectedClientJob(null); setShowChatDropdown(false); setActiveTab('chat'); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: chatView === 'client' ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', color: chatView === 'client' ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        Historial con Clientes
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ position: 'relative' }}>
                                <button className="btn-icon-soft" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                </button>
                                {showMenu && (
                                    <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', right: '0', padding: '0.5rem', borderRadius: '12px', minWidth: '180px', zIndex: 1000, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
                                        {isMobile && (
                                            <>
                                                <button className="menu-item" onClick={() => { setActiveTab('chat'); setChatView('internal'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>Chat Interno</button>
                                                <button className="menu-item" onClick={() => { setActiveTab('chat'); setChatView('client'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>Chat Cliente</button>
                                                <button className="menu-item" onClick={() => { setActiveTab('members'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Miembros</button>
                                                <button className="menu-item" onClick={() => { setActiveTab('distribution'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>Reparto</button>
                                                <button className="menu-item" onClick={() => { setActiveTab('services'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>Servicios</button>
                                                <button className="menu-item" onClick={() => { setActiveTab('settings'); setShowMenu(false); }} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Ajustes</button>
                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.4rem 0' }}></div>
                                            </>
                                        )}
                                        <button className="menu-item" onClick={handleClearChat} style={{ width: '100%', padding: '0.6rem', textAlign: 'left', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>Vaciar Chat</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-scroll-container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', minHeight: 0, overflowY: activeTab === 'chat' ? 'hidden' : 'auto', paddingRight: '0.2rem' }}>
                        {/* CHAT TAB */}
                        {activeTab === 'chat' && (
                            <div className="team-chat-window glass">
                                {/* Chat Channel Tabs */}
                                {chatView === 'client' && !selectedClientJob ? (
                                    <div className="client-jobs-list" style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Servicios con Clientes</h3>
                                            <div style={{ width: '150px' }}>
                                                <CustomDropdown
                                                    options={[
                                                        { value: 'active', label: 'Activos' },
                                                        { value: 'completed', label: 'Finalizados' }
                                                    ]}
                                                    value={clientJobFilter}
                                                    onChange={setClientJobFilter}
                                                />
                                            </div>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', marginTop: 0 }}>
                                            Selecciona un servicio para ver el historial de mensajes de solo lectura.
                                        </p>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {(!activeTeam.projectHistory || activeTeam.projectHistory.filter(p => p.status === clientJobFilter && (clientJobFilter === 'completed' || amIFounder || p.participants?.includes(user?.id))).length === 0) ? (
                                                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                                        {clientJobFilter === 'active' ? (
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                                                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                                                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                                                            </svg>
                                                        ) : (
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                                        {clientJobFilter === 'active' ? 'No hay servicios activos' : 'No hay servicios finalizados'}
                                                    </h4>
                                                </div>
                                            ) : (
                                                activeTeam.projectHistory.filter(p => p.status === clientJobFilter && (clientJobFilter === 'completed' || amIFounder || p.participants?.includes(user?.id))).map((proj, idx) => (
                                                    <div key={idx} onClick={() => setSelectedClientJob(proj.projectId)} className="job-card-selectable" style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                                                        <div>
                                                            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>Proyecto #{proj.projectId.substring(0, 8)}</h4>
                                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: clientJobFilter === 'active' ? '#3b82f6' : '#10b981' }}></div>
                                                                    {clientJobFilter === 'active' ? 'Activo' : 'Finalizado'}
                                                                </span>
                                                                <span>{clientJobFilter === 'active' ? 'Activado' : 'Completado'} el {new Date(clientJobFilter === 'active' ? proj.activationDate : proj.completedAt || proj.activationDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {chatView === 'client' && selectedClientJob && (
                                            <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <button onClick={() => setSelectedClientJob(null)} className="btn-icon-soft" title="Volver a los proyectos">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                                </button>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Chat del Proyecto</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#{selectedClientJob.substring(0, 8)} • Solo lectura</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="chat-messages" style={{ height: (chatView === 'client' && selectedClientJob) ? 'calc(100% - 130px)' : '100%' }}>
                                            {(!activeTeam.messages || activeTeam.messages.filter(m => (m.type || 'internal') === chatView).length === 0) ? (
                                                <div className="empty-chat-state">
                                                    <div className="empty-icon">💬</div>
                                                    <h3>{chatView === 'internal' ? 'Chat de Equipo' : 'Chat con Clientes'}</h3>
                                                    <p>{chatView === 'internal' ? 'Coordina, comparte archivos y mantente al día.' : 'No hay mensajes registrados con clientes aún.'}</p>
                                                </div>
                                            ) : (
                                                activeTeam.messages.filter(m => (m.type || 'internal') === chatView).map((msg, idx, arr) => {
                                                    const isMe = user && msg.userId === user.id;
                                                    const prevMsg = arr[idx - 1]; // Use the filtered array to get the actual previous message
                                                    const isSameUser = prevMsg && prevMsg.userId === msg.userId && (new Date(msg.timestamp) - new Date(prevMsg.timestamp) < 5 * 60 * 1000);
                                                    return (
                                                        <div key={msg.id} className={`message - group ${isMe ? 'me' : 'other'} ${isSameUser ? 'same-user' : ''} `}>
                                                            {!isSameUser && <div className="message-sender">{msg.username}</div>}
                                                            <div className="message-content-wrapper">
                                                                {!isMe && <div className="sender-avatar" style={{ visibility: isSameUser ? 'hidden' : 'visible', height: isSameUser ? '0px' : '32px', marginBottom: isSameUser ? '0' : '4px' }}>{msg.username.charAt(0).toUpperCase()}</div>}
                                                                <div className="message-bubble">
                                                                    {chatView === 'internal' && <button className="delete-msg-btn" onClick={() => deleteMessage(activeTeam.id, msg.id)} title="Eliminar mensaje">×</button>}
                                                                    {msg.attachment && (
                                                                        <div className="message-attachment">
                                                                            {msg.attachment.type === 'image' ? <img src={msg.attachment.url} alt="adjunto" /> : <video controls src={msg.attachment.url} />}
                                                                        </div>
                                                                    )}
                                                                    {msg.text && <p>{msg.text}</p>}
                                                                    <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {chatView === 'internal' ? (
                                            <>
                                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileSelect} />
                                                {attachment && (
                                                    <div className="attachment-preview">
                                                        <div className="preview-content">
                                                            {attachment.type === 'image' ? <img src={attachment.url} alt="preview" /> : <div className="video-preview-icon">🎥 Video</div>}
                                                            <span className="file-name">{attachment.name}</span>
                                                        </div>
                                                        <button className="remove-btn" onClick={() => setAttachment(null)}>×</button>
                                                    </div>
                                                )}
                                                <form onSubmit={handleSendMessage} className="chat-input-area">
                                                    <button type="button" className="attach-btn" onClick={triggerFileSelect} title="Adjuntar archivo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
                                                    <input type="text" className="chat-input" placeholder="Escribe un mensaje..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} />
                                                    <button type="submit" className="send-btn" disabled={!messageInput.trim() && !attachment}><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
                                                </form>
                                            </>
                                        ) : (
                                            <div className="chat-input-area" style={{ justifyContent: 'center', background: 'var(--bg-card-hover)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                                    Modo solo lectura. Para escribirle al cliente, usa la Central de Mensajes de Cooplance.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {/* MEMBERS TAB */}
                        {activeTab === 'members' && (
                            <div className="glass" style={{ height: 'fit-content', borderRadius: '16px', padding: '1.5rem' }}>
                                <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Miembros ({members.length})</h3>
                                <div className="member-list-container">
                                    {members.map((member, idx) => {
                                        const isMe = user && member.userId === user.id;
                                        const amIFounder = user && members.find(m => m.userId === user.id)?.role === 'owner';
                                        const displayName = isMe ? `${user.username || user.firstName} (Tú)` : (member.username || `Usuario ${member.userId.substring(0, 5)}...`);
                                        const hasWarning = member.expulsionWarning;
                                        const isOpen = openMenuId === member.userId;
                                        return (
                                            <div key={idx} className="member-item" style={{ position: 'relative', paddingRight: amIFounder && !isMe ? '3rem' : '1rem', zIndex: isOpen ? 100 : 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flex: 1, position: 'relative', zIndex: 2 }} onClick={() => navigate(`/ profile / ${member.userId} `)}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: 'white' }}>{displayName.charAt(0).toUpperCase()}</div>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{displayName}{hasWarning && <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>⚠ Expulsión en 2d</span>}</h4>
                                                        <span style={{ fontSize: '0.85rem', color: member.role === 'owner' ? '#fbbf24' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>{member.role === 'owner' ? 'Fundador' : (member.role === 'member' ? 'Miembro' : member.role.charAt(0).toUpperCase() + member.role.slice(1))} • {member.status || 'Activo'}</span>
                                                        {(() => { try { const allUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]'); const u = allUsers.find(x => x.id == member.userId); if (u?.gamification?.vacation?.active) { const daysLeft = Math.max(0, 15 - Math.floor((Date.now() - u.gamification.vacation.startDate) / 86400000)); return <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(16, 185, 129, 0.25)', marginTop: '4px' }}>De vacaciones — {daysLeft}d</span>; } return null; } catch(e) { return null; } })()}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 101 }}>
                                                    <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem' }}>Nivel {isMe ? (user?.level || 1) : (member.level || '?')}</span>
                                                    {amIFounder && !isMe && (
                                                        <div style={{ position: 'relative' }}>
                                                            <button className="btn-icon-soft" style={{ position: 'relative', background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent', color: isOpen ? 'var(--text-primary)' : 'currentColor' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : member.userId); }}>
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                            </button>
                                                            {isOpen && (
                                                                <div className="dropdown-menu" style={{ position: 'absolute', top: '0', right: '100%', marginRight: '0.5rem', padding: '0.5rem', borderRadius: '16px', minWidth: '200px', zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
                                                                    <button className="menu-item" onClick={() => handleRoleChangeRequest(member.userId, member.role)} style={{ width: '100%', padding: '10px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'var(--bg-muted)'} onMouseOut={(e) => e.target.style.background = 'none'}><span style={{ fontSize: '1.1rem' }}>🛡</span> Cambiar Rol</button>
                                                                    <button className="menu-item" onClick={() => handleWarnExpulsion(member.userId)} style={{ width: '100%', padding: '10px', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseOut={(e) => e.target.style.background = 'none'}><span style={{ fontSize: '1.1rem' }}>⚠</span> Avisar Expulsión</button>
                                                                    <button className="menu-item" onClick={() => handlePrivateMessage(member.userId)} style={{ width: '100%', padding: '10px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'var(--bg-muted)'} onMouseOut={(e) => e.target.style.background = 'none'}><span style={{ fontSize: '1.1rem' }}>💬</span> Mensaje Privado</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button className="invite-btn" onClick={handleInviteMember}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>Invitar Nuevo Miembro</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'distribution' && (
                            <div className="glass" style={{ height: 'fit-content', borderRadius: '16px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <h3 className="section-title" style={{ margin: 0 }}>Reparto de Beneficios</h3>
                                    <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>12% Comisión Plataforma</div>
                                </div>

                                {/* Active/Frozen Projects List */}
                                {activeTeam.projectHistory && activeTeam.projectHistory.length > 0 && (
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Proyectos Activos & Historial</h4>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {activeTeam.projectHistory.map((proj, pIdx) => (
                                                <div key={pIdx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                        <span style={{ fontWeight: 'bold' }}>Proyecto #{proj.projectId.substring(0, 6)}</span>
                                                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: proj.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: proj.status === 'completed' ? '#34d399' : '#60a5fa' }}>
                                                            {proj.status === 'completed' ? 'COMPLETADO' : 'ACTIVO (Congelado)'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                                        <span>Bruto: ${proj.financials.gross}</span>
                                                        <span>Neto: ${proj.financials.net.toFixed(2)}</span>
                                                        <span>Fecha: {new Date(proj.activationDate).toLocaleDateString()}</span>
                                                        {proj.status === 'active' && (
                                                            <button onClick={() => handleCompleteProject(proj.projectId)} style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>Simular Cliente: Completar</button>
                                                        )}
                                                        {proj.status === 'completed' && proj.ratings && (
                                                            <span style={{ marginLeft: 'auto', color: '#fbbf24' }}>★ {proj.ratings.clientScore}</span>
                                                        )}
                                                    </div>

                                                    {/* Frozen Participants */}
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Participantes (Niveles congelados al inicio)</p>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            {proj.participants.map(uid => {
                                                                const levelAtStart = proj.frozenLevels[uid];
                                                                // Try to find name in current members, else 'Ex-Miembro'
                                                                const memName = members.find(m => m.userId === uid)?.username || 'Usuario';
                                                                const share = (levelAtStart / proj.financials.totalWeight) * proj.financials.net;

                                                                // Check for Peer Review Eligibility
                                                                const iParticipated = proj.participants?.includes(user?.id);
                                                                const isMe = uid === user?.id;
                                                                const alreadyReviewed = proj.internalReviews?.some(r => r.evaluatorId === user?.id && r.targetUserId === uid);

                                                                return (
                                                                    <div key={uid} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span>{memName} (Lvl {levelAtStart})</span>
                                                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>${share.toFixed(2)}</span>
                                                                        {proj.status === 'completed' && iParticipated && !isMe && !alreadyReviewed && (
                                                                            <button onClick={() => handleOpenReview(proj.projectId, uid, memName)} style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '4px' }} title="Evaluar Desempeño">★</button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Simulador (Pre-Proyecto)</h4>
                                <div className="simulation-input-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
                                        <input type="number" value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} className="chat-input" style={{ width: '100%', paddingLeft: '2rem', height: '50px', fontSize: '1.1rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="Monto a repartir" />
                                    </div>
                                    <button className="btn-primary" onClick={handleSimulation} style={{ height: '50px', padding: '0 2rem', borderRadius: '14px', fontSize: '1rem', background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>Calcular</button>
                                </div>
                                {simulationResult && (
                                    <div className="simulation-results" style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}><span style={{ display: 'block', fontSize: '0.8rem', color: '#f87171', marginBottom: '0.3rem' }}>Comisión Plataforma</span><span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>-${simulationResult.commission.toFixed(2)}</span></div>
                                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}><span style={{ display: 'block', fontSize: '0.8rem', color: '#34d399', marginBottom: '0.3rem' }}>Neto a Repartir</span><span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>${simulationResult.net.toFixed(2)}</span></div>
                                        </div>
                                        <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Detalle por Miembro (Si se activara hoy)</h4>
                                        <div className="member-list-container">
                                            {simulationResult.distribution.map((share, idx) => {
                                                const member = members.find(m => m.userId === share.userId) || {};
                                                const isMe = user && share.userId === user.id;
                                                const safeId = share.userId ? share.userId.toString() : '???';
                                                const displayName = isMe ? `${user.username || user.firstName} (Tú)` : (member.username || `Usuario ${safeId.substring(0, 5)}...`);
                                                return (
                                                    <div key={idx} className="member-item" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }} onClick={() => navigate(`/ profile / ${share.userId} `)}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '1rem' }}>{displayName.charAt(0).toUpperCase()}</div>
                                                            <div><h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>{displayName}</h5><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nivel {share.level} • {share.percentage}%</span></div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}><span style={{ display: 'block', fontWeight: 'bold', color: '#10b981', fontSize: '1rem' }}>${share.amount.toFixed(2)}</span></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* SERVICES TAB (New) */}
                        {activeTab === 'services' && (
                            <div className="glass" style={{ height: 'fit-content', borderRadius: '16px', padding: '1.5rem' }}>
                                {showCreateService ? (
                                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <h3 className="section-title" style={{ margin: 0 }}>Crear Nuevo Servicio</h3>
                                        </div>
                                        <CoopServiceCreateForm
                                            teamId={activeTeam.id}
                                            onCancel={() => setShowCreateService(false)}
                                            dashboardMembers={members}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <h3 className="section-title" style={{ margin: 0 }}>Servicios del Equipo</h3>
                                            <button className="btn-primary" onClick={() => setShowCreateService(true)} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>+ Nuevo Servicio</button>
                                        </div>
                                        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                            {(!activeTeam.services || activeTeam.services.length === 0) ? (
                                                <p style={{ color: 'var(--text-secondary)' }}>No hay servicios activos. Añade uno para empezar.</p>
                                            ) : (
                                                activeTeam.services.map(service => (
                                                    <div key={service.id} className="service-card glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{service.title}</h4>
                                                            <div style={{ background: service.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: service.active ? '#10b981' : '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                {service.active ? 'ACTIVO' : 'INACTIVO'}
                                                            </div>
                                                        </div>
                                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{service.price}</p>
                                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                                            <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }} onClick={() => toggleService(activeTeam.id, service.id)}>{service.active ? 'Pausar' : 'Activar'}</button>
                                                            <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}>Editar</button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {/* SETTINGS TAB (New) */}
                        {activeTab === 'settings' && (
                            <div className="glass" style={{ height: 'fit-content', borderRadius: '16px', padding: '1.5rem' }}>
                                <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Configuración del Equipo</h3>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Información General</h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nombre del Equipo</label>
                                            <input type="text" className="chat-input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-card)' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descripción</label>
                                            <textarea className="chat-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows="3" style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-card)', resize: 'none' }}></textarea>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <button className="btn-primary" onClick={handleUpdateInfos}>Guardar Cambios</button>
                                            <button onClick={() => navigate(`/ team / ${activeTeam.id} /public`)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '12px', cursor: 'pointer' }}>Ver Perfil Público</button >
                                        </div >
                                    </div >
                                </div >

                                <div style={{ marginBottom: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '1rem', margin: 0 }}>Reglas Internas</h4>
                                        {amIFounder && <button onClick={handleUpdateRules} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer' }}>Editar Reglas</button>}
                                    </div>
                                    <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', minHeight: '80px', fontSize: '0.9rem', color: activeTeam.internalRules ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                        {activeTeam.internalRules || "No hay reglas internas definidas."}
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                                    <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#ef4444' }}>Zona de Peligro</h4>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div>
                                                <h5 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>Abandonar Equipo</h5>
                                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Perderás acceso al chat y a los repartos futuros.</p>
                                            </div>
                                            <button onClick={handleLeaveTeam} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>Abandonar</button>
                                        </div>
                                        {amIFounder && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                <div>
                                                    <h5 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>Eliminar Equipo</h5>
                                                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Esta acción es irreversible. Se eliminará todo el historial.</p>
                                                </div>
                                                <button onClick={handleDissolveTeam} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Eliminar</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div >
                        )}
                    </div >

                    {roleSelectorMember && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={() => setRoleSelectorMember(null)}>
                            <div className="glass" style={{ width: '320px', padding: '1.5rem', borderRadius: '20px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
                                <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center', fontSize: '1.2rem' }}>Asignar Nuevo Rol</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {['gerente', 'productor', 'visualizador', 'miembro'].map(role => (
                                        <button key={role} onClick={() => confirmRoleChange(role)} style={{ padding: '1rem', borderRadius: '12px', border: roleSelectorMember.currentRole === role ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)', background: roleSelectorMember.currentRole === role ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', color: roleSelectorMember.currentRole === role ? 'var(--primary)' : 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontWeight: roleSelectorMember.currentRole === role ? '600' : '400', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                                            <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                                            {roleSelectorMember.currentRole === role && <span>✓</span>}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setRoleSelectorMember(null)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.95rem' }}>Cancelar</button>
                            </div>
                        </div>
                    )}

                    {
                        reviewTarget && (
                            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={() => setReviewTarget(null)}>
                                <div className="glass" style={{ width: '300px', padding: '1.5rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                                    <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center', fontSize: '1.1rem' }}>Evaluar a {reviewTarget.targetName}</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>Califica su desempeño en el proyecto.</p>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                        {[1, 2, 3, 4, 5].map(score => (
                                            <button key={score} onClick={() => submitReview(score)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>{score}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => setReviewTarget(null)} style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
                                </div>
                            </div>
                        )
                    }

                    {/* Rules Acceptance Modal (Point 11) */}
                    {
                        activeTeam && activeTeam.internalRules && activeTeam.rulesVersion &&
                        (activeTeam.members.find(m => m.userId === user.id)?.rulesAcceptedVersion || 0) < activeTeam.rulesVersion && (
                            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }}>
                                <div className="glass" style={{ width: '90%', maxWidth: '500px', padding: '2rem', borderRadius: '24px', background: 'var(--bg-card)', border: '1px solid var(--primary)', boxShadow: 'var(--shadow-glow)' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
                                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Actualización de Reglas</h2>
                                        <p style={{ color: 'var(--text-secondary)' }}>El Fundador ha actualizado las reglas internas de la Coop. Debes aceptarlas para continuar.</p>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.6', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {activeTeam.internalRules}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <button onClick={handleAcceptRules} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                                            He leído y acepto las nuevas reglas
                                        </button>
                                        <button onClick={handleLeaveTeam} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            No acepto (Abandonar Equipo)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )
            }
        </div >
    );
};

export default TeamDashboard;
