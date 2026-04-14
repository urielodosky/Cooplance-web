import React, { useState, useEffect, useMemo } from 'react';
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
import { calculateNextLevelXP, MAX_LEVEL, MAX_BUFFER_XP, activateVacation, XP_TABLE, processGamificationRules } from '../utils/gamification';
import { getProfilePicture } from '../utils/avatarUtils';
import { getProposalsByUser, updateProposalStatus, deleteProposal as deleteProposalApi } from '../lib/proposalService';
import { getProjectsByClient } from '../lib/projectService';
import '../styles/pages/Dashboard.scss';

// --- Sub-components for UI Blocks ---

const ListSkeleton = () => (
    <div className="skeleton-list">
        {[1, 2, 3].map(i => (
            <div key={i} className="glass skeleton-card" style={{ height: '100px', marginBottom: '1rem', opacity: 0.4, background: 'var(--border)', borderRadius: '16px' }}></div>
        ))}
    </div>
);

const GridSkeleton = () => (
    <div className="services-grid">
        {[1, 2, 3].map(i => (
            <div key={i} className="glass skeleton-card" style={{ height: '300px', opacity: 0.4, background: 'var(--border)', borderRadius: '20px' }}></div>
        ))}
    </div>
);

const XPProgressSection = ({ user, levelLabel, xpPercentage, isMaxLevel, xpDisplayText, nextLevelXP, currentXP }) => {
    if (user.role === 'company') return null;
    return (
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
                        </div>
                    </div>
                </div>
                <span>{xpDisplayText}</span>
            </div>
            <div className="xp-bar-bg">
                <div className="xp-bar-fill" style={{ width: `${xpPercentage}%`, background: isMaxLevel ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
            </div>
            {isMaxLevel ? (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#FFD700', textAlign: 'right' }}>★ Eres una Leyenda de Cooplance</p>
            ) : (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Faltan {nextLevelXP - currentXP} XP para subir de nivel</p>
            )}
        </div>
    );
};

const WorkReceivedSection = ({ loading, myWork, updateJobStatus, createChat, navigate, setIsCreatingChat, user }) => (
    <div style={{ marginTop: '2rem' }}>
        <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
        <div className="jobs-list">
            {loading && myWork.length === 0 ? (
                <ListSkeleton />
            ) : myWork.length > 0 ? (
                myWork.map(job => (
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
                            width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', position: 'relative'
                        }}>
                            <img src={getProfilePicture({ role: job.buyerRole, avatar: job.buyerAvatar })} alt={job.buyerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div className="job-details">
                            <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                                {job.buyerUsername ? `@${job.buyerUsername}` : 'Usuario'} 
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '400', marginLeft: '0.5rem' }}>({job.buyerRealName || job.buyerName})</span>
                            </h4>
                            <p style={{ margin: '0.2rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Contrató: <strong style={{ color: 'var(--primary)' }}>{job.serviceTitle}</strong> ({job.tier || 'Estándar'})</p>
                            <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                                Estado: <strong style={{ color: job.status === 'active' ? '#10b981' : job.status === 'delivered' ? '#3b82f6' : 'inherit' }}>{job.status}</strong>
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>${job.amount}</div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <button className="btn-secondary" onClick={async () => {
                                    setIsCreatingChat(true);
                                    try {
                                        const chatId = await createChat([user.id, job.buyerId], 'order', job.id, job.serviceTitle);
                                        if (chatId) navigate(`/chat/${chatId}`);
                                        else setIsCreatingChat(false);
                                    } catch { setIsCreatingChat(false); }
                                }}>Chat</button>
                                {job.status === 'pending_approval' && (
                                    <>
                                        <button className="btn-primary" onClick={() => updateJobStatus(job.id, 'active')}>Aceptar</button>
                                        <button className="btn-secondary" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => updateJobStatus(job.id, 'canceled')}>Rechazar</button>
                                    </>
                                )}
                                {job.status === 'active' && (
                                    <button className="btn-primary" onClick={() => updateJobStatus(job.id, 'delivered')}>Entregar</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                    <p>No tienes pedidos o trabajos recibidos aún.</p>
                </div>
            )}
        </div>
    </div>
);

const ProposalsSection = ({ loading, activeProposalTab, setActiveProposalTab, myProposals, filteredProposals, navigate, getTimeAgo, openMenuId, setOpenMenuId, handleCancelProposal, handleDeleteProposal }) => (
    <div style={{ marginTop: '2rem' }}>
        <div className="proposal-section-header">
            <h3 className="section-title">Mis Postulaciones</h3>
            <div className="proposal-tabs">
                <button className={`proposal-tab ${activeProposalTab === 'active' ? 'active' : ''}`} onClick={() => setActiveProposalTab('active')}>Activas <span className="tab-count">{myProposals.filter(p => p.status === 'pending').length}</span></button>
                <button className={`proposal-tab ${activeProposalTab === 'history' ? 'active' : ''}`} onClick={() => setActiveProposalTab('history')}>Historial <span className="tab-count">{myProposals.filter(p => p.status !== 'pending').length}</span></button>
            </div>
        </div>
        <div className="jobs-list">
            {loading && myProposals.length === 0 ? (
                <ListSkeleton />
            ) : filteredProposals.length > 0 ? (
                filteredProposals.map(proposal => (
                    <div key={proposal.id} className={`proposal-card status-${proposal.status}`} onClick={() => navigate(`/project/${proposal.projectId}`)}>
                        <div className="proposal-card-info">
                            <h4>{proposal.projectTitle}</h4>
                            <span className="proposal-time-ago">{getTimeAgo(proposal.createdAt)}</span>
                        </div>
                        <div className="proposal-card-right">
                            <span className={`status-badge ${proposal.status}`}>{proposal.status}</span>
                            <div className="proposal-dots-wrapper" onClick={e => e.stopPropagation()}>
                                <button className="proposal-dots-btn" onClick={() => setOpenMenuId(openMenuId === proposal.id ? null : proposal.id)}>⋮</button>
                                {openMenuId === proposal.id && (
                                    <div className="proposal-dots-menu">
                                        <button onClick={() => navigate(`/project/${proposal.projectId}`)}>Ver Detalles</button>
                                        {proposal.status === 'pending' ? (
                                            <button className="danger" onClick={(e) => handleCancelProposal(e, proposal.id)}>Cancelar</button>
                                        ) : (
                                            <button className="danger" onClick={(e) => handleDeleteProposal(e, proposal.id)}>Borrar</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="proposal-empty">
                    <p>{activeProposalTab === 'active' ? 'No tienes postulaciones activas.' : 'Tu historial está vacío.'}</p>
                </div>
            )}
        </div>
    </div>
);

const ServicesSection = ({ loading, myServices, user, handleCreateServiceClick }) => (
    <div style={{ marginTop: '2rem' }}>
        <h3 className="section-title">Mis Servicios Activos</h3>
        <div className="services-grid">
            {loading && myServices.length === 0 ? (
                <GridSkeleton />
            ) : myServices.length > 0 ? (
                <>
                    {myServices.map(service => (
                        <ServiceCard key={service.id} service={{ ...service, level: user.level || 1 }} />
                    ))}
                    <div className="glass service-card clickable" onClick={handleCreateServiceClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', background: 'var(--bg-card)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>+</div>
                        <h4 style={{ color: 'var(--primary)' }}>Crear Nuevo</h4>
                    </div>
                </>
            ) : (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                    <p style={{ marginBottom: '1rem' }}>No tienes servicios publicados aún.</p>
                    <button className="btn-primary" onClick={handleCreateServiceClick}>Publicar mi primer servicio</button>
                </div>
            )}
        </div>
    </div>
);

const PublishedProjectsSection = ({ loading, myPublishedProjects, navigate, setSelectedProjectForProposals, user }) => (
    <div style={{ marginTop: '2rem' }}>
        <h3 className="section-title">{user.role === 'company' ? 'Mis Ofertas Laborales' : 'Mis Proyectos Publicados'}</h3>
        <div className="services-grid">
            {loading && myPublishedProjects.length === 0 ? (
                <GridSkeleton />
            ) : myPublishedProjects.length > 0 ? (
                myPublishedProjects.map(project => (
                    <div key={project.id} style={{ position: 'relative' }}>
                        <ProjectCard project={project} onApply={() => navigate(`/explore-clients?highlight=${project.id}`)} />
                        {project.proposalCount > 0 && (
                            <div className="proposal-badge" style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }} onClick={(e) => { e.stopPropagation(); setSelectedProjectForProposals({ id: project.id, title: project.title }); }}>
                                {project.proposalCount}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                    <p>No tienes proyectos publicados aún.</p>
                    <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/create-project')}>Publicar Ahora</button>
                </div>
            )}
        </div>
    </div>
);

const OrdersSection = ({ loading, myOrders, navigate, createChat, updateJobStatus, setIsCreatingChat, user }) => (
    <div style={{ marginTop: '2.5rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>Mis Pedidos (Compras)</h3>
        <div className="jobs-list">
            {loading && myOrders.length === 0 ? (
                <ListSkeleton />
            ) : myOrders.length > 0 ? (
                myOrders.map(job => (
                    <div key={job.id} className="glass job-card order-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.2rem', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--primary-soft)' }}>
                            <img src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} alt={job.freelancerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{job.serviceTitle}</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Por: <strong style={{ color: 'var(--primary-soft)' }}>{job.freelancerName}</strong></p>
                            <span style={{ fontSize: '0.8rem', color: job.status === 'active' ? '#10b981' : '#3b82f6' }}>{job.status}</span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>${job.amount}</div>
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                <button className="btn-secondary" onClick={async () => {
                                    setIsCreatingChat(true);
                                    try {
                                        const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                        if (chatId) navigate(`/chat/${chatId}`);
                                        else setIsCreatingChat(false);
                                    } catch { setIsCreatingChat(false); }
                                }}>Chat</button>
                                <button className="btn-primary" onClick={() => navigate(`/service/${job.serviceId}`)}>Detalle</button>
                                {job.status === 'delivered' && (
                                    <button className="btn-primary" style={{ backgroundColor: '#10b981' }} onClick={() => updateJobStatus(job.id, 'completed')}>Aprobar</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '18px', border: '1px dashed var(--border)' }}>
                    <p>No tienes pedidos activos. ¡Explora servicios!</p>
                </div>
            )}
        </div>
    </div>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const { jobs, updateJobStatus } = useJobs();
    const { services } = useServices();
    const { createChat } = useChat();
    const navigate = useNavigate();

    if (!user) return null;

    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [myPublishedProjects, setMyPublishedProjects] = useState([]);
    const [myProposals, setMyProposals] = useState([]);
    const [activeProposalTab, setActiveProposalTab] = useState('active');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null);

    // Initial load and sync
    useEffect(() => {
        const loadInitData = async () => {
            const cachedProjects = localStorage.getItem(`cooplance_projects_${user.id}`);
            const cachedProposals = localStorage.getItem(`cooplance_proposals_${user.id}`);
            if (cachedProjects) setMyPublishedProjects(JSON.parse(cachedProjects));
            if (cachedProposals) setMyProposals(JSON.parse(cachedProposals));
            
            try {
                const projects = await getProjectsByClient(user.id);
                const proposals = await getProposalsByUser(user.id);
                setMyPublishedProjects(projects);
                setMyProposals(proposals);
                localStorage.setItem(`cooplance_projects_${user.id}`, JSON.stringify(projects));
                localStorage.setItem(`cooplance_proposals_${user.id}`, JSON.stringify(proposals));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        loadInitData();
    }, [user.id]);

    // Gamification Process
    useEffect(() => {
        if (user.role === 'freelancer' || user.role === 'company') {
            const processedUser = processGamificationRules(user);
            if (processedUser !== user) updateUser(processedUser);
        }
    }, [user, updateUser]);

    // Derived Data
    const myWork = useMemo(() => (jobs || []).filter(j => j.freelancerId === user.id), [jobs, user.id]);
    const myServices = useMemo(() => (services || []).filter(s => s.freelancerId === user.id), [services, user.id]);
    const myOrders = useMemo(() => (jobs || []).filter(j => j.buyerId === user.id), [jobs, user.id]);

    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const nextLevelXP = calculateNextLevelXP(currentLevel);
    const isMaxLevel = currentLevel >= MAX_LEVEL;
    const xpPercentage = isMaxLevel ? Math.min(Math.max(0, (currentXP - 10000) / MAX_BUFFER_XP) * 100, 100) : Math.min((currentXP / nextLevelXP) * 100, 100);
    const xpDisplayText = isMaxLevel ? `${currentXP - 10000} / ${MAX_BUFFER_XP} Buffer XP` : `${currentXP} / ${nextLevelXP} XP`;
    const levelLabel = isMaxLevel ? "Nivel Máximo (10)" : `Progreso al Nivel ${currentLevel + 1}`;

    const handleDemoLevelUp = () => {
        if ((user.level || 1) >= MAX_LEVEL) {
            const currentXP = user.xp || 0;
            const newXP = Math.min(currentXP + 1000, 10000 + MAX_BUFFER_XP);
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
        const newXp = newLevel > 1 ? XP_TABLE[newLevel - 1] : 0;
        updateUser({ ...user, level: newLevel, xp: newXp });
    };

    const handleVacationClick = () => {
        const g = user.gamification || {};
        if (g.vacation?.active) {
            alert("Ya estás en modo vacaciones.");
            return;
        }
        if ((g.vacation?.credits || 0) <= 0) {
            alert("No tienes créditos de vacaciones disponibles.");
            return;
        }
        if (window.confirm(`¿Activar modo vacaciones? Se pausará el decaimiento de XP. Te quedan ${g.vacation?.credits} usos.`)) {
            updateUser(activateVacation(user));
        }
    };

    const handleCreateServiceClick = () => {
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

    const handleAcceptProposal = async (proposal) => {
        const project = myPublishedProjects.find(p => p.id === proposal.projectId);
        if (!project) return;
        try {
            await updateProposalStatus(proposal.id, 'accepted');
            alert('Propuesta aceptada.');
            window.location.reload();
        } catch (err) { alert(err.message); }
    };

    const handleCancelProposal = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('¿Cancelar postulación?')) {
            await updateProposalStatus(id, 'canceled');
            setMyProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'canceled' } : p));
        }
    };

    const handleDeleteProposal = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('¿Borrar historial?')) {
            await deleteProposalApi(id);
            setMyProposals(prev => prev.filter(p => p.id !== id));
        }
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Ahora';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        return `Hace ${Math.floor(hours / 24)}d`;
    };

    const filteredProposals = myProposals.filter(p => {
        const status = (p.status || '').toLowerCase();
        return activeProposalTab === 'active' ? status === 'pending' : ['accepted', 'rejected', 'canceled', 'completed'].includes(status);
    });

    return (
        <div className="dashboard-container">
            <ProposalListModal isOpen={!!selectedProjectForProposals} onClose={() => setSelectedProjectForProposals(null)} projectId={selectedProjectForProposals?.id} projectTitle={selectedProjectForProposals?.title} onAccept={handleAcceptProposal} />
            
            {isCreatingChat && (
                <div className="dashboard-loading-overlay">
                    <div className="spinner"></div>
                    <p>Conectando...</p>
                </div>
            )}

            <div className="dashboard-intro">
                <div className="intro-left">
                    <img src={getProfilePicture(user)} alt="Profile" className="dashboard-avatar" />
                    <div>
                        <h2>Hola, {user.first_name || user.company_name || user.username}</h2>
                        <p>Bienvenido a tu panel.</p>
                    </div>
                </div>
                <div className="dashboard-actions-inline">
                    <button className="btn-primary" onClick={user.role === 'freelancer' ? handleCreateServiceClick : () => navigate('/create-project')}>
                        + {user.role === 'freelancer' ? 'Servicio' : 'Proyecto'}
                    </button>
                </div>
            </div>

            <div className="dashboard-stats-grid">
                {user.role !== 'company' && (
                    <div className="glass stat-card">
                        <h4>Nivel Actual</h4>
                        <p className="stat-value primary">{currentLevel}</p>
                        {user.id === 'cfb3e724-ce3d-4bd1-bc02-a289ef050b89' && (
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
                        )}
                    </div>
                )}
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
                                padding: '0.4rem',
                                background: user.gamification?.vacation?.active ? '#10b981' : 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: user.gamification?.vacation?.active ? 'default' : 'pointer',
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

            <XPProgressSection user={user} levelLabel={levelLabel} xpPercentage={xpPercentage} isMaxLevel={isMaxLevel} xpDisplayText={xpDisplayText} nextLevelXP={nextLevelXP} currentXP={currentXP} />

            {(user.role === 'freelancer' || user.role === 'company') && (
                <>
                    <WorkReceivedSection loading={loading} myWork={myWork} updateJobStatus={updateJobStatus} createChat={createChat} navigate={navigate} setIsCreatingChat={setIsCreatingChat} user={user} />
                    <ProposalsSection loading={loading} activeProposalTab={activeProposalTab} setActiveProposalTab={setActiveProposalTab} myProposals={myProposals} filteredProposals={filteredProposals} navigate={navigate} getTimeAgo={getTimeAgo} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} handleCancelProposal={handleCancelProposal} handleDeleteProposal={handleDeleteProposal} />
                    <ServicesSection loading={loading} myServices={myServices} user={user} handleCreateServiceClick={handleCreateServiceClick} />
                </>
            )}

            {(user.role === 'buyer' || user.role === 'company' || myOrders.length > 0) && (
                <>
                    {(user.role === 'buyer' || user.role === 'company') && (
                        <PublishedProjectsSection loading={loading} myPublishedProjects={myPublishedProjects} navigate={navigate} setSelectedProjectForProposals={setSelectedProjectForProposals} user={user} />
                    )}
                    <OrdersSection loading={loading} myOrders={myOrders} navigate={navigate} createChat={createChat} updateJobStatus={updateJobStatus} setIsCreatingChat={setIsCreatingChat} user={user} />
                </>
            )}

            <LevelUpModal isOpen={showLevelUpModal} onClose={() => setShowLevelUpModal(false)} level={currentLevel} />
        </div>
    );
};

export default Dashboard;
