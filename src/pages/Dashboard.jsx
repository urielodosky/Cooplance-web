import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useServices } from '../features/services/context/ServiceContext';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';
import ServiceCard from '../features/services/components/ServiceCard';
import ProjectCard from '../components/project/ProjectCard';
import LevelUpModal from '../components/gamification/LevelUpModal';
import ProposalListModal from '../components/project/ProposalListModal';
import { calculateNextLevelXP, MAX_LEVEL, MAX_BUFFER_XP, activateVacation, registerActivity, XP_TABLE, processGamificationRules } from '../utils/gamification';
import { getProfilePicture } from '../utils/avatarUtils';
import { getProjects, getProjectsByClient } from '../lib/projectService';
import { getProposalsByUser, updateProposalStatus, deleteProposal as deleteProposalApi } from '../lib/proposalService';
import '../styles/pages/Dashboard.scss';
// Assuming Dashboard might have inline styles per original file, or use global CSS.

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const { jobs, updateJobStatus } = useJobs();
    const { services } = useServices();
    const { createChat } = useChat();
    const { addNotification } = useNotifications();
    const navigate = useNavigate();

    // Early return to prevent race conditions with ProtectedRoute
    if (!user) return null;

    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [myPublishedProjects, setMyPublishedProjects] = useState([]);
    const [myProposals, setMyProposals] = useState([]);
    const [activeProposalTab, setActiveProposalTab] = useState('active'); // 'active' or 'history'
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    // Load Projects & Proposals Logic
    useEffect(() => {
        const loadData = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // 1. My Published Projects (Client/Company) from Supabase - Filtered by DB
                const myProjects = await getProjectsByClient(user.id);
                setMyPublishedProjects(myProjects);

                // 2. My Proposals (Freelancer) - from Supabase
                const supabaseProposals = await getProposalsByUser(user.id);
                setMyProposals(supabaseProposals);
            } catch (err) {
                console.error('Error loading dashboard data:', err);
                setMyProposals([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user?.id]);

    // Automated Gamification Processing (Inactivity, Decays, Vacation Reset)
    useEffect(() => {
        if (user && (user.role === 'freelancer' || user.role === 'company')) {
            const processedUser = processGamificationRules(user);
            if (processedUser !== user) {
                updateUser(processedUser).catch(err => {
                    console.error("Dashboard Gamification update failed:", err);
                });
            }
        }
    }, [user, updateUser]);

    // Computed Data - Optimized with Memoization
    const myWork = React.useMemo(() => (jobs || []).filter(j => j.freelancerId === user.id), [jobs, user.id]);
    const myServices = React.useMemo(() => (services || []).filter(s => s.freelancerId === user.id), [services, user.id]);
    const myOrders = React.useMemo(() => (jobs || []).filter(j => j.buyerId === user.id), [jobs, user.id]);

    // Level Logic
    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const nextLevelXP = calculateNextLevelXP(currentLevel);
    const isMaxLevel = currentLevel >= MAX_LEVEL;

    // XP Bar Logic
    const xpPercentage = isMaxLevel
        ? Math.min(Math.max(0, (currentXP - 10000) / MAX_BUFFER_XP) * 100, 100)
        : Math.min((currentXP / nextLevelXP) * 100, 100);

    const xpDisplayText = isMaxLevel
        ? `${currentXP - 10000} / ${MAX_BUFFER_XP} Buffer XP`
        : `${currentXP} / ${nextLevelXP} XP`;

    const levelLabel = isMaxLevel ? "Nivel Máximo (10)" : `Progreso al Nivel ${currentLevel + 1}`;

    // Handlers
    const handleDemoLevelUp = () => {
        if ((user.level || 1) >= MAX_LEVEL) {
            // If max level, add XP to buffer to test
            const currentXP = user.xp || 0;
            const newXP = Math.min(currentXP + 1000, 10000 + MAX_BUFFER_XP); // Cap buffer
            updateUser({ ...user, xp: newXP });
            alert(`¡XP sumada al Buffer! Total: ${newXP}`);
            return;
        }

        const newLevel = (user.level || 1) + 1;
        const newXp = calculateNextLevelXP(newLevel);
        updateUser({ ...user, level: newLevel, xp: newXp });
        setShowLevelUpModal(true);
    };

    const handleDemoLevelDown = () => {
        const currentLevel = user.level || 1;
        if (currentLevel <= 1) return;
        const newLevel = currentLevel - 1;
        // set XP to minimum required for `newLevel`
        const newXp = newLevel > 1 ? XP_TABLE[newLevel - 1] : 0;
        updateUser({ ...user, level: newLevel, xp: newXp });
    };

    const handleVacationClick = () => {
        const g = user.gamification || {};
        if (g.vacation?.active) {
            alert("Ya estás en modo vacaciones. Disfruta tu tiempo libre.");
            return;
        }
        if ((g.vacation?.credits || 0) <= 0) {
            alert("No tienes créditos de vacaciones disponibles este año.");
            return;
        }

        const confirm = window.confirm(`¿Activar modo vacaciones? Se pausará el decaimiento de XP por 15 días. Te quedan ${g.vacation?.credits} usos.`);
        if (confirm) {
            const updated = activateVacation(user);
            updateUser(updated);
        }
    };



    const handleCreateServiceClick = () => {
        // Limit Logic: 1 service per Level up to Level 5.
        // Level 5+ = 5 Services MAX (Level 6+ affects commissions, not service count)
        const currentLevel = user.level || 1;
        const maxServices = currentLevel >= 5 ? 5 : currentLevel;

        if (myServices.length >= maxServices) {
            let msg = `Has alcanzado el límite de servicios activos (${maxServices}) para tu Nivel ${currentLevel}.`;
            if (currentLevel < 5) {
                msg += `\n\n¡Sube de nivel completando trabajos para desbloquear más espacios! (Máximo 5 en Nivel 5)`;
            } else {
                msg += `\n\nHas alcanzado el máximo de servicios permitidos. A partir del Nivel 6, tus beneficios mejorarán las comisiones.`;
            }
            alert(msg);
            return;
        }

        navigate('/create-service');
    };


    const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null); // { id, title }

    const { createJob } = useJobs();

    const handleAcceptProposal = async (proposal) => {
        const project = myPublishedProjects.find(p => p.id === proposal.projectId);
        if (!project) return;

        try {
            // 1. Update proposal status in Supabase
            await updateProposalStatus(proposal.id, 'accepted');
            
            // 2. Create Job in Supabase via JobContext
            // We pass the project and the proposal (freelancer)
            await createJob(project, user); // User is the client here
            
            alert('¡Propuesta aceptada!');
            window.location.reload();
        } catch (err) {
            console.error('Error accepting proposal:', err);
            alert('Error al aceptar la propuesta: ' + err.message);
        }
    };

    const handleCancelProposal = async (e, proposalId) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de que deseas cancelar esta postulación?')) return;

        try {
            await updateProposalStatus(proposalId, 'canceled');
            setMyProposals(prev => prev.map(p =>
                p.id === proposalId ? { ...p, status: 'canceled' } : p
            ));
        } catch (err) {
            console.error('Error canceling proposal:', err);
        }
        setOpenMenuId(null);
    };

    const handleDeleteProposal = async (e, proposalId) => {
        e.stopPropagation();
        if (!window.confirm('¿Borrar esta postulación de tu historial?')) return;

        try {
            await deleteProposalApi(proposalId);
            setMyProposals(prev => prev.filter(p => p.id !== proposalId));
        } catch (err) {
            console.error('Error deleting proposal:', err);
        }
        setOpenMenuId(null);
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `Hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;
        if (interval > 1) return `Hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;
        if (interval > 1) return `Hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;
        if (interval > 1) return `Hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;
        if (interval > 1) return `Hace ${Math.floor(interval)} minutos`;
        return 'Hace instantes';
    };

    const filteredProposals = myProposals.filter(p => {
        const status = (p.status || '').toLowerCase();
        if (activeProposalTab === 'active') return status === 'pending';
        return ['accepted', 'rejected', 'canceled', 'completed'].includes(status);
    });

    return (
        <div className="dashboard-container">
            {/* ... header ... */}
            {/* ... stats ... */}

            {/* Modal Injection */}
            <ProposalListModal
                isOpen={!!selectedProjectForProposals}
                onClose={() => setSelectedProjectForProposals(null)}
                projectId={selectedProjectForProposals?.id}
                projectTitle={selectedProjectForProposals?.title}
                onAccept={handleAcceptProposal}
            />

            {loading && (
                <div className="dashboard-loading-overlay">
                    <div className="spinner"></div>
                    <p>Cargando tus datos...</p>
                </div>
            )}

            {isCreatingChat && (
                <div className="dashboard-loading-overlay" style={{ zIndex: 10000, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)' }}>
                    <div className="spinner" style={{ borderColor: 'var(--primary) transparent var(--primary) transparent' }}></div>
                    <p style={{ marginTop: '1rem', fontWeight: '600', letterSpacing: '0.5px' }}>Conectando con el chat...</p>
                </div>
            )}


            {/* Header */}
            <div className="dashboard-intro">
                <div className="intro-left">
                    <img
                        src={getProfilePicture(user)}
                        alt="Profile"
                        className="dashboard-avatar"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <div>
                        <h2 className="dashboard-greeting">Hola, {user.first_name || user.company_name || user.username || 'Usuario'}</h2>
                        <p className="dashboard-bio">Bienvenido a tu panel de control.</p>
                    </div>
                </div>

                <div className="dashboard-actions-inline">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {(user.role === 'freelancer' || (user.role === 'buyer' && (user.level || 1) >= 6)) && (
                            <button className="glass" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.6rem 1.2rem',
                                border: '1px solid var(--primary)',
                                color: 'var(--primary)',
                                background: 'rgba(139, 92, 246, 0.1)',
                                fontWeight: '600',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }} onClick={() => navigate('/my-coops')}>
                                Mis Coops
                            </button>
                        )}

                        {user.role === 'freelancer' ? (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleCreateServiceClick}>
                                <span style={{ fontSize: '1.2rem' }}>+</span> Publicar Servicio
                            </button>
                        ) : (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/create-project')}>
                                <span style={{ fontSize: '1.2rem' }}>+</span> {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* BADGES SECTION (Universal for all roles) */}
            <div style={{ marginBottom: '2rem' }}>
                <div
                    className="clickable"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        marginBottom: '1.5rem',
                        cursor: 'pointer',
                        width: 'fit-content'
                    }}
                    onClick={() => navigate('/badges')}
                >
                    <h3 className="section-title" style={{ margin: 0 }}>Mis Insignias</h3>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        background: 'rgba(139, 92, 246, 0.1)',
                        padding: '0.4rem',
                        borderRadius: '50%',
                        transition: 'transform 0.2s',
                    }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                </div>

                <button
                    className="btn-secondary"
                    onClick={() => {
                        addNotification(user.id, {
                            type: 'system',
                            title: '¡Notificación de Prueba!',
                            message: 'Si estás viendo esto, el sistema de notificaciones funciona perfectamente.',
                            link: '/dashboard'
                        });
                    }}
                >
                    Test Notificación
                </button>
            </div>

            {/* FREELANCER / COMPANY (Selling) STATS */}
            {/* FREELANCER / COMPANY (Selling) STATS - Customized for Company (No Gamification) */}
            <>
                <div className="dashboard-stats-grid">
                    {/* Wallet Widget Removed per user request */}

                    {/* LEVEL: Only for Freelancers and regular Buyers? Or just Freelancers?
                        User asked to remove levels for companies. 
                        Let's show Level only for Freelancers and Buyers (individuals).
                    */}
                    {user.role !== 'company' && (
                        <div className="glass stat-card">
                            <h4>Nivel Actual</h4>
                            <p className="stat-value primary">{currentLevel}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleDemoLevelUp}
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8 }}
                                >
                                    {isMaxLevel ? '+XP' : 'Up'}
                                </button>
                                <button
                                    onClick={handleDemoLevelDown}
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8 }}
                                >
                                    Down
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VACATION: Only for Freelancers */}
                    {user.role === 'freelancer' && (
                        <div className="glass stat-card">
                            <div className="vacation-header">
                                <h4>Vacaciones</h4>
                                <div className="help-icon">?</div>
                                <span className="help-tooltip">Mientras estés de vacaciones no se perderá experiencia.</span>
                            </div>
                            <p className="stat-value" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                {user.gamification?.vacation?.active ? 'ON' : 'OFF'}
                            </p>
                            <button
                                onClick={handleVacationClick}
                                disabled={user.gamification?.vacation?.active || (user.gamification?.vacation?.credits || 0) <= 0}
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem',
                                    background: user.gamification?.vacation?.active ? '#10b981' : 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: user.gamification?.vacation?.active ? 'default' : 'pointer',
                                    opacity: ((user.gamification?.vacation?.credits || 0) <= 0 && !user.gamification?.vacation?.active) ? 0.5 : 1,
                                    width: '100%'
                                }}
                            >
                                {user.gamification?.vacation?.active ? 'Disfrutando' : 'Activar'}
                            </button>
                            <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                Restante: {user.gamification?.vacation?.credits || 0} usos
                            </p>
                        </div>
                    )}

                    <div className="glass stat-card">
                        <h4>Trabajos Activos</h4>
                        {/* Combined active jobs: Orders for buyers, Jobs for freelancers */}
                        <p className="stat-value">
                            {(user.role === 'freelancer' || user.role === 'company')
                                ? myWork.filter(j => j.status === 'active').length
                                : myOrders.filter(j => j.status === 'active').length
                            }
                        </p>
                    </div>
                    <div className="glass stat-card">
                        <h4>Completados</h4>
                        <p className="stat-value">
                            {(user.role === 'freelancer' || user.role === 'company')
                                ? myWork.filter(j => j.status === 'completed').length
                                : myOrders.filter(j => j.status === 'completed').length
                            }
                        </p>
                    </div>
                </div>

                {/* XP PROGRESS SECTION */}
                {/* XP PROGRESS SECTION - Hide for Company */}
                {user.role !== 'company' && (
                    <div className="xp-progress-container">
                        <div className="xp-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{levelLabel}</span>
                                <div className="help-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <div className="help-icon" style={{ width: '16px', height: '16px', fontSize: '0.7rem' }}>?</div>
                                    <div className="help-tooltip" style={{ width: '220px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'normal', textAlign: 'left', bottom: '100%', marginBottom: '10px' }}>
                                        <strong>Ganancia de XP por Trabajo:</strong>
                                        <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem', marginBottom: 0, fontSize: '0.8rem' }}>
                                            <li>Mayor a $100.000: <strong>80 XP</strong></li>
                                            <li>De $45.000 a $100.000: <strong>40 XP</strong></li>
                                            <li>De $15.000 a $45.000: <strong>30 XP</strong></li>
                                            <li>De $5.000 a $15.000: <strong>10 XP</strong></li>
                                        </ul>
                                        {currentLevel === 1 && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                                                * Nivel 1: Menos de $100.000 otorga 40 XP fijos.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span>{xpDisplayText}</span>
                        </div>
                        <div className="xp-bar-bg">
                            <div className="xp-bar-fill" style={{ width: `${xpPercentage}%`, background: isMaxLevel ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
                        </div>
                        {isMaxLevel && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#FFD700', textAlign: 'right' }}>
                                ★ Eres una Leyenda de Cooplance
                            </p>
                        )}
                        {!isMaxLevel && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Faltan {nextLevelXP - currentXP} XP para subir de nivel
                            </p>
                        )}
                    </div>
                )}

                {(user.role === 'freelancer' || user.role === 'company') && (
                    <>
                        <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
                        <div className="jobs-list">
                            {myWork.length > 0 ? myWork.map(job => (
                                <div key={job.id} className="glass job-card order-card" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '70px 1fr auto', 
                                    gap: '1.5rem', 
                                    alignItems: 'center',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    marginBottom: '1rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{
                                        width: '70px',
                                        height: '70px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid var(--primary)',
                                        boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
                                        position: 'relative'
                                    }}>
                                        <img
                                            src={getProfilePicture({ role: job.buyerRole, avatar: job.buyerAvatar })}
                                            alt={job.buyerName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    <div className="job-details">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                                                {job.buyerUsername ? `@${job.buyerUsername}` : 'Usuario'} 
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '400', marginLeft: '0.5rem' }}>
                                                    ({job.buyerRealName || job.buyerName})
                                                </span>
                                            </h4>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                background: job.buyerRole === 'company' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                                color: job.buyerRole === 'company' ? '#06b6d4' : '#8b5cf6',
                                                border: `1px solid ${job.buyerRole === 'company' ? '#22d3ee' : '#a78bfa'}`,
                                                textTransform: 'uppercase',
                                                fontWeight: 'bold',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {job.buyerRole === 'company' ? 'Empresa' : 'Particular'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0.2rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                            Ha contratado: <strong style={{ color: 'var(--primary)' }}>{job.serviceTitle}</strong> ({job.tier || 'Estándar'})
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.5rem' }}>
                                            <span style={{ 
                                                fontSize: '0.8rem', 
                                                padding: '4px 12px', 
                                                borderRadius: '12px',
                                                background: 'rgba(0,0,0,0.05)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                Estado: <strong style={{ 
                                                    color: job.status === 'active' ? '#10b981' : 
                                                           job.status === 'pending_approval' ? '#fbbf24' : 
                                                           job.status === 'delivered' ? '#3b82f6' : 'var(--text-secondary)' 
                                                }}>
                                                    {job.status === 'pending_approval' ? 'Pendiente' : 
                                                     job.status === 'active' ? 'En Progreso' : 
                                                     job.status === 'delivered' ? 'Entregado' : job.status}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>${job.amount}</div>
                                        
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            {/* Chat Button for Seller - Premium Outline Style */}
                                            <button 
                                                className="btn-secondary" 
                                                onClick={async () => {
                                                    setIsCreatingChat(true);
                                                    try {
                                                        const chatId = await createChat([user.id, job.buyerId], 'order', job.id, job.serviceTitle);
                                                        if (chatId) {
                                                            navigate(`/chat/${chatId}`);
                                                        } else {
                                                            setIsCreatingChat(false);
                                                        }
                                                    } catch (err) {
                                                        console.error("Chat navigation error:", err);
                                                        setIsCreatingChat(false);
                                                    }
                                                }}
                                                style={{ 
                                                    padding: '0.6rem 1.2rem', 
                                                    borderRadius: '12px', 
                                                    fontSize: '0.85rem', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    background: 'rgba(139, 92, 246, 0.05)',
                                                    border: '1.5px solid var(--primary)',
                                                    color: 'var(--primary)',
                                                    fontWeight: '600',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.3)';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                Chat
                                            </button>

                                            {job.status === 'pending_approval' && (
                                                <>
                                                    <button 
                                                        className="btn-primary" 
                                                        onClick={() => updateJobStatus(job.id, 'active')}
                                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem' }}
                                                    >
                                                        Aceptar Servicio
                                                    </button>
                                                    <button 
                                                        className="btn-secondary" 
                                                        onClick={() => updateJobStatus(job.id, 'canceled')}
                                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}
                                                    >
                                                        Rechazar
                                                    </button>
                                                </>
                                            )}
                                            
                                            {job.status === 'active' && (
                                                <button 
                                                    className="btn-primary" 
                                                    onClick={() => updateJobStatus(job.id, 'delivered')}
                                                    style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem' }}
                                                >
                                                    Entregar Trabajo
                                                </button>
                                            )}
                                            
                                            {job.status === 'delivered' && (
                                                <span style={{ color: '#3b82f6', fontSize: '0.9rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #3b82f6' }}>
                                                    ⏰ Esperando revisión
                                                </span>
                                            )}
                                            
                                            {job.status === 'completed' && (
                                                <span style={{ color: '#10b981', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #10b981' }}>
                                                    ✓ Completado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p>Aún no has recibido pedidos.</p>
                                </div>
                            )}
                        </div>

                        <div className="proposal-section-header">
                            <h3 className="section-title">Mis Postulaciones</h3>
                            <div className="proposal-tabs">
                                <button 
                                    className={`proposal-tab ${activeProposalTab === 'active' ? 'active' : ''}`}
                                    onClick={() => setActiveProposalTab('active')}
                                >
                                    Activas 
                                    <span className="tab-count">
                                        {myProposals.filter(p => p.status === 'pending').length}
                                    </span>
                                </button>
                                <button 
                                    className={`proposal-tab ${activeProposalTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveProposalTab('history')}
                                >
                                    Historial
                                    <span className="tab-count">
                                        {myProposals.filter(p => p.status !== 'pending').length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="jobs-list">
                            {filteredProposals.length > 0 ? filteredProposals.map(proposal => (
                                <div
                                    key={proposal.id}
                                    className={`proposal-card status-${proposal.status}`}
                                    onClick={() => navigate(`/project/${proposal.projectId}`)}
                                >
                                    <div className="proposal-card-info">
                                        <div className="proposal-card-title">
                                            <h4>{proposal.projectTitle}</h4>
                                            {proposal.clientRole && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: proposal.clientRole === 'company' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                    color: proposal.clientRole === 'company' ? '#06b6d4' : '#8b5cf6',
                                                    border: '1px solid currentColor'
                                                }}>
                                                    {proposal.clientRole === 'company' ? 'Empresa' : 'Particular'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="proposal-card-meta">
                                            <span className="proposal-time-ago">
                                                <svg style={{width:'12px', height:'12px', marginRight:'4px', verticalAlign:'middle'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                {getTimeAgo(proposal.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="proposal-card-right">
                                        <span className={`status-badge ${(proposal.status || '').toLowerCase()}`}>
                                            {(() => {
                                                const s = (proposal.status || '').toLowerCase();
                                                if (s === 'pending') return 'Pendiente';
                                                if (s === 'accepted') return 'Aceptado';
                                                if (s === 'canceled') return 'Cancelado';
                                                if (s === 'rejected') return 'Rechazado';
                                                if (s === 'completed') return 'Completado';
                                                return proposal.status;
                                            })()}
                                        </span>

                                        <div className="proposal-dots-wrapper" onClick={e => e.stopPropagation()}>
                                            <button 
                                                className="proposal-dots-btn"
                                                onClick={() => setOpenMenuId(openMenuId === proposal.id ? null : proposal.id)}
                                            >
                                                ⋮
                                            </button>
                                            
                                            {openMenuId === proposal.id && (
                                                <div className="proposal-dots-menu">
                                                    <button onClick={() => navigate(`/project/${proposal.projectId}`)}>
                                                        <svg style={{width:'14px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                        Ver Detalles / Entrevista
                                                    </button>
                                                                      {((proposal.status || '').toLowerCase()) === 'pending' ? (
                                                        <button 
                                                            className="danger" 
                                                            onClick={(e) => handleCancelProposal(e, proposal.id)}
                                                        >
                                                            <svg style={{width:'14px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                                            Cancelar Postulación
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="danger" 
                                                            onClick={(e) => handleDeleteProposal(e, proposal.id)}
                                                        >
                                                            <svg style={{width:'14px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6 v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            Borrar del Historial
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="proposal-empty">
                                    <p>{activeProposalTab === 'active' ? 'No tienes postulaciones activas.' : 'Tu historial está vacío.'}</p>
                                    {activeProposalTab === 'active' && (
                                        <button className="btn-primary" onClick={() => navigate('/explore-clients')}>
                                            Explorar Proyectos
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <h3 className="section-title">Mis Servicios Activos</h3>
                        <div className="services-grid">
                            {myServices.length > 0 ? (
                                myServices.map(service => (
                                    <ServiceCard key={service.id} service={{ ...service, level: user.level || 1 }} />
                                ))
                            ) : (
                                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                    <p style={{ marginBottom: '1rem' }}>No tienes servicios activos actualmente.</p>
                                    <button className="btn-primary" onClick={handleCreateServiceClick}>Crear mi primer servicio</button>
                                </div>
                            )}

                            {/* "Create More" Card - Always Visible if they have services */}
                            {myServices.length > 0 && (
                                <div
                                    className="glass service-card clickable"
                                    onClick={handleCreateServiceClick}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '300px', // Match ServiceCard height
                                        border: '2px dashed var(--border)',
                                        cursor: 'pointer',
                                        backgroundColor: 'var(--bg-card)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        color: '#8b5cf6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </div>
                                    <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Crear Nuevo Servicio</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 1rem' }}>
                                        {myServices.length >= ((user.level || 1) >= 5 ? 5 : (user.level || 1))
                                            ? `Límite alcanzado (Máx 5)`
                                            : 'Amplía tu oferta'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </>

            {/* LEVEL UP MODAL */}
            <LevelUpModal
                isOpen={showLevelUpModal}
                onClose={() => setShowLevelUpModal(false)}
                level={currentLevel}
            />

            {/* SHARED SECTIONS (Orders & Explore) */}
            {/* Show for buyers, companies, OR freelancers who have bought something */}
            {(user.role === 'buyer' || user.role === 'company' || (user.role === 'freelancer' && myOrders.length > 0)) && (
                <>
                    {/* CLIENT'S PUBLISHED PROJECTS */}
                    {(user.role === 'buyer' || user.role === 'company') && (
                        <>
                            <h3 className="section-title">{user.role === 'company' ? 'Mis Ofertas Laborales' : 'Mis Proyectos Publicados'}</h3>
                            <div className="services-grid">
                                {myPublishedProjects.length > 0 ? (
                                    myPublishedProjects.map(project => (
                                        <div key={project.id} style={{ position: 'relative' }}>
                                            <ProjectCard
                                                project={project}
                                                onApply={() => navigate(`/explore-clients?highlight=${project.id}`)} // Should link to manage proposals
                                            />
                                            {project.proposalCount > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    zIndex: 10
                                                }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProjectForProposals({ id: project.id, title: project.title });
                                                    }}
                                                >
                                                    {project.proposalCount}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                        <p>{user.role === 'company' ? 'No has publicado ofertas aún.' : 'No has publicado proyectos aún.'}</p>
                                        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/create-project')}>
                                            {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <h3 className="section-title" style={{ marginTop: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        Mis Pedidos (Compras)
                    </h3>
                    <div className="jobs-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
                        {myOrders.length > 0 ? myOrders.map(job => (
                            <div key={job.id} className="glass job-card order-card" style={{ 
                                display: 'flex', 
                                gap: '1.5rem', 
                                alignItems: 'center', 
                                padding: '1.2rem', 
                                borderRadius: '18px', 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border)', 
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--primary-soft)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                                
                                {/* Freelancer Avatar */}
                                <div style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    borderRadius: '16px', 
                                    overflow: 'hidden', 
                                    flexShrink: 0,
                                    border: '2px solid var(--primary-soft)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    <img 
                                        src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} 
                                        alt={job.freelancerName} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>{job.serviceTitle}</h4>
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            background: 'rgba(59, 130, 246, 0.1)', 
                                            color: '#60a5fa', 
                                            padding: '2px 10px', 
                                            borderRadius: '20px', 
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            textTransform: 'capitalize'
                                        }}>{job.tier}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <span style={{ opacity: 0.7 }}>Para:</span>
                                        <strong style={{ color: 'var(--primary-soft)' }}>{job.freelancerName}</strong>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>@{job.freelancerUsername || 'user'}</span>
                                    </div>
                                    <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ 
                                            fontSize: '0.8rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.4rem',
                                            color: job.status === 'active' ? '#10b981' : 
                                                   job.status === 'delivered' ? '#3b82f6' : 
                                                   job.status === 'completed' ? '#a78bfa' : 'var(--text-muted)'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }}></span>
                                            {job.status === 'active' ? 'En Progreso' : 
                                             job.status === 'delivered' ? 'Entregado (Revisar)' : 
                                             job.status === 'completed' ? 'Finalizado' : job.status}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>${job.amount}</div>
                                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                                        {/* Chat Button - Now Outline Style */}
                                        <button
                                            className="btn-secondary"
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.8rem', 
                                                borderRadius: '12px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.4rem',
                                                background: 'rgba(139, 92, 246, 0.05)',
                                                border: '1.5px solid var(--primary)',
                                                color: 'var(--primary)',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                                            }}
                                            onClick={async () => {
                                                setIsCreatingChat(true);
                                                try {
                                                    const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                                    if (chatId) {
                                                        navigate(`/chat/${chatId}`);
                                                    } else {
                                                        setIsCreatingChat(false);
                                                    }
                                                } catch (err) {
                                                    console.error("Chat navigation error:", err);
                                                    setIsCreatingChat(false);
                                                }
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            Chat
                                        </button>

                                        {/* Ver Detalle - Now Solid Style */}
                                        <button
                                            className="btn-primary"
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.8rem', 
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
                                            }}
                                            onClick={() => navigate(`/service/${job.serviceId}`)}
                                        >
                                            Ver Detalle
                                        </button>
                                    </div>
                                    
                                    {job.status === 'delivered' && (
                                        <button
                                            className="btn-primary"
                                            onClick={() => updateJobStatus(job.id, 'completed')}
                                            style={{ 
                                                width: '100%', 
                                                marginTop: '0.2rem', 
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                            }}
                                        >
                                            Aprobar Entrega
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="glass" style={{ padding: '3rem', color: 'var(--text-muted)', textAlign: 'center', borderRadius: '18px', border: '1px dashed var(--border)' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: '1rem' }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                <p>No has realizado pedidos aún. ¡Explora servicios para comenzar!</p>
                                <button className="btn-primary" onClick={() => navigate('/explore')} style={{ marginTop: '1rem' }}>Explorar Servicios</button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
