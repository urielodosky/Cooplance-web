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
import { calculateNextLevelXP, MAX_LEVEL, MAX_BUFFER_XP, activatePauseMode, deactivatePauseMode, XP_TABLE, processGamificationRules } from '../utils/gamification';
import { getProfilePicture } from '../utils/avatarUtils';
import { getBenefitsForRole } from '../data/levelBenefits';
import { getProposalsByUser, updateProposalStatus, deleteProposal as deleteProposalApi, getReceivedProposals } from '../lib/proposalService';
import { getProjectsByClient, deleteProject as deleteProjectApi } from '../lib/projectService';
import { supabase } from '../lib/supabase';
import { BADGE_FAMILIES, CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
import { useBadgeNotification } from '../context/BadgeNotificationContext';
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

const WorkReceivedSection = ({ loading, myWork, updateJobStatus, createChat, navigate, setIsCreatingChat, user }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredWork = useMemo(() => {
        return myWork.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered'].includes(job.status);
            return ['completed', 'canceled', 'rejected'].includes(job.status);
        });
    }, [myWork, activeTab]);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myWork.filter(j => ['active'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myWork.filter(j => ['completed', 'delivered', 'canceled', 'rejected'].includes(j.status)).length}</span></button>
                </div>
            </div>
            <div className="jobs-list">
                {loading && myWork.length === 0 ? (
                    <ListSkeleton />
                ) : filteredWork.length > 0 ? (
                    filteredWork.map(job => (
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
                            <div className="job-details" style={{ position: 'relative' }}>
                                {(() => {
                                    const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                    if (daysLeft === null || job.status !== 'active') return null;
                                    return (
                                        <div style={{
                                            position: 'absolute', top: '-2.2rem', right: '-1.5rem',
                                            fontSize: '0.75rem', color: daysLeft <= 2 ? '#ef4444' : 'var(--text-muted)',
                                            fontWeight: '600', background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '8px'
                                        }}>
                                            {daysLeft > 0 ? `Quedan ${daysLeft} días` : daysLeft === 0 ? 'Vence hoy' : 'Vencido'}
                                        </div>
                                    );
                                })()}
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {job.buyerUsername ? `@${job.buyerUsername}` : 'Usuario'}
                                    {job.buyerRealName && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>({job.buyerRealName})</span>}
                                </h4>
                                <p style={{ margin: '0.3rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                                    Contrató: <strong style={{ color: 'var(--primary)' }}>{job.serviceTitle}</strong>
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                                        {job.tier || 'Estándar'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: job.status === 'active' ? '#10b981' : job.status === 'delivered' ? '#3b82f6' : 'var(--text-secondary)' }}>
                                        ● {job.status === 'active' ? 'En Progreso' : job.status === 'delivered' ? 'Entregado' : job.status}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>${job.amount}</div>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <button className="btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={async () => {
                                        setIsCreatingChat(true);
                                        try {
                                            const chatId = await createChat([user.id, job.buyerId], 'order', job.id, job.serviceTitle);
                                            if (chatId) navigate(`/chat/${chatId}`);
                                            else setIsCreatingChat(false);
                                        } catch { setIsCreatingChat(false); }
                                    }}>Chat</button>
                                    
                                    <button className="btn-outline" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderColor: 'var(--border)' }} onClick={() => {
                                        if (job.projectId) navigate(`/project/${job.projectId}`);
                                        else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                                    }}>Detalle</button>

                                    {job.status === 'pending_approval' && (
                                        <>
                                            <button className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={() => updateJobStatus(job.id, 'active')}>Aceptar</button>
                                        </>
                                    )}
                                    {job.status === 'active' && (
                                        <button className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={() => updateJobStatus(job.id, 'delivered')}>Entregar</button>
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
                <button className={`proposal-tab ${activeProposalTab === 'active' ? 'active' : ''}`} onClick={() => setActiveProposalTab('active')}>En Proceso <span className="tab-count">{myProposals.filter(p => ['pending', 'accepted'].includes((p.status || '').toLowerCase())).length}</span></button>
                <button className={`proposal-tab ${activeProposalTab === 'history' ? 'active' : ''}`} onClick={() => setActiveProposalTab('history')}>Historial <span className="tab-count">{myProposals.filter(p => ['rejected', 'canceled', 'completed'].includes((p.status || '').toLowerCase())).length}</span></button>
            </div>
        </div>
        <div className="jobs-list">
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
                                        {proposal.status === 'pending' && daysLeft !== null && (
                                            <span className={`meta-item deadline ${daysLeft <= 2 ? 'urgent' : ''}`}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                {daysLeft > 0 ? `Quedan ${daysLeft} días` : 'Vence hoy'}
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
        <div className="services-grid">
            {loading && myServices.length === 0 ? (
                <GridSkeleton />
            ) : myServices.length > 0 ? (
                <>
                    {myServices.map(service => (
                        <ServiceCard key={service.id} service={{ ...service, level: user.level || 1 }} />
                    ))}
                    <div className="glass service-card clickable" onClick={handleCreateServiceClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', background: 'var(--bg-card)', padding: '1.5rem 1rem' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem', fontSize: '1.3rem' }}>+</div>
                        <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem', margin: 0 }}>Crear Nuevo</h4>
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

const OrdersSection = ({ loading, myOrders, navigate, createChat, updateJobStatus, setIsCreatingChat, user }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredOrders = useMemo(() => {
        return myOrders.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered'].includes(job.status);
            return ['completed', 'canceled', 'rejected'].includes(job.status);
        });
    }, [myOrders, activeTab]);

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>Mis Pedidos / Servicios Contratados</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myOrders.filter(j => ['active', 'delivered'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myOrders.filter(j => ['completed', 'canceled', 'rejected'].includes(j.status)).length}</span></button>
                </div>
            </div>
            <div className="jobs-list">
                {loading && myOrders.length === 0 ? (
                    <ListSkeleton />
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(job => (
                        <div key={job.id} className="glass job-card order-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.2rem', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--primary-soft)' }}>
                                <img src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} alt={job.freelancerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                {(() => {
                                    const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                    if (daysLeft === null || job.status !== 'active') return null;
                                    return (
                                        <div style={{
                                            position: 'absolute', top: '-1rem', right: '0',
                                            fontSize: '0.75rem', color: daysLeft <= 2 ? '#ef4444' : 'var(--text-muted)',
                                            fontWeight: '600'
                                        }}>
                                            {daysLeft > 0 ? `Quedan ${daysLeft} días` : daysLeft === 0 ? 'Vence hoy' : 'Vencido'}
                                        </div>
                                    );
                                })()}
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{job.serviceTitle}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Por: </span>
                                    <strong style={{ color: 'var(--primary-soft)', fontSize: '0.9rem' }}>@{job.freelancerUsername || 'usuario'}</strong>
                                    {job.freelancerName && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({job.freelancerName})</span>}
                                </div>
                                <div style={{ marginTop: '0.4rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: job.status === 'active' ? '#10b981' : '#3b82f6', fontWeight: '600' }}>
                                        {job.status === 'active' ? '● En Progreso' : job.status === 'delivered' ? '● Entregado' : `● ${job.status}`}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>${job.amount}</div>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                    <button className="btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={async () => {
                                        setIsCreatingChat(true);
                                        try {
                                            const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                            if (chatId) navigate(`/chat/${chatId}`);
                                            else setIsCreatingChat(false);
                                        } catch { setIsCreatingChat(false); }
                                    }}>Chat</button>

                                    <button className="btn-outline" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderColor: 'var(--border)' }} onClick={() => {
                                        if (job.projectId) navigate(`/project/${job.projectId}`);
                                        else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                                    }}>Detalle</button>

                                    {job.status === 'delivered' && (
                                        <button className="btn-primary" style={{ backgroundColor: '#10b981', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }} onClick={() => updateJobStatus(job.id, 'completed')}>Aprobar</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '18px', border: '1px dashed var(--border)' }}>
                        <p>{activeTab === 'active' ? 'No tienes pedidos activos. ¡Explora servicios!' : 'Tu historial está vacío.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TutoradosSection = ({ loading, tutorados, enterMirrorMode }) => (
    <div style={{ marginTop: '2.5rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span>Mis Tutorados (Supervisión)</span>
            <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>Beta</span>
        </h3>
        <div className="services-grid">
            {loading ? (
                <GridSkeleton />
            ) : tutorados.length > 0 ? (
                tutorados.map(minor => (
                    <div key={minor.id} className="glass" style={{
                        padding: '1.5rem',
                        borderRadius: '20px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)' }}>
                            <img src={getProfilePicture({ role: minor.role, avatar: minor.avatar_url })} alt={minor.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{minor.first_name || minor.username}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{minor.username}</p>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '0.6rem' }}
                            onClick={() => enterMirrorMode(minor.id)}
                        >
                            Ver en Espejo
                        </button>
                    </div>
                ))
            ) : (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                    <p>No tienes menores a cargo registrados.</p>
                </div>
            )}
        </div>
    </div>
);

import {
    CreditCard as Coin,
    Zap as Flame,
    Rocket,
    Heart,
    Zap as Lightning,
    Star,
    Handshake,
    Eye
} from 'lucide-react';

const BadgesSection = ({ user, navigate }) => {
    const Icons = {
        Sales: <Coin size={20} />,
        Level: <Flame size={20} />,
        Service: <Rocket size={20} />,
        Loyalty: <Heart size={20} />,
        Speed: <Lightning size={20} />,
        Review: <Star size={20} />,
        Handshake: <Handshake size={20} />,
        Eye: <Eye size={20} />
    };

    const isClient = user.role === 'buyer' || user.role === 'company';
    const unlockedIds = user.gamification?.badges || [];

    const getIconForFamily = (familyId) => {
        const map = { sales: Icons.Sales, purchases: Icons.Sales, levels: Icons.Level, services: Icons.Service, loyalty: Icons.Loyalty, speed: Icons.Speed, reviews: Icons.Review, talent: Icons.Handshake, projects: Icons.Eye };
        return map[familyId] || Icons.Review;
    };

    const families = isClient ? CLIENT_BADGE_FAMILIES : BADGE_FAMILIES;
    const unlockedList = [];

    families.forEach(f => {
        f.badges.forEach(b => {
            if (unlockedIds.includes(b.id)) {
                unlockedList.push({ ...b, icon: getIconForFamily(f.familyId) });
            }
        });
    });

    // Sort to show newest or most relevant first (optional, here we just limit)
    const featured = unlockedList.slice(0, 6);
    if (featured.length === 0) return null;

    return (
        <div className="dashboard-badges-section">
            <div className="section-header-row">
                <h3 className="section-title">Mis Insignias</h3>
                <button onClick={() => navigate('/badges')} className="btn-text-link">
                    Ver todas →
                </button>
            </div>
            <div className="dashboard-badges-grid">
                {featured.map((badge, idx) => (
                    <div key={idx} className="glass badge-mini-card" title={badge.description}>
                        <div className="badge-icon-container">
                            {badge.icon}
                        </div>
                        <span className="badge-mini-title">{badge.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ReceivedProposalsSection = ({
    loading,
    receivedProposals,
    navigate,
    getTimeAgo,
    handleAcceptProposal,
    handleRejectProposal,
    expandedProposalId,
    setExpandedProposalId
}) => {
    const pendingProposals = receivedProposals.filter(p => (p.status || '').toLowerCase() === 'pending');

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <h3 className="section-title">Postulantes a Mis Proyectos</h3>
            <div className="jobs-list">
                {loading && receivedProposals.length === 0 ? (
                    <ListSkeleton />
                ) : pendingProposals.length > 0 ? (
                    pendingProposals.map(proposal => {
                        const isExpanded = expandedProposalId === proposal.id;
                        return (
                            <div key={proposal.id} className={`proposal-card enhanced status-${proposal.status} ${isExpanded ? 'expanded' : ''}`}>
                                <div className="proposal-card-content">
                                    <div className="proposal-client-info" onClick={() => navigate(`/freelancer/${proposal.userId}`)}>
                                        <div className="client-avatar-wrapper">
                                            <img src={getProfilePicture({ role: proposal.userRole, avatar: proposal.userAvatar })} alt={proposal.userName} />
                                        </div>
                                        <div className="client-details">
                                            <span className="client-username">@{proposal.userUsername || 'candidato'}</span>
                                            <span className="client-realname">{proposal.userName}</span>
                                        </div>
                                    </div>

                                    <div className="proposal-main-details">
                                        <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>PARA TU PROYECTO:</div>
                                        <h4>{proposal.projectTitle}</h4>
                                        <div className="proposal-meta">
                                            <span className="meta-item time">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                Enviada {getTimeAgo(proposal.createdAt)}
                                            </span>
                                            <span className="meta-item">Nivel {proposal.userLevel}</span>
                                        </div>
                                    </div>

                                    <div className="proposal-actions">
                                        <button
                                            className="btn-text-link"
                                            style={{ color: '#ef4444' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRejectProposal(proposal);
                                            }}
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            className={`btn-text-link letter-toggle ${isExpanded ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedProposalId(isExpanded ? null : proposal.id);
                                            }}
                                        >
                                            {isExpanded ? 'Ocultar Carta' : 'Ver Carta'}
                                        </button>

                                        <button className="btn-primary" onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptProposal(proposal);
                                        }}>
                                            Contratar
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="proposal-letter-box" onClick={e => e.stopPropagation()}>
                                        <h5>Carta de Presentación</h5>
                                        <p>{proposal.coverLetter || 'Sin mensaje adjunto.'}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                        <p>No tienes candidatos nuevos para tus proyectos aún.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PaymentSelectionModal = ({ isOpen, onClose, onConfirm, methods, amount, title }) => {
    const [selectedMethod, setSelectedMethod] = useState('');

    if (!isOpen) return null;

    // Parse methods - handle string or array
    let availableMethods = [];
    if (Array.isArray(methods)) {
        availableMethods = methods;
    } else if (typeof methods === 'string' && methods.trim()) {
        availableMethods = methods.split(',').map(m => m.trim());
    }

    // Default fallback
    if (availableMethods.length === 0) {
        availableMethods = ['Mercado Pago', 'PayPal', 'Transferencia'];
    }

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal-card glass-strong" onClick={e => e.stopPropagation()}>
                <div className="payment-modal-header">
                    <h3>Finalizar Contratación</h3>
                    <p>Selecciona tu medio de pago preferido</p>
                </div>
                <div className="payment-modal-body">
                    <div className="payment-project-summary">
                        <span className="summary-label">Proyecto:</span>
                        <span className="summary-value">{title}</span>
                    </div>
                    <div className="payment-amount-box">
                        <span className="amount-label">Monto a abonar:</span>
                        <span className="amount-value">${amount}</span>
                    </div>

                    <div className="payment-methods-list">
                        {availableMethods.map((method, idx) => (
                            <label key={idx} className={`payment-method-item ${selectedMethod === method ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="payment-method"
                                    value={method}
                                    checked={selectedMethod === method}
                                    onChange={() => setSelectedMethod(method)}
                                />
                                <div className="method-content">
                                    <span className="method-icon">
                                        {method.toLowerCase().includes('mercado') ? '💳' : method.toLowerCase().includes('paypal') ? '🅿️' : '🏦'}
                                    </span>
                                    <span className="method-name">{method}</span>
                                </div>
                                {selectedMethod === method && <span className="check-mark">✓</span>}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="payment-modal-footer">
                    <button className="btn-ghost" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-primary confirm-pay-btn"
                        disabled={!selectedMethod}
                        onClick={() => onConfirm(selectedMethod)}
                    >
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---

const Dashboard = () => {
    const {
        user: authUser,
        updateUser,
        isTutorView,
        supervisedUser,
        enterMirrorMode,
        exitMirrorMode
    } = useAuth();

    // Determine effective user for this view
    const user = isTutorView ? supervisedUser : authUser;

    const { jobs, updateJobStatus: updateJobStatusApi, createJob } = useJobs();
    const { services } = useServices();
    const { createChat } = useChat();
    const navigate = useNavigate();

    const [tutorados, setTutorados] = useState([]);



    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [pauseLoading, setPauseLoading] = useState(false);

    // V39: Derived Pause Mode state for UI
    const isPaused = useMemo(() => {
        if (!user || user.role !== 'freelancer') return false;
        return user.gamification?.pause_mode?.active || user.gamification?.vacation?.active;
    }, [user]);

    const [loading, setLoading] = useState(true);
    const [myPublishedProjects, setMyPublishedProjects] = useState([]);
    const [myProposals, setMyProposals] = useState([]);
    const [receivedProposals, setReceivedProposals] = useState([]);
    const [activeProposalTab, setActiveProposalTab] = useState('active');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null);
    const [selectedProposalForPayment, setSelectedProposalForPayment] = useState(null);
    const [expandedProposalId, setExpandedProposalId] = useState(null);
    const { refreshBadges } = useBadgeNotification();

    const getRemainingDays = (deadline) => {
        if (!deadline) return null;
        const diff = new Date(deadline) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    // V27: Update Job Status with Read-Only check
    const updateJobStatus = async (jobId, status) => {
        if (isTutorView) {
            alert("No puedes realizar esta acción en modo lectura.");
            return;
        }
        const result = await updateJobStatusApi(jobId, status);
        if (status === 'completed' && refreshBadges) {
            refreshBadges();
        }
        return result;
    };

    // Initial load and sync
    useEffect(() => {
        if (!user) return;
        const loadInitData = async () => {
            const cachedProjects = localStorage.getItem(`cooplance_projects_${user.id}`);
            const cachedProposals = localStorage.getItem(`cooplance_proposals_${user.id}`);
            if (cachedProjects) setMyPublishedProjects(JSON.parse(cachedProjects));
            if (cachedProposals) setMyProposals(JSON.parse(cachedProposals));

            try {
                const projects = await getProjectsByClient(user.id);
                const proposals = await getProposalsByUser(user.id);
                const received = await getReceivedProposals(user.id);
                setMyPublishedProjects(projects);
                setMyProposals(proposals);
                setReceivedProposals(received);
                localStorage.setItem(`cooplance_projects_${user.id}`, JSON.stringify(projects));
                localStorage.setItem(`cooplance_proposals_${user.id}`, JSON.stringify(proposals));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        loadInitData();

        // 2. Fetch tutorados if adult freelancer
        if (authUser?.id && authUser.role === 'freelancer' && !isTutorView) {
            const fetchTutorados = async () => {
                try {
                    const { data, error } = await supabase.from('profiles').select('*').eq('parent_id', authUser.id);
                    if (error) throw error;
                    if (data) setTutorados(data);
                } catch (err) {
                    console.error("[Dashboard] Error fetching tutorados:", err);
                }
            };
            fetchTutorados();
        }
    }, [user?.id, authUser.id, isTutorView]);

    // Gamification Process - Stabilized
    useEffect(() => {
        if (!user || (user.role !== 'freelancer' && user.role !== 'company')) return;

        // Use a stable, non-circular check to avoid infinite loops
        const processedUser = processGamificationRules(user);

        // Only update if there is a meaningful data change
        const hasChanges =
            processedUser.xp !== user.xp ||
            processedUser.level !== user.level ||
            JSON.stringify(processedUser.gamification) !== JSON.stringify(user.gamification);

        if (hasChanges) {
            console.log("[Dashboard] Applying gamification updates...");
            updateUser(processedUser).catch(err => {
                console.warn("[Dashboard] Silently failed to sync gamification rules:", err);
            });
        }
    }, [user?.id, user?.xp, user?.level, updateUser]);

    // Derived Data
    const myWork = useMemo(() => user ? (jobs || []).filter(j => j.freelancerId === user.id) : [], [jobs, user?.id]);
    const myServices = useMemo(() => user ? (services || []).filter(s => s.freelancerId === user.id) : [], [services, user?.id]);
    const myOrders = useMemo(() => user ? (jobs || []).filter(j => j.buyerId === user.id) : [], [jobs, user?.id]);

    if (!user) return null;

    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const nextLevelXP = calculateNextLevelXP(currentLevel);
    const isMaxLevel = currentLevel >= MAX_LEVEL;
    const xpPercentage = isMaxLevel ? Math.min(Math.max(0, (currentXP - 10000) / MAX_BUFFER_XP) * 100, 100) : Math.min((currentXP / nextLevelXP) * 100, 100);
    const xpDisplayText = isMaxLevel ? `${currentXP - 10000} / ${MAX_BUFFER_XP} Buffer XP` : `${currentXP} / ${nextLevelXP} XP`;
    const levelLabel = isMaxLevel ? `Nivel Máximo (10) - ${getBenefitsForRole(user.role)[10]?.name}` : `Hacia Nivel ${currentLevel + 1}: ${getBenefitsForRole(user.role)[currentLevel + 1]?.name}`;
    const currentLevelName = getBenefitsForRole(user.role)[currentLevel]?.name || '';

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

    const handlePauseModeClick = async () => {
        const g = user.gamification || {};
        const isPaused = g.pause_mode?.active || g.vacation?.active;

        try {
            if (isPaused) {
                if (window.confirm("¿Desactivar el Modo Pausa? Tus servicios volverán a ser visibles normalmente.")) {
                    setPauseLoading(true);
                    await updateUser(deactivatePauseMode(user));
                }
            } else {
                if (window.confirm("¿Activar Modo Pausa? Tus servicios se mostrarán al final de las listas para evitar nuevos pedidos. Puedes desactivarlo cuando quieras.")) {
                    setPauseLoading(true);
                    await updateUser(activatePauseMode(user));
                }
            }
        } catch (err) {
            console.error("[Dashboard] Error toggling pause mode:", err);
            alert("No se pudo cambiar el estado de disponibilidad: " + err.message);
        } finally {
            setPauseLoading(false);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (isTutorView) {
            alert("No puedes realizar esta acción en modo lectura.");
            return;
        }
        if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto de forma permanente? Esta acción no se puede deshacer.')) {
            try {
                await deleteProjectApi(projectId);

                // Update state and localStorage with the NEW filtered list
                const updatedProjects = myPublishedProjects.filter(p => p.id !== projectId);
                setMyPublishedProjects(updatedProjects);
                localStorage.setItem(`cooplance_projects_${user.id}`, JSON.stringify(updatedProjects));
            } catch (err) {
                alert('No se pudo eliminar el proyecto: ' + err.message);
            }
        }
    };

    const handleCreateProjectClick = () => {
        const currentLevel = user.level || 1;
        const maxProjects = currentLevel >= 5 ? 5 : currentLevel;
        const openProjects = myPublishedProjects.filter(p => p.status === 'open').length;

        if (openProjects >= maxProjects) {
            let msg = `Has alcanzado el límite de proyectos/pedidos publicados (${maxProjects}) para tu Nivel ${currentLevel}.`;
            if (currentLevel < 5) {
                msg += `\n\n¡Sube de nivel para desbloquear más espacios! (Máximo 5 en Nivel 5)`;
            } else {
                msg += `\n\nHas alcanzado el máximo de publicaciones permitidas.`;
            }
            alert(msg);
            return;
        }
        navigate('/create-project');
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
        // Safe comparison for IDs (could be string/number mix)
        const project = myPublishedProjects.find(p => String(p.id) === String(proposal.projectId));
        if (!project) {
            console.warn("[Dashboard] Project not found for proposal:", proposal.projectId);
            return;
        }

        // Set state to show payment modal instead of window.confirm
        setSelectedProposalForPayment({ proposal, project });
    };

    const confirmHiringWithPayment = async (paymentMethod) => {
        if (!selectedProposalForPayment) return;

        const { proposal, project } = selectedProposalForPayment;
        setSelectedProposalForPayment(null);

        try {
            setLoading(true);
            setIsCreatingChat(true);

            // 1. Update proposal status
            await updateProposalStatus(proposal.id, 'accepted');

            // 2. Handle Chat: Convert pre_contract to active OR create new one
            let chatId = null;
            const { data: consultationChats } = await supabase
                .from('chats')
                .select('id')
                .eq('type', 'proposal')
                .eq('context_id', proposal.id.toString());

            if (consultationChats && consultationChats.length > 0) {
                chatId = consultationChats[0].id;
                await supabase
                    .from('chats')
                    .update({ status: 'active' })
                    .eq('id', chatId);
            } else {
                // Create a new definitive chat if it doesn't exist
                chatId = await createChat([user.id, proposal.userId], 'proposal', proposal.id, project.title);
            }

            // 3. Create the formal Job/Order entry
            const projectWithPayment = {
                ...project,
                freelancerId: proposal.userId,
                selectedPaymentMethod: paymentMethod
            };

            await createJob(projectWithPayment, user);

            // 4. Update the project status in DB and local state
            const { error: pError } = await supabase
                .from('projects')
                .update({ status: 'hired' })
                .eq('id', project.id);

            if (!pError) {
                setMyPublishedProjects(prev => prev.map(p =>
                    p.id === project.id ? { ...p, status: 'hired' } : p
                ));
            }

            // 5. Redirect to chat for immediate communication
            if (chatId) {
                navigate(`/chat/${chatId}`);
            } else {
                alert('¡Contratación exitosa! Redirigiendo al chat...');
                navigate('/chat');
            }
        } catch (err) {
            console.error("[Dashboard] Error accepting proposal:", err);
            alert("No se pudo completar la contratación: " + err.message);
        } finally {
            setLoading(false);
            setIsCreatingChat(false);
        }
    };

    const handleRejectProposal = async (proposal) => {
        if (window.confirm('¿Estás seguro de que deseas rechazar esta postulación?')) {
            try {
                await updateProposalStatus(proposal.id, 'rejected');
                setReceivedProposals(prev => prev.filter(p => p.id !== proposal.id));
            } catch (err) {
                console.error("[Dashboard] Error rejecting proposal:", err);
                alert("No se pudo rechazar la postulación.");
            }
        }
    };

    const handleCancelProposal = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('¿Cancelar postulación?')) {
            await updateProposalStatus(id, 'canceled');
            setMyProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'canceled' } : p));
        }
    };

    const handleDeleteProposal = async (e, id) => {
        if (isTutorView) {
            alert("Acción bloqueada en modo lectura.");
            return;
        }
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
        return activeProposalTab === 'active' ? ['pending', 'accepted'].includes(status) : ['completed', 'canceled', 'rejected'].includes(status);
    });

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ margin: 0 }}>Bienvenido a tu panel.</p>
                            {isPaused && (
                                <span className="status-badge-active-pause ripple-effect">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" /></svg>
                                    MODO PAUSA ACTIVO
                                </span>
                            )}
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

            <BadgesSection
                user={user}
                myWork={myWork}
                myOrders={myOrders}
                navigate={navigate}
            />

            {(user.role === 'freelancer' || user.role === 'company') && (
                <>
                    <WorkReceivedSection loading={loading} myWork={myWork} updateJobStatus={updateJobStatus} createChat={createChat} navigate={navigate} setIsCreatingChat={setIsCreatingChat} user={user} />
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
                    <OrdersSection loading={loading} myOrders={myOrders} navigate={navigate} createChat={createChat} updateJobStatus={updateJobStatus} setIsCreatingChat={setIsCreatingChat} user={user} />
                </>
            )}

            <LevelUpModal isOpen={showLevelUpModal} onClose={() => setShowLevelUpModal(false)} level={currentLevel} />
        </div>
    );
};

export default Dashboard;
