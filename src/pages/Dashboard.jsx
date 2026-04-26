import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Send, MessageSquare, Info, Check, Star } from 'lucide-react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useServices } from '../features/services/context/ServiceContext';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';
import ServiceCard from '../features/services/components/ServiceCard';
import ProjectCard from '../components/project/ProjectCard';
import LevelUpModal from '../components/gamification/LevelUpModal';
import ProposalListModal from '../components/project/ProposalListModal';
import ReviewModal from '../components/common/ReviewModal';
import * as ReviewService from '../services/ReviewService';
import { calculateNextLevelXP, getBaseXPForLevel, MAX_LEVEL, MAX_BUFFER_XP, activatePauseMode, deactivatePauseMode, XP_TABLE, processGamificationRules } from '../utils/gamification';
import { getProfilePicture } from '../utils/avatarUtils';
import { getBenefitsForRole } from '../data/levelBenefits';
import { getProposalsByUser, updateProposalStatus, deleteProposal as deleteProposalApi, getReceivedProposals } from '../lib/proposalService';
import { getProjectsByClient, deleteProject as deleteProjectApi } from '../lib/projectService';
import { supabase } from '../lib/supabase';
import { BADGE_FAMILIES, CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
import { useBadgeNotification } from '../context/BadgeNotificationContext';
import '../styles/pages/Dashboard.scss';

// --- Utilities ---

const getPreciseTimeRemaining = (deadline) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) return 'Vencido';

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (totalHours >= 48) {
        return `${days}d ${hours}h`;
    } else if (totalHours > 0) {
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    } else {
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        return `${minutes}m ${seconds}s`;
    }
};

const RevisionCountdown = ({ updatedAt }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTime = () => {
            const deliveryDate = new Date(updatedAt);
            const limitDate = new Date(deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
            const now = new Date();
            const diffMs = limitDate - now;

            if (diffMs <= 0) {
                setTimeLeft('Expirado');
                return;
            }

            const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [updatedAt]);

    return (
        <span style={{ 
            fontSize: '0.75rem', 
            color: '#f59e0b', 
            fontWeight: '700', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            background: 'rgba(245, 158, 11, 0.08)',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
            ⏳ {timeLeft}
        </span>
    );
};

const getRemainingDays = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
};

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
                                {user.level > 1 ? (
                                    <>
                                        <li>Mayor a $100.000: <strong>80 XP</strong></li>
                                        <li>De $45.000 a $100.000: <strong>40 XP</strong></li>
                                        <li>De $15.000 a $45.000: <strong>30 XP</strong></li>
                                        <li>De $5.000 a $15.000: <strong>10 XP</strong></li>
                                    </>
                                ) : (
                                    <>
                                        <li>Mayor a $100.000: <strong>80 XP</strong></li>
                                        <li>De $5.000 a $100.000: <strong>40 XP</strong></li>
                                        <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.3rem' }}>* Los trabajos menores a $5.000 no otorgan XP en Nivel 1.</li>
                                    </>
                                )}
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
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Faltan {nextLevelXP - (currentXP - getBaseXPForLevel(user.level || 1))} XP para subir de nivel</p>
            )}
        </div>
    );
};

const WorkReceivedSection = ({ loading, myWork, updateJobStatus, createChat, navigate, setIsCreatingChat, user, setSelectedJobForReview, reviewedJobs }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredWork = useMemo(() => {
        return myWork.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered', 'pending_approval'].includes(job.status);
            return ['completed', 'canceled', 'rejected'].includes(job.status);
        });
    }, [myWork, activeTab]);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myWork.filter(j => ['active', 'delivered', 'pending_approval'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myWork.filter(j => ['completed', 'canceled', 'rejected'].includes(j.status)).length}</span></button>
                </div>
            </div>
            <div className="dashboard-list-scroll">
                {loading && myWork.length === 0 ? (
                    <ListSkeleton />
                ) : filteredWork.length > 0 ? (
                    filteredWork.map(job => (
                        <div key={job.id} className="glass job-card order-card premium-job-card" style={{
                            display: 'flex',
                            gap: '1.2rem',
                            alignItems: 'center',
                            padding: '0.8rem 1.2rem',
                            borderRadius: '20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            {/* Avatar Section */}
                            <div style={{
                                width: '60px', 
                                height: '60px', 
                                borderRadius: '50%', 
                                overflow: 'hidden', 
                                border: '2px solid var(--primary)',
                                flexShrink: 0,
                                boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
                            }}>
                                <img src={getProfilePicture({ role: job.buyerRole, avatar: job.buyerAvatar })} alt={job.buyerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            {/* Info Section */}
                            <div className="job-main-info" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '4px' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {job.buyerUsername ? `@${job.buyerUsername}` : 'Usuario'}
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>• {job.buyerRealName || 'Cliente'}</span>
                                    
                                    {/* Inline Deadline Badge */}
                                    {(() => {
                                        const preciseTime = job.deadline ? getPreciseTimeRemaining(job.deadline) : null;
                                        if (!preciseTime || job.status !== 'active') return null;
                                        
                                        const isUrgent = preciseTime.includes('h') && !preciseTime.includes('d'); // Less than 24h
                                        const isVencido = preciseTime === 'Vencido';

                                        return (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: (isUrgent || isVencido) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: (isUrgent || isVencido) ? '#ef4444' : '#10b981',
                                                fontWeight: '800',
                                                border: '1px solid currentColor',
                                                textTransform: 'uppercase'
                                            }}>
                                                {preciseTime === 'Vencido' ? 'VENCIDO' : preciseTime}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Contrató: <strong style={{ color: 'var(--primary-soft)', fontWeight: '700' }}>{job.serviceTitle}</strong>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-body)', color: 'var(--text-muted)', fontWeight: '700', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
                                        {job.tier || 'Estándar'}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.85rem', 
                                        color: job.status === 'active' ? '#10b981' : (job.status === 'delivered' ? '#6366f1' : '#f59e0b'), 
                                        fontWeight: '800', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: job.status === 'active' ? 'rgba(16, 185, 129, 0.08)' : (job.status === 'delivered' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(245, 158, 11, 0.08)'),
                                        border: '1px solid currentColor'
                                    }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }}></span>
                                        {job.status === 'active' ? 'EN PROGRESO' : 
                                         job.status === 'delivered' ? 'PENDIENTE DE FINALIZAR' : 
                                         job.status === 'pending_approval' ? 'POR ACEPTAR' : (job.status?.toUpperCase() || 'ESTADO')}
                                    </span>
                                </div>
                            </div>

                            {/* Price & Actions Section */}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end', minWidth: '160px' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>${job.amount}</div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <button className="btn-secondary" style={{ 
                                        padding: '0.5rem 1.2rem', 
                                        fontSize: '0.85rem', 
                                        borderRadius: '12px',
                                        background: 'var(--border)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-primary)',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'var(--shadow-sm)'
                                    }} onClick={async () => {
                                        setIsCreatingChat(true);
                                        try {
                                            const chatId = await createChat([user.id, job.buyerId], 'order', job.id, job.serviceTitle);
                                            if (chatId) navigate(`/chat/${chatId}`);
                                            else setIsCreatingChat(false);
                                        } catch { setIsCreatingChat(false); }
                                    }}>Chat</button>
                                    
                                    <button className="btn-outline" style={{ 
                                        padding: '0.5rem 1.2rem', 
                                        fontSize: '0.85rem', 
                                        borderRadius: '12px', 
                                        borderColor: 'var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '500'
                                    }} onClick={() => {
                                        if (job.projectId) navigate(`/project/${job.projectId}`);
                                        else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                                    }}>Detalle</button>

                                    {job.status === 'active' && (
                                        <button 
                                            className="btn-primary premium-deliver-btn" 
                                            style={{ 
                                                padding: '0.6rem 1.6rem', 
                                                fontSize: '0.85rem', 
                                                borderRadius: '14px', 
                                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                border: 'none',
                                                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                                                fontWeight: '800',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: 'white',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                cursor: 'pointer'
                                            }} 
                                            onClick={async () => {
                                                if (window.confirm("¿Estás seguro de que deseas entregar este trabajo? Se notificará al cliente para su revisión.")) {
                                                    await updateJobStatus(job.id, 'delivered');
                                                    alert("¡Trabajo entregado con éxito! El cliente ha sido notificado.");
                                                }
                                            }}
                                        >
                                            <PackageCheck size={18} />
                                            Entregar Trabajo
                                        </button>
                                    )}

                                    {job.status === 'pending_approval' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444', borderRadius: '12px' }} onClick={async () => {
                                                 if(window.confirm("¿Rechazar este trabajo? Se le devolverá el dinero al cliente.")) {
                                                    await updateJobStatus(job.id, 'rejected');
                                                }
                                            }}>Rechazar</button>
                                            <button className="btn-primary" style={{ backgroundColor: '#10b981', border: 'none', borderRadius: '12px' }} onClick={async () => {
                                                 await updateJobStatus(job.id, 'active');
                                                alert("¡Trabajo aceptado! Ahora puedes empezar a trabajar.");
                                            }}>Aceptar Trabajo</button>
                                        </div>
                                    )}
                                    
                                    {job.status === 'completed' && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.85rem', 
                                                borderRadius: '12px',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                border: '1px solid #f59e0b',
                                                color: '#f59e0b',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }} 
                                            onClick={() => setSelectedJobForReview(job)}
                                        >
                                            <Star size={14} />
                                            {reviewedJobs[job.id] ? 'Modificar Reseña' : 'Calificar Cliente'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                        <p>{activeTab === 'active' ? 'No tienes pedidos o trabajos recibidos aún.' : 'Tu historial está vacío.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProposalsSection = ({
    loading,
    activeProposalTab,
    setActiveProposalTab,
    myProposals,
    filteredProposals,
    navigate,
    getTimeAgo,
    openMenuId,
    setOpenMenuId,
    handleCancelProposal,
    handleDeleteProposal,
    expandedProposalId,
    setExpandedProposalId,
    getRemainingDays
}) => (
    <div style={{ marginTop: '2rem' }}>
        <div className="proposal-section-header">
            <h3 className="section-title">Mis Postulaciones</h3>
            <div className="proposal-tabs">
                <button className={`proposal-tab ${activeProposalTab === 'active' ? 'active' : ''}`} onClick={() => setActiveProposalTab('active')}>En Proceso <span className="tab-count">{myProposals.filter(p => (p.status || '').toLowerCase().trim() === 'pending').length}</span></button>
                <button className={`proposal-tab ${activeProposalTab === 'history' ? 'active' : ''}`} onClick={() => setActiveProposalTab('history')}>Historial <span className="tab-count">{myProposals.filter(p => (p.status || '').toLowerCase().trim() !== 'pending').length}</span></button>
            </div>
        </div>
        <div className="dashboard-list-scroll">
            {loading && myProposals.length === 0 ? (
                <ListSkeleton />
            ) : filteredProposals.length > 0 ? (
                filteredProposals.map(proposal => {
                    const daysLeft = getRemainingDays(proposal.projectDeadline);
                    const isExpanded = expandedProposalId === proposal.id;

                    return (
                        <div key={proposal.id} className={`proposal-card enhanced status-${proposal.status} ${isExpanded ? 'expanded' : ''}`} onClick={() => navigate(`/project/${proposal.projectId}`)}>
                            <div className="proposal-card-content">
                                <div className="proposal-client-info" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(proposal.clientRole === 'company' ? `/company/${proposal.clientId}` : `/client/${proposal.clientId}`);
                                }}>
                                    <div className="client-avatar-wrapper">
                                        <img src={getProfilePicture({ role: proposal.clientRole, avatar: proposal.clientAvatar })} alt={proposal.clientUsername} />
                                    </div>
                                    <div className="client-details">
                                        <span className="client-username">@{proposal.clientUsername || 'usuario'}</span>
                                        {proposal.clientRealName && <span className="client-realname">{proposal.clientRealName}</span>}
                                    </div>
                                </div>

                                <div className="proposal-main-details">
                                    <h4>{proposal.projectTitle}</h4>
                                    <div className="proposal-meta">
                                        <span className="meta-item time">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            Enviada {getTimeAgo(proposal.createdAt)}
                                        </span>
                                        {proposal.status === 'pending' && proposal.projectDeadline && (
                                            <span className={`meta-item deadline ${getRemainingDays(proposal.projectDeadline) <= 2 ? 'urgent' : ''}`}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                {getPreciseTimeRemaining(proposal.projectDeadline) === 'Vencido' ? 'Vencido' : `Quedan ${getPreciseTimeRemaining(proposal.projectDeadline)}`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="proposal-actions">
                                    <button
                                        className={`btn-text-link letter-toggle ${isExpanded ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedProposalId(isExpanded ? null : proposal.id);
                                        }}
                                    >
                                        {isExpanded ? 'Ocultar Carta' : 'Ver Carta'}
                                    </button>

                                    <span className={`status-badge ${proposal.status}`}>{proposal.status === "accepted" ? "FINALIZADO" : (proposal.status === "pending" ? "EN PROCESO" : proposal.status)}</span>

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

                            {isExpanded && (
                                <div className="proposal-letter-box" onClick={e => e.stopPropagation()}>
                                    <h5>Mi Carta de Presentación</h5>
                                    <p>{proposal.coverLetter || 'Sin mensaje adjunto.'}</p>
                                </div>
                            )}
                        </div>
                    );
                })
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
        <div className="dashboard-services-scroll">
            <div className="services-grid">
                {loading && myServices.length === 0 ? (
                    <GridSkeleton />
                ) : myServices.length > 0 ? (
                    <>
                        {myServices.map(service => (
                            <ServiceCard key={service.id} service={{ ...service, level: user.level || 1 }} />
                        ))}
                        <div className="glass service-card clickable" onClick={handleCreateServiceClick} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            border: '2px dashed var(--border)', 
                            background: 'var(--bg-card)', 
                            padding: '1.5rem', 
                            boxShadow: 'var(--shadow-sm)',
                            minHeight: '360px',
                            height: '100%',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '50%', 
                                background: 'rgba(139, 92, 246, 0.1)', 
                                color: 'var(--primary)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                marginBottom: '0.75rem', 
                                fontSize: '1.25rem',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>+</div>
                            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '700', margin: 0 }}>Crear Nuevo Servicio</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem', textAlign: 'center', maxWidth: '180px' }}>Empieza a vender tus talentos ahora</p>
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
    </div>
);

const PublishedProjectsSection = ({ loading, myPublishedProjects, navigate, setSelectedProjectForProposals, user, onDelete }) => {
    const [activeTab, setActiveTab] = useState('open');

    const filtered = useMemo(() => {
        return myPublishedProjects.filter(p => {
            if (activeTab === 'open') return (p.status || 'open') === 'open';
            return p.status === 'hired' || p.status === 'closed';
        });
    }, [myPublishedProjects, activeTab]);

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title">{user.role === 'company' ? 'Mis Ofertas Laborales' : 'Mis Proyectos Publicados'}</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'open' ? 'active' : ''}`} onClick={() => setActiveTab('open')}>Abiertos <span className="tab-count">{myPublishedProjects.filter(p => (p.status || 'open') === 'open').length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Historial <span className="tab-count">{myPublishedProjects.filter(p => p.status === 'hired' || p.status === 'closed').length}</span></button>
                </div>
            </div>
            <div className="services-grid">
                {loading && myPublishedProjects.length === 0 ? (
                    <GridSkeleton />
                ) : filtered.length > 0 ? (
                    filtered.map(project => (
                        <div key={project.id} style={{ position: 'relative' }}>
                            <ProjectCard
                                project={project}
                                onApply={() => navigate(`/explore-clients?highlight=${project.id}`)}
                                onDelete={onDelete}
                            />
                            {project.proposalCount > 0 && project.status === 'open' && (
                                <div className="proposal-badge" style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={(e) => { e.stopPropagation(); setSelectedProjectForProposals({ id: project.id, title: project.title }); }}>
                                    {project.proposalCount}
                                </div>
                            )}
                            {project.status === 'hired' && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', zIndex: 5 }}>CONTRATADO</div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                        <p>{activeTab === 'open' ? 'No tienes proyectos abiertos ahora mismo.' : 'Tu historial de proyectos está vacío.'}</p>
                        {activeTab === 'open' && <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/create-project')}>Publicar Ahora</button>}
                    </div>
                )}
            </div>
        </div>
    );
};

const OrdersSection = ({ loading, myOrders, navigate, createChat, updateJobStatus, setIsCreatingChat, user, setSelectedJobForReview, reviewedJobs }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredOrders = useMemo(() => {
        return myOrders.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered', 'pending_approval'].includes(job.status);
            return ['completed', 'canceled', 'rejected'].includes(job.status);
        });
    }, [myOrders, activeTab]);

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>Mis Pedidos / Servicios Contratados</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myOrders.filter(j => ['active', 'delivered', 'pending_approval'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myOrders.filter(j => ['completed', 'canceled', 'rejected'].includes(j.status)).length}</span></button>
                </div>
            </div>
            <div className="dashboard-list-scroll">
                {loading && myOrders.length === 0 ? (
                    <ListSkeleton />
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(job => (
                        <div key={job.id} className={`proposal-card enhanced status-${job.status}`} onClick={() => {
                            if (job.projectId) navigate(`/project/${job.projectId}`);
                            else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                        }}>
                            <div className="proposal-card-content">
                                <div className="proposal-client-info" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(job.freelancerRole === 'company' ? `/company/${job.freelancerId}` : `/freelancer/${job.freelancerId}`);
                                }}>
                                    <div className="client-avatar-wrapper">
                                        <img src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} alt={job.freelancerName} />
                                    </div>
                                    <div className="client-details">
                                        <span className="client-username">@{job.freelancerUsername || 'usuario'}</span>
                                        {job.freelancerName && <span className="client-realname">{job.freelancerName}</span>}
                                    </div>
                                </div>

                                <div className="proposal-main-details">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{job.serviceTitle}</h4>
                                        {(() => {
                                            const preciseTime = job.deadline ? getPreciseTimeRemaining(job.deadline) : null;
                                            if (!preciseTime || job.status !== 'active') return null;
                                            return (
                                                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-soft)', fontWeight: '800', border: '1px solid currentColor' }}>
                                                    {preciseTime}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="proposal-meta">
                                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: job.status === 'completed' ? '#10b981' : (job.status === 'active' ? '#3b82f6' : '#f59e0b') }}>
                                            • {job.status === 'active' ? 'EN PROGRESO' : job.status === 'delivered' ? 'ENTREGADO' : job.status === 'completed' ? 'FINALIZADO' : 'ESPERANDO'}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-primary)', marginLeft: '1rem' }}>${job.amount}</span>
                                    </div>
                                </div>

                                <div className="proposal-actions" style={{ gap: '0.5rem' }}>
                                    {job.status === 'completed' && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.4rem 0.8rem', 
                                                fontSize: '0.75rem', 
                                                borderRadius: '8px',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                border: '1px solid #10b981',
                                                color: '#10b981',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedJobForReview(job); }}
                                        >
                                            <Star size={12} />
                                            {reviewedJobs[job.id] ? 'Modificar Reseña' : 'Calificar'}
                                        </button>
                                    )}
                                    <button className="btn-chat-mini" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={async (e) => {
                                        e.stopPropagation();
                                        setIsCreatingChat(true);
                                        try {
                                            const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                            if (chatId) navigate(`/chat/${chatId}`);
                                            else setIsCreatingChat(false);
                                        } catch { setIsCreatingChat(false); }
                                    }}>Chat</button>
                                    <button className="btn-detail-mini" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={(e) => {
                                        e.stopPropagation();
                                        if (job.projectId) navigate(`/project/${job.projectId}`);
                                        else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                                    }}>Detalle</button>
                                </div>
                            </div>
                        </div>
                    ));
            setSelectedJobForReview(null);
            alert("¡Gracias por tu reseña!");
        } catch (err) {
            console.error("Error submitting review:", err);
            alert("No se pudo guardar la reseña.");
        }
    };

    return (
        <div className="dashboard-container">
            <ProposalListModal isOpen={!!selectedProjectForProposals} onClose={() => setSelectedProjectForProposals(null)} projectId={selectedProjectForProposals?.id} projectTitle={selectedProjectForProposals?.title} onAccept={handleAcceptProposal} />

            <PaymentSelectionModal
                isOpen={!!selectedProposalForPayment}
                onClose={() => setSelectedProposalForPayment(null)}
                onConfirm={confirmHiringWithPayment}
                methods={selectedProposalForPayment?.project?.paymentMethods}
                amount={selectedProposalForPayment?.project?.budget}
                title={selectedProposalForPayment?.project?.title}
            />

            {isCreatingChat && (
                <div className="dashboard-loading-overlay">
                    <div className="spinner"></div>
                    <p>Conectando...</p>
                </div>
            )}

            <div className="dashboard-intro">
                <div className="intro-left">
                    <img src={getProfilePicture(user)} alt="Profile" className="dashboard-avatar" />
                    <div className="dashboard-intro-info">
                        <h2>Hola, {user.first_name || user.company_name || user.username}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Bienvenido a tu panel.</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span>{[user.city, user.province, user.country].filter(Boolean).join(', ') || 'Planeta Tierra'}</span>
                            </div>
                            {isPaused && (
                                <span className="status-badge-active-pause ripple-effect">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" /></svg>
                                    MODO PAUSA ACTIVO
                                </span>
                            )}
                            <button 
                                onClick={() => navigate(user.role === 'freelancer' ? `/freelancer/${user.id}` : (user.role === 'company' ? `/company/${user.id}` : `/client/${user.id}`))}
                                className="btn-text-link"
                                style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                            >
                                Ver mi perfil público
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dashboard-actions-inline">
                    <button className="btn-primary" onClick={user.role === 'freelancer' ? handleCreateServiceClick : handleCreateProjectClick}>
                        + {user.role === 'freelancer' ? 'Servicio' : 'Proyecto'}
                    </button>
                </div>
            </div>

            <div className="dashboard-stats-grid">
                <div className="glass stat-card level-stat-card">
                    <h4 className="stat-label">Nivel Actual</h4>
                    <p className="stat-value primary">{currentLevel}</p>
                    <p className="stat-subtitle">
                        {currentLevelName}
                    </p>
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
                {user.role === 'freelancer' && (
                    <div className="glass stat-card pause-stat-card">
                        <div className="pause-mode-header">
                            <h4>Modo Pausa</h4>
                            <div className="help-icon" title="En Modo Pausa, tus servicios aparecen al final de las listas y no recibes pedidos.">?</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <button
                                onClick={handlePauseModeClick}
                                className={`pause-toggle-btn ${(user.gamification?.pause_mode?.active || user.gamification?.vacation?.active) ? 'active' : ''} ${pauseLoading ? 'loading' : ''}`}
                                disabled={pauseLoading}
                            >
                                {pauseLoading ? (
                                    <div className="sync-spinner" style={{ width: '30px', height: '30px', border: '3px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                ) : (
                                    (user.gamification?.pause_mode?.active || user.gamification?.vacation?.active) ? 'Desactivar' : 'Activar'
                                )}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {(user.gamification?.pause_mode?.active || user.gamification?.vacation?.active) ? 'Estás fuera de servicio.' : 'Uso ilimitado y voluntario.'}
                        </p>
                    </div>
                )}
                <div className="glass stat-card">
                    <h4 className="stat-label">Trabajos Activos</h4>
                    <p className="stat-value">
                        {(user.role === 'freelancer' || user.role === 'company')
                            ? myWork.filter(j => j.status === 'active').length
                            : myOrders.filter(j => j.status === 'active').length
                        }
                    </p>
                </div>
                <div className="glass stat-card">
                    <h4 className="stat-label">Completados</h4>
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
                    <WorkReceivedSection loading={loading} myWork={myWork} updateJobStatus={updateJobStatus} createChat={createChat} navigate={navigate} setIsCreatingChat={setIsCreatingChat} user={user} setSelectedJobForReview={setSelectedJobForReview} reviewedJobs={reviewedJobs} />
                    <ProposalsSection
                        loading={loading}
                        activeProposalTab={activeProposalTab}
                        setActiveProposalTab={setActiveProposalTab}
                        myProposals={myProposals}
                        filteredProposals={filteredProposals}
                        navigate={navigate}
                        getTimeAgo={getTimeAgo}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        handleCancelProposal={handleCancelProposal}
                        handleDeleteProposal={handleDeleteProposal}
                        expandedProposalId={expandedProposalId}
                        setExpandedProposalId={setExpandedProposalId}
                        getRemainingDays={getRemainingDays}
                    />

                    {/* V27: Tutorados Section (Adults only) */}
                    {!isTutorView && authUser.role === 'freelancer' && (
                        <TutoradosSection
                            loading={loading}
                            tutorados={tutorados}
                            enterMirrorMode={enterMirrorMode}
                        />
                    )}

                    <ServicesSection loading={loading} myServices={myServices} user={user} handleCreateServiceClick={handleCreateServiceClick} />
                </>
            )}

            {(user.role === 'buyer' || user.role === 'company' || myOrders.length > 0) && (
                <>
                    {(user.role === 'buyer' || user.role === 'company') && (
                        <PublishedProjectsSection
                            loading={loading}
                            myPublishedProjects={myPublishedProjects}
                            navigate={navigate}
                            setSelectedProjectForProposals={setSelectedProjectForProposals}
                            user={user}
                            onDelete={handleDeleteProject}
                        />
                    )}
                    <ReceivedProposalsSection
                        loading={loading}
                        receivedProposals={receivedProposals}
                        navigate={navigate}
                        getTimeAgo={getTimeAgo}
                        handleAcceptProposal={handleAcceptProposal}
                        handleRejectProposal={handleRejectProposal}
                        expandedProposalId={expandedProposalId}
                        setExpandedProposalId={setExpandedProposalId}
                    />
                    <OrdersSection loading={loading} myOrders={myOrders} navigate={navigate} createChat={createChat} updateJobStatus={updateJobStatus} setIsCreatingChat={setIsCreatingChat} user={user} setSelectedJobForReview={setSelectedJobForReview} reviewedJobs={reviewedJobs} />
                </>
            )}

            <LevelUpModal isOpen={showLevelUpModal} onClose={() => setShowLevelUpModal(false)} level={currentLevel} />

            {/* V28: Review Modal */}
                                    <ReviewModal
                isOpen={!!selectedJobForReview}
                onClose={() => setSelectedJobForReview(null)}
                onConfirm={handleReviewSubmit}
                title={user.role === 'freelancer' ? "Califica al Cliente" : "Califica a"}
                targetName={user.role === 'freelancer' ? `@${selectedJobForReview?.buyerUsername}` : `@${selectedJobForReview?.freelancerUsername}`}
                subtitle={user.role === 'freelancer' ? "¿Cómo fue tu experiencia trabajando con este cliente?" : "¿Estás satisfecho con el resultado final?"}
            />
        </div>
    );
};

export default Dashboard;
