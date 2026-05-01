import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Send, MessageSquare, Info, Check, Star, Lock, X, Trash2 } from 'lucide-react';
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
import { useActionModal } from '../context/ActionModalContext';
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

// Robust cancellation detection: checks both status AND delivery_result text
// Needed because a bug previously changed canceled jobs to completed on review submit
const isJobCanceled = (job) => {
    if (job.status === 'canceled' || job.status === 'cancellation_requested') return true;
    if (job.deliveryResult && (
        job.deliveryResult.toLowerCase().includes('cancelado') || 
        job.deliveryResult.toLowerCase().includes('cancelación')
    )) return true;
    return false;
};

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

const WorkReceivedSection = ({ loading, myWork, updateJobStatus, createChat, navigate, setIsCreatingChat, user, setSelectedJobForReview, reviewedJobs, getTimeAgo, showActionModal, canForcePayout }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredWork = useMemo(() => {
        return myWork.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered', 'pending_approval'].includes(job.status);
            return ['completed', 'canceled', 'rejected', 'refunded'].includes(job.status);
        });
    }, [myWork, activeTab]);

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myWork.filter(j => ['active', 'delivered', 'pending_approval'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myWork.filter(j => ['completed', 'canceled', 'rejected', 'refunded'].includes(j.status)).length}</span></button>
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
                            boxShadow: 'var(--shadow-sm)',
                            marginBottom: '1.2rem'
                        }}>
                            {/* Avatar Section */}
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const role = job.buyerRole || 'buyer';
                                    navigate(role === 'company' ? `/company/${job.buyerId}` : `/client/${job.buyerId}`);
                                }}
                                style={{
                                width: '60px', 
                                height: '60px', 
                                borderRadius: '50%', 
                                overflow: 'hidden', 
                                border: '2px solid var(--primary)',
                                flexShrink: 0,
                                boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)',
                                cursor: 'pointer'
                            }}>
                                <img src={getProfilePicture({ role: job.buyerRole, avatar: job.buyerAvatar })} alt={job.buyerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            {/* Info Section */}
                            <div className="job-main-info" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '4px' }}>
                                    <h4 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const role = job.buyerRole || 'buyer';
                                            navigate(role === 'company' ? `/company/${job.buyerId}` : `/client/${job.buyerId}`);
                                        }}
                                        style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                                    >
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
                                        color: job.status === 'active' ? '#10b981' : (job.status === 'delivered' ? '#6366f1' : (isJobCanceled(job) ? '#ef4444' : '#f59e0b')), 
                                        fontWeight: '800', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: job.status === 'active' ? 'rgba(16, 185, 129, 0.08)' : (job.status === 'delivered' ? 'rgba(99, 102, 241, 0.08)' : (isJobCanceled(job) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)')),
                                        border: '1px solid currentColor'
                                    }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }}></span>
                                        {job.status === 'active' ? 'EN PROGRESO' : 
                                         job.status === 'delivered' ? 'ENTREGADO (REVISIÓN)' : 
                                         job.status === 'pending_approval' ? 'POR ACEPTAR' : 
                                         isJobCanceled(job) ? `CANCELADO (${getTimeAgo(job.completedAt || job.updatedAt)})` :
                                         job.status === 'completed' ? `FINALIZADO (${getTimeAgo(job.completedAt || job.updatedAt)})` :
                                         (job.status?.toUpperCase() || 'ESTADO')}
                                    </span>
                                    {job.status === 'active' && (
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            fontWeight: '700', 
                                            color: '#10b981', 
                                            background: 'rgba(16, 185, 129, 0.1)', 
                                            padding: '4px 10px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #10b981',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Lock size={12} /> SALDO EN ESCROW
                                        </span>
                                    )}
                                </div>

                                {isJobCanceled(job) && job.deliveryResult && (
                                    <div style={{ 
                                        fontSize: '0.8rem', 
                                        color: 'var(--text-muted)', 
                                        background: 'rgba(0,0,0,0.03)', 
                                        padding: '8px 12px', 
                                        borderRadius: '10px',
                                        borderLeft: '3px solid #ef4444',
                                        maxWidth: '500px',
                                        marginTop: '8px'
                                    }}>
                                        <strong>Motivo:</strong> {job.deliveryResult
                                            .replace('Solicitud de cancelación por cliente. Motivo: ', '')
                                            .replace('Cancelado por freelancer. Motivo: ', '')
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Price & Actions Section */}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end', minWidth: '160px' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>${job.amount}</div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    {job.status !== 'pending_approval' && (
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
                                        }} onClick={async (e) => {
                                            e.stopPropagation();
                                            setIsCreatingChat(true);
                                            try {
                                                const chatId = await createChat([user.id, job.buyerId], 'order', job.id, job.serviceTitle);
                                                if (chatId) navigate(`/chat/${chatId}`);
                                                else setIsCreatingChat(false);
                                            } catch { setIsCreatingChat(false); }
                                        }}>Chat</button>
                                    )}
                                    
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
                                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                                            <button 
                                                className="btn-danger" 
                                                style={{ 
                                                    padding: '0.6rem 1.2rem', 
                                                    fontSize: '0.85rem', 
                                                    borderRadius: '14px', 
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid #ef4444',
                                                    color: '#ef4444',
                                                    fontWeight: '700',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                }} 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    showActionModal({
                                                        title: 'Cancelar Trabajo',
                                                        message: '¿Estás seguro de que deseas cancelar este trabajo? El dinero será devuelto íntegramente al cliente. Por favor, indica el motivo:',
                                                        type: 'prompt',
                                                        severity: 'error',
                                                        confirmText: 'Confirmar Cancelación',
                                                        onConfirm: (reason) => {
                                                            if (!reason || reason.trim().length < 20) {
                                                                showActionModal({
                                                                    title: 'Error',
                                                                    message: 'Debes proporcionar un motivo detallado (mínimo 20 caracteres).',
                                                                    severity: 'warning'
                                                                });
                                                                return;
                                                            }
                                                            updateJobStatus(job.id, 'canceled', `Cancelado por freelancer. Motivo: ${reason}`);
                                                        }
                                                    });
                                                }}
                                            >
                                                <X size={16} />
                                                Cancelar
                                            </button>

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
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await updateJobStatus(job.id, 'delivered');
                                                    showActionModal({
                                                        title: 'Trabajo Entregado',
                                                        message: '¡Trabajo entregado con éxito! El cliente ha sido notificado para su revisión.',
                                                        severity: 'success'
                                                    });
                                                }}
                                            >
                                                <PackageCheck size={18} />
                                                Entregar
                                            </button>
                                        </div>
                                    )}

                                    {job.status === 'pending_approval' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444', borderRadius: '12px' }} onClick={async () => {
                                                 showActionModal({
                                                     title: 'Rechazar Trabajo',
                                                     message: '¿Rechazar este trabajo? Se le devolverá el dinero al cliente y el proceso se cancelará.',
                                                     type: 'confirm',
                                                     severity: 'error',
                                                     onConfirm: async () => {
                                                         await updateJobStatus(job.id, 'rejected');
                                                     }
                                                 });
                                            }}>Rechazar</button>
                                            <button className="btn-primary" style={{ backgroundColor: '#10b981', border: 'none', borderRadius: '12px' }} onClick={async (e) => {
                                                e.stopPropagation();
                                                showActionModal({
                                                    title: 'Aceptar Trabajo',
                                                    message: `¿Aceptar trabajo? Al confirmar, se simulará el cobro de $${job.amount} al cliente y los fondos quedarán retenidos en Escrow de forma segura.`,
                                                    type: 'confirm',
                                                    severity: 'confirm',
                                                    onConfirm: async () => {
                                                        try {
                                                            await updateJobStatus(job.id, 'active');
                                                            showActionModal({
                                                                title: '¡Trabajo Aceptado!',
                                                                message: "¡Trabajo aceptado! El pago ha sido retenido en Escrow y ahora puedes empezar a trabajar.",
                                                                severity: 'success'
                                                            });
                                                        } catch (err) {
                                                            console.error("Error al aceptar trabajo:", err);
                                                            showActionModal({
                                                                title: 'Error',
                                                                message: "Hubo un problema al aceptar el trabajo. Por favor intenta de nuevo.",
                                                                severity: 'error'
                                                            });
                                                        }
                                                    }
                                                });
                                            }}>Aceptar Trabajo</button>
                                        </div>
                                    )}

                                    {job.status === 'delivered' && canForcePayout(job.deliveredAt) && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                backgroundColor: '#3b82f6', 
                                                border: 'none', 
                                                borderRadius: '12px',
                                                padding: '0.5rem 1rem',
                                                fontSize: '0.8rem',
                                                fontWeight: '700'
                                            }} 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                showActionModal({
                                                    title: 'Liberación por Inactividad',
                                                    message: "Han pasado más de 72 horas desde la entrega sin respuesta del cliente. ¿Deseas forzar la liberación de los fondos retenidos en Escrow?",
                                                    type: 'confirm',
                                                    severity: 'confirm',
                                                    onConfirm: async () => {
                                                        await updateJobStatus(job.id, 'completed');
                                                        showActionModal({
                                                            title: 'Fondos Liberados',
                                                            message: "¡Fondos liberados con éxito por falta de respuesta del cliente!",
                                                            severity: 'success'
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            Forzar Liberación (Ghosting)
                                        </button>
                                    )}
                                    
                                    {(job.status === 'completed' || isJobCanceled(job)) && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.85rem', 
                                                borderRadius: '12px',
                                                background: isJobCanceled(job) ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.1)',
                                                border: isJobCanceled(job) ? '1px solid #ef4444' : '1px solid #f59e0b',
                                                color: isJobCanceled(job) ? '#ef4444' : '#f59e0b',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedJobForReview(job);
                                            }}
                                        >
                                            <Star size={14} />
                                            {reviewedJobs[job.id] ? 'Modificar Reseña' : (isJobCanceled(job) ? 'Calificar (Cancelado)' : 'Calificar Freelancer')}
                                        </button>
                                    )}

                                    {(job.status === 'completed' || isJobCanceled(job)) && (
                                        <button 
                                            style={{ 
                                                padding: '0.4rem',
                                                borderRadius: '10px',
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0.6,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.opacity = 1}
                                            onMouseLeave={e => e.target.style.opacity = 0.6}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showActionModal({
                                                    title: 'Ocultar del Historial',
                                                    message: `¿Deseas ocultar "${job.serviceTitle}" de tu historial? Las reseñas no se eliminan.`,
                                                    type: 'confirm',
                                                    severity: 'confirm',
                                                    onConfirm: () => {
                                                        hideJob(job.id);
                                                        showActionModal({
                                                            title: 'Ocultado',
                                                            message: 'El trabajo fue ocultado del historial.',
                                                            severity: 'success'
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            <Trash2 size={14} />
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
                            minHeight: '440px',
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

const OrdersSection = ({ loading, myOrders, navigate, createChat, updateJobStatus, setIsCreatingChat, user, setSelectedJobForReview, reviewedJobs, getTimeAgo, showActionModal }) => {
    const [activeTab, setActiveTab] = useState('activos');

    const filteredOrders = useMemo(() => {
        return myOrders.filter(job => {
            if (activeTab === 'activos') return ['active', 'delivered', 'pending_approval'].includes(job.status);
            return ['completed', 'canceled', 'rejected', 'refunded'].includes(job.status);
        });
    }, [myOrders, activeTab]);

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <div className="proposal-section-header">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>Mis Pedidos / Servicios Contratados</h3>
                <div className="proposal-tabs">
                    <button className={`proposal-tab ${activeTab === 'activos' ? 'active' : ''}`} onClick={() => setActiveTab('activos')}>Activos <span className="tab-count">{myOrders.filter(j => ['active', 'delivered', 'pending_approval'].includes(j.status)).length}</span></button>
                    <button className={`proposal-tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>Historial <span className="tab-count">{myOrders.filter(j => ['completed', 'canceled', 'rejected', 'refunded'].includes(j.status)).length}</span></button>
                </div>
            </div>
            <div className="dashboard-list-scroll">
                {loading && myOrders.length === 0 ? (
                    <ListSkeleton />
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(job => (
                        <div key={job.id} className={`glass job-card order-card premium-job-card status-${job.status}`} style={{
                            display: 'flex',
                            gap: '1.2rem',
                            alignItems: 'center',
                            padding: '0.8rem 1.2rem',
                            borderRadius: '20px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer',
                            marginBottom: '1.2rem'
                        }} onClick={() => {
                            if (job.projectId) navigate(`/project/${job.projectId}`);
                            else if (job.serviceId) navigate(`/service/${job.serviceId}`);
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
                            }} onClick={(e) => {
                                e.stopPropagation();
                                navigate(job.freelancerRole === 'company' ? `/company/${job.freelancerId}` : `/freelancer/${job.freelancerId}`);
                            }}>
                                <img src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} alt={job.freelancerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            {/* Info Section */}
                            <div className="job-main-info" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '4px' }}>
                                    <h4 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(job.freelancerRole === 'company' ? `/company/${job.freelancerId}` : `/freelancer/${job.freelancerId}`);
                                        }}
                                        style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                                    >
                                        @{job.freelancerUsername || 'usuario'}
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400' }}>• {job.freelancerName || 'Freelancer'}</span>
                                    
                                    {/* Inline Deadline Badge */}
                                    {(() => {
                                        const preciseTime = job.deadline ? getPreciseTimeRemaining(job.deadline) : null;
                                        if (!preciseTime || job.status !== 'active') return null;
                                        return (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                color: 'var(--primary-soft)',
                                                fontWeight: '800',
                                                border: '1px solid currentColor',
                                                textTransform: 'uppercase'
                                            }}>
                                                {preciseTime}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Contratado: <strong style={{ color: 'var(--primary-soft)', fontWeight: '700' }}>{job.serviceTitle}</strong>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ 
                                            fontSize: '0.85rem', 
                                            color: isJobCanceled(job) ? '#ef4444' : (job.status === 'completed' ? '#10b981' : (job.status === 'active' ? '#3b82f6' : '#f59e0b')), 
                                            fontWeight: '800', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: isJobCanceled(job) ? 'rgba(239, 68, 68, 0.08)' : (job.status === 'completed' ? 'rgba(16, 185, 129, 0.08)' : (job.status === 'active' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)')),
                                            border: '1px solid currentColor'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }}></span>
                                            {job.status === 'active' ? 'EN PROGRESO' : 
                                            job.status === 'delivered' ? 'RECIBIDO (PARA REVISAR)' : 
                                            isJobCanceled(job) ? `CANCELADO (${getTimeAgo(job.completedAt || job.updatedAt)})` :
                                            job.status === 'completed' ? `FINALIZADO (${getTimeAgo(job.completedAt || job.updatedAt)})` :
                                            (job.status?.toUpperCase() || 'ESTADO')}
                                        </span>
                                    </div>

                                    {isJobCanceled(job) && job.deliveryResult && (
                                        <div style={{ 
                                            fontSize: '0.8rem', 
                                            color: 'var(--text-muted)', 
                                            background: 'rgba(0,0,0,0.03)', 
                                            padding: '8px 12px', 
                                            borderRadius: '10px',
                                            borderLeft: '3px solid #ef4444',
                                            maxWidth: '500px',
                                            marginTop: '4px'
                                        }}>
                                            <strong>Motivo:</strong> {job.deliveryResult
                                                .replace('Solicitud de cancelación por cliente. Motivo: ', '')
                                                .replace('Cancelado por freelancer. Motivo: ', '')
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Price & Actions Section */}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end', minWidth: '180px' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>${job.amount}</div>
                                <div className="proposal-actions" style={{ display: 'flex', gap: '0.5rem' }}>

                                    {job.status === 'delivered' && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.8rem', 
                                                borderRadius: '12px', 
                                                background: '#10b981', 
                                                border: 'none',
                                                color: 'white',
                                                fontWeight: '800',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                            }} 
                                            onClick={async (e) => { 
                                                e.stopPropagation(); 
                                                showActionModal({
                                                    title: 'Aprobar Entrega',
                                                    message: '¿Aprobar esta entrega y finalizar el trabajo? El dinero será liberado al freelancer.',
                                                    type: 'confirm',
                                                    severity: 'confirm',
                                                    onConfirm: async () => {
                                                        await updateJobStatus(job.id, 'completed');
                                                    }
                                                });
                                            }}
                                        >
                                            Aprobar
                                        </button>
                                    )}
                                    {job.status === 'active' && (
                                        <button 
                                            className="btn-danger" 
                                            style={{ 
                                                padding: '0.4rem 1rem', 
                                                fontSize: '0.75rem', 
                                                borderRadius: '10px', 
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid #ef4444',
                                                color: '#ef4444',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer'
                                            }} 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                showActionModal({
                                                    title: 'Solicitar Cancelación',
                                                    message: '⚠️ AVISO: El dinero será devuelto en aproximadamente 15 días hábiles. Se analizará el motivo; en caso de intento de estafa o motivo falso, la cuenta será bloqueada y el dinero se liberará al freelancer.',
                                                    type: 'prompt',
                                                    severity: 'warning',
                                                    confirmText: 'Confirmar Solicitud',
                                                    onConfirm: (reason) => {
                                                        if (!reason || reason.trim().length < 20) {
                                                            showActionModal({
                                                                title: 'Error',
                                                                message: 'Debes proporcionar un motivo detallado (mínimo 20 caracteres).',
                                                                severity: 'warning'
                                                            });
                                                            return;
                                                        }
                                                        updateJobStatus(job.id, 'cancellation_requested', `Solicitud de cancelación por cliente. Motivo: ${reason}`);
                                                        showActionModal({
                                                            title: 'Solicitud Enviada',
                                                            message: 'Tu solicitud de cancelación ha sido registrada y está siendo analizada por el equipo de soporte.',
                                                            severity: 'info'
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            <X size={14} />
                                            Cancelar
                                        </button>
                                    )}
                                    {job.status !== 'pending_approval' && (
                                        <button className="btn-secondary" style={{ 
                                            padding: '0.4rem 1rem', 
                                            fontSize: '0.75rem',
                                            borderRadius: '10px',
                                            background: 'var(--bg-body)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            fontWeight: '600'
                                        }} onClick={async (e) => {
                                            e.stopPropagation();
                                            setIsCreatingChat(true);
                                            try {
                                                const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                                if (chatId) navigate(`/chat/${chatId}`);
                                                else setIsCreatingChat(false);
                                            } catch { setIsCreatingChat(false); }
                                        }}>Chat</button>
                                    )}
                                    {(job.status === 'completed' || isJobCanceled(job)) && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.5rem 1.2rem', 
                                                fontSize: '0.85rem', 
                                                borderRadius: '12px',
                                                background: reviewedJobs[job.id] ? 'rgba(16, 185, 129, 0.1)' : (isJobCanceled(job) ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.1)'),
                                                border: reviewedJobs[job.id] ? '1px solid #10b981' : (isJobCanceled(job) ? '1px solid #ef4444' : '1px solid #f59e0b'),
                                                color: reviewedJobs[job.id] ? '#10b981' : (isJobCanceled(job) ? '#ef4444' : '#f59e0b'),
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedJobForReview(job);
                                            }}
                                        >
                                            <Star size={14} fill={reviewedJobs[job.id] ? "currentColor" : "none"} />
                                            {reviewedJobs[job.id] ? 'Reseña OK' : (isJobCanceled(job) ? 'Calificar (Cancelado)' : 'Calificar Freelancer')}
                                        </button>
                                    )}

                                    <button className="btn-outline" style={{ 
                                        padding: '0.4rem 1rem', 
                                        fontSize: '0.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '500'
                                    }} onClick={(e) => {
                                        e.stopPropagation();
                                        if (job.projectId) navigate(`/project/${job.projectId}`);
                                        else if (job.serviceId) navigate(`/service/${job.serviceId}`);
                                    }}>Detalle</button>

                                    {(job.status === 'completed' || isJobCanceled(job)) && (
                                        <button 
                                            style={{ 
                                                padding: '0.4rem',
                                                borderRadius: '10px',
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0.6,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseEnter={e => e.target.style.opacity = 1}
                                            onMouseLeave={e => e.target.style.opacity = 0.6}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showActionModal({
                                                    title: 'Ocultar del Historial',
                                                    message: `¿Deseas ocultar "${job.serviceTitle}" de tu historial? Las reseñas no se eliminan.`,
                                                    type: 'confirm',
                                                    severity: 'confirm',
                                                    onConfirm: () => {
                                                        hideJob(job.id);
                                                        showActionModal({
                                                            title: 'Ocultado',
                                                            message: 'El trabajo fue ocultado del historial.',
                                                            severity: 'success'
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
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

const BadgesSection = ({ user, navigate }) => {
    const Icons = {
        Sales: <Coin size={20} />,
        Level: <Flame size={20} />,
        Service: <Rocket size={20} />,
        Loyalty: <Heart size={20} />,
        Speed: <Flame size={20} />,
        Review: <Star size={20} />,
        Handshake: <Handshake size={20} />,
        Eye: <Eye size={20} />,
        Users: <Users size={20} />
    };

    const isClient = user.role === 'buyer' || user.role === 'company';
    const unlockedIds = user.gamification?.badges || [];

    const getIconForFamily = (familyId) => {
        const map = { 
            sales: Icons.Sales, purchases: Icons.Sales, 
            levels: Icons.Level, services: Icons.Service, 
            loyalty: Icons.Loyalty, speed: Icons.Speed, 
            reviews: Icons.Review, talent: Icons.Users, 
            projects: Icons.Eye 
        };
        return map[familyId] || Icons.Review;
    };

    const families = isClient ? CLIENT_BADGE_FAMILIES : BADGE_FAMILIES;

    const badgeTiers = [
        { name: 'bronze', color: '#cd7f32' },
        { name: 'silver', color: '#c0c0c0' },
        { name: 'gold', color: '#ffd700' },
        { name: 'platinum', color: '#e5e4e2' },
        { name: 'diamond', color: '#b9f2ff' }
    ];

    const familyStatus = families.map(f => {
        const unlockedInFamily = f.badges.filter(b => unlockedIds.includes(b.id));
        const highestBadgeIndex = unlockedInFamily.length - 1;
        const latestBadge = highestBadgeIndex >= 0 ? unlockedInFamily[highestBadgeIndex] : null;
        
        const tierIndex = latestBadge ? f.badges.findIndex(b => b.id === latestBadge.id) : -1;
        const tier = tierIndex >= 0 ? badgeTiers[Math.min(tierIndex, badgeTiers.length - 1)] : null;

        return {
            familyId: f.familyId,
            familyTitle: f.title,
            badge: latestBadge,
            tier: tier,
            icon: getIconForFamily(f.familyId)
        };
    });

    return (
        <div className="dashboard-badges-section">
            <div className="section-header-row">
                <h3 className="section-title">Mis Insignias</h3>
                <button onClick={() => navigate('/badges')} className="btn-text-link">
                    Ver todas →
                </button>
            </div>
            <div className="dashboard-badges-grid">
                {familyStatus.map((status, idx) => (
                    <div 
                        key={idx} 
                        className={`badge-family-card ${status.badge ? 'unlocked' : 'locked'} tier-${status.tier?.name || 'none'}`}
                        style={status.tier ? { '--tier-color': status.tier.color } : {}}
                    >
                        <div className="badge-icon-wrapper">
                            {status.icon}
                        </div>
                        <div className="badge-content">
                            <span className="family-label">{status.familyTitle}</span>
                            <h4 className="badge-name">{status.badge ? status.badge.title : 'No desbloqueado'}</h4>
                            {status.badge && <p className="badge-desc">{status.badge.desc}</p>}
                        </div>
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
    setExpandedProposalId,
    showActionModal
}) => {
    const pendingProposals = receivedProposals.filter(p => (p.status || '').toLowerCase() === 'pending');

    return (
        <div style={{ marginTop: '2.5rem' }}>
            <h3 className="section-title">Postulantes a Mis Proyectos</h3>
            <div className="dashboard-list-scroll">
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

    let availableMethods = [];
    if (Array.isArray(methods)) {
        availableMethods = methods;
    } else if (typeof methods === 'string' && methods.trim()) {
        availableMethods = methods.split(',').map(m => m.trim());
    }

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

const Dashboard = () => {
    const {
        user: authUser,
        updateUser,
        isTutorView,
        supervisedUser,
        enterMirrorMode
    } = useAuth();

    const user = isTutorView ? supervisedUser : authUser;

    const { jobs, updateJobStatus: updateJobStatusApi, createJob, hideJob, resolveEscrow } = useJobs();
    const { services } = useServices();
    const { createChat } = useChat();
    const { refresh: refreshNotifications } = useNotifications();
    const navigate = useNavigate();

    const [tutorados, setTutorados] = useState([]);



    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [pauseLoading, setPauseLoading] = useState(false);

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
    const [selectedJobForReview, setSelectedJobForReview] = useState(null);
    const [reviewedJobs, setReviewedJobs] = useState({});
    const { refreshBadges } = useBadgeNotification();

    const { showActionModal } = useActionModal();

    const updateJobStatus = async (jobId, status) => {
        if (isTutorView) {
            showActionModal({
                title: 'Modo Lectura',
                message: 'No puedes realizar esta acción en modo lectura.',
                severity: 'warning'
            });
            return;
        }
        const result = await updateJobStatusApi(jobId, status);
        if (status === 'completed' && refreshBadges) {
            refreshBadges();
        }
        if (refreshNotifications) refreshNotifications();
        return result;
    };

    const canForcePayout = (deliveredAt) => {
        if (!deliveredAt) return false;
        const deliveredDate = new Date(deliveredAt);
        const now = new Date();
        const diffHours = (now - deliveredDate) / (1000 * 60 * 60);
        return diffHours >= 72;
    };

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

    // V40: Robust Gamification Sync - Prevent infinite DoS loops
    const lastSyncRef = useRef(null);

    useEffect(() => {
        if (!user || (user.role !== 'freelancer' && user.role !== 'company') || isTutorView) return;

        const processedUser = processGamificationRules(user);
        
        // Deep comparison of gamification object to avoid stringify loops
        const currentG = JSON.stringify(user.gamification);
        const processedG = JSON.stringify(processedUser.gamification);
        
        const hasChanges =
            processedUser.xp !== user.xp ||
            processedUser.level !== user.level ||
            processedG !== currentG;

        if (hasChanges && lastSyncRef.current !== processedG) {
            console.log("[Dashboard] Syncing gamification changes...");
            lastSyncRef.current = processedG;
            updateUser(processedUser).catch(err => {
                console.warn("[Dashboard] Silently failed to sync gamification rules:", err);
            });
        }
    }, [user?.id, user?.xp, user?.level, user?.gamification, updateUser, isTutorView]);

    const myOrders = useMemo(() => user ? (jobs || []).filter(j => j.buyerId === user.id) : [], [jobs, user?.id]);
    const myWork = useMemo(() => user ? (jobs || []).filter(j => j.freelancerId === user.id) : [], [jobs, user?.id]);
    const myServices = useMemo(() => user ? (services || []).filter(s => s.freelancerId === user.id) : [], [services, user?.id]);

    const filteredProposals = useMemo(() => {
        return myProposals.filter(p => {
            const status = (p.status || '').toLowerCase().trim();
            if (activeProposalTab === 'active') return status === 'pending';
            return status !== 'pending';
        });
    }, [myProposals, activeProposalTab]);

    useEffect(() => {
        if (!user || loading) return;
        
        const checkReviews = async () => {
            const jobsToPrompt = myOrders.filter(j => j.status === 'completed');
            const allJobsForTracking = [...myWork, ...myOrders].filter(j => j.status === 'completed');
            
            if (allJobsForTracking.length === 0) return;

            try {
                const results = await Promise.all(
                    allJobsForTracking.map(async (job) => {
                        const reviewed = await ReviewService.hasUserReviewedJob(job.id, user.id);
                        return { id: job.id, reviewed };
                    })
                );

                const newReviewedMap = {};
                results.forEach(r => newReviewedMap[r.id] = r.reviewed);
                setReviewedJobs(newReviewedMap);

                if (!selectedJobForReview) {
                    const sortedPromptJobs = jobsToPrompt.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
                    for (const job of sortedPromptJobs) {
                        if (!newReviewedMap[job.id]) {
                            setSelectedJobForReview(job);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn("Error checking reviews:", e);
            }
        };
        
        const timer = setTimeout(checkReviews, 2000);
        return () => clearTimeout(timer);
    }, [myWork.length, myOrders.length, user?.id, loading]);

    if (!user) return null;

    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const nextLevelXP = calculateNextLevelXP(currentLevel);
    const baseXPForCurrentLevel = getBaseXPForLevel(currentLevel);
    const relativeXP = Math.max(0, currentXP - baseXPForCurrentLevel);
    
    const isMaxLevel = currentLevel >= MAX_LEVEL;
    const xpPercentage = isMaxLevel 
        ? Math.min(Math.max(0, (currentXP - XP_TABLE[9]) / MAX_BUFFER_XP) * 100, 100) 
        : Math.min((relativeXP / nextLevelXP) * 100, 100);
        
    const xpDisplayText = isMaxLevel 
        ? `${currentXP - XP_TABLE[9]} / ${MAX_BUFFER_XP} Buffer XP` 
        : `${relativeXP} / ${nextLevelXP} XP`;
        
    const levelLabel = isMaxLevel 
        ? `Nivel Máximo (10) - ${getBenefitsForRole(user.role)[10]?.name}` 
        : `Hacia Nivel ${currentLevel + 1}: ${getBenefitsForRole(user.role)[currentLevel + 1]?.name}`;
    const currentLevelName = getBenefitsForRole(user.role)[currentLevel]?.name || '';

    const handleDemoLevelUp = () => {
        if ((user.level || 1) >= MAX_LEVEL) {
            const currentXP = user.xp || 0;
            const newXP = Math.min(currentXP + 1000, 10000 + MAX_BUFFER_XP);
            updateUser({ ...user, xp: newXP });
            showActionModal({
                title: 'XP Añadida',
                message: `¡XP sumada al Buffer! Total: ${newXP}`,
                severity: 'success'
            });
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
                showActionModal({
                    title: 'Desactivar Pausa',
                    message: '¿Desactivar el Modo Pausa? Tus servicios volverán a ser visibles normalmente.',
                    type: 'confirm',
                    severity: 'confirm',
                    onConfirm: async () => {
                        setPauseLoading(true);
                        await updateUser(deactivatePauseMode(user));
                        setPauseLoading(false);
                    }
                });
            } else {
                showActionModal({
                    title: 'Activar Pausa',
                    message: '¿Activar Modo Pausa? Tus servicios se mostrarán al final de las listas para evitar nuevos pedidos. Puedes desactivarlo cuando quieras.',
                    type: 'confirm',
                    severity: 'confirm',
                    onConfirm: async () => {
                        setPauseLoading(true);
                        await updateUser(activatePauseMode(user));
                        setPauseLoading(false);
                    }
                });
            }
        } catch (err) {
            showActionModal({
                title: 'Error',
                message: "No se pudo cambiar el estado de disponibilidad: " + err.message,
                severity: 'error'
            });
        } finally {
            setPauseLoading(false);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (isTutorView) {
            showActionModal({
                title: 'Modo Lectura',
                message: 'No puedes realizar esta acción en modo lectura.',
                severity: 'warning'
            });
            return;
        }
        showActionModal({
            title: 'Eliminar Proyecto',
            message: '¿Estás seguro de que deseas eliminar este proyecto de forma permanente? Esta acción no se puede deshacer.',
            type: 'confirm',
            severity: 'error',
            onConfirm: async () => {
                try {
                    await deleteProjectApi(projectId);
                    const updatedProjects = myPublishedProjects.filter(p => p.id !== projectId);
                    setMyPublishedProjects(updatedProjects);
                    localStorage.setItem(`cooplance_projects_${user.id}`, JSON.stringify(updatedProjects));
                } catch (err) {
                    showActionModal({
                        title: 'Error',
                        message: 'No se pudo eliminar el proyecto: ' + err.message,
                        severity: 'error'
                    });
                }
            }
        });
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
            showActionModal({
                title: 'Límite alcanzado',
                message: msg,
                severity: 'warning'
            });
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
            showActionModal({
                title: 'Límite alcanzado',
                message: msg,
                severity: 'warning'
            });
            return;
        }

        navigate('/create-service');
    };

    const handleAcceptProposal = async (proposal) => {
        const project = myPublishedProjects.find(p => String(p.id) === String(proposal.projectId));
        if (!project) return;
        setSelectedProposalForPayment({ proposal, project });
    };

    const confirmHiringWithPayment = async (paymentMethod) => {
        if (!selectedProposalForPayment) return;

        const { proposal, project } = selectedProposalForPayment;
        setSelectedProposalForPayment(null);

        try {
            setLoading(true);
            setIsCreatingChat(true);

            await updateProposalStatus(proposal.id, 'accepted');

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
                chatId = await createChat([user.id, proposal.userId], 'proposal', proposal.id, project.title);
            }

            const projectWithPayment = {
                ...project,
                freelancerId: proposal.userId,
                selectedPaymentMethod: paymentMethod
            };

            await createJob(projectWithPayment, user);

            const { error: pError } = await supabase
                .from('projects')
                .update({ status: 'hired' })
                .eq('id', project.id);

            if (!pError) {
                setMyPublishedProjects(prev => prev.map(p =>
                    p.id === project.id ? { ...p, status: 'hired' } : p
                ));
            }

            if (chatId) {
                navigate(`/chat/${chatId}`);
            } else {
                showActionModal({
                    title: 'Contratación Exitosa',
                    message: '¡Contratación exitosa! Redirigiendo al chat...',
                    severity: 'success',
                    onConfirm: () => navigate('/chat')
                });
            }
        } catch (err) {
            showActionModal({
                title: 'Error',
                message: "No se pudo completar la contratación: " + err.message,
                severity: 'error'
            });
        } finally {
            setLoading(false);
            setIsCreatingChat(false);
        }
    };

    const handleRejectProposal = async (proposal) => {
        showActionModal({
            title: 'Rechazar Postulación',
            message: '¿Estás seguro de que deseas rechazar esta postulación?',
            type: 'confirm',
            severity: 'error',
            onConfirm: async () => {
                try {
                    await updateProposalStatus(proposal.id, 'rejected');
                    setReceivedProposals(prev => prev.filter(p => p.id !== proposal.id));
                } catch {
                    showActionModal({
                        title: 'Error',
                        message: "No se pudo rechazar la postulación.",
                        severity: 'error'
                    });
                }
            }
        });
    };

    const handleCancelProposal = async (e, id) => {
        e.stopPropagation();
        showActionModal({
            title: 'Cancelar',
            message: '¿Cancelar postulación?',
            type: 'confirm',
            severity: 'error',
            onConfirm: async () => {
                await updateProposalStatus(id, 'canceled');
                setMyProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'canceled' } : p));
            }
        });
    };

    const handleDeleteProposal = async (e, id) => {
        if (isTutorView) {
            showActionModal({ title: 'Acción bloqueada', message: 'Acción bloqueada en modo lectura.', severity: 'warning' });
            return;
        }
        e.stopPropagation();
        showActionModal({
            title: 'Borrar Historial',
            message: '¿Borrar historial?',
            type: 'confirm',
            severity: 'error',
            onConfirm: async () => {
                await deleteProposalApi(id);
                setMyProposals(prev => prev.filter(p => p.id !== id));
            }
        });
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

    const handleReviewSubmit = async ({ rating, comment }) => {
        if (!selectedJobForReview) return;
        
        try {
            await ReviewService.createReview({
                serviceId: selectedJobForReview.serviceId,
                reviewerId: user.id,
                targetId: user.id === selectedJobForReview.buyerId ? selectedJobForReview.freelancerId : selectedJobForReview.buyerId,
                rating,
                comment,
                jobId: selectedJobForReview.id
            });
            
            if (user.role === 'buyer' || user.role === 'client' || user.role === 'company') {
                // Only mark as completed if the job is in delivered state — NEVER overwrite canceled status
                if (selectedJobForReview.status === 'delivered') {
                    await updateJobStatus(selectedJobForReview.id, 'completed');
                }
            }
            
            setReviewedJobs(prev => ({ ...prev, [selectedJobForReview.id]: true }));
            setSelectedJobForReview(null);
            showActionModal({
                title: '¡Muchas gracias!',
                message: "¡Gracias por tu reseña! Tu opinión ayuda a que la comunidad crezca de forma segura.",
                severity: 'success'
            });
        } catch (err) {
            showActionModal({
                title: 'Error',
                message: "No se pudo guardar la reseña. Por favor intenta de nuevo.",
                severity: 'error'
            });
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
                    <WorkReceivedSection loading={loading} myWork={myWork} updateJobStatus={updateJobStatus} createChat={createChat} navigate={navigate} setIsCreatingChat={setIsCreatingChat} user={user} setSelectedJobForReview={setSelectedJobForReview} reviewedJobs={reviewedJobs} getTimeAgo={getTimeAgo} showActionModal={showActionModal} canForcePayout={canForcePayout} />
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
                        showActionModal={showActionModal}
                    />
                    <OrdersSection loading={loading} myOrders={myOrders} navigate={navigate} createChat={createChat} updateJobStatus={updateJobStatus} setIsCreatingChat={setIsCreatingChat} user={user} setSelectedJobForReview={setSelectedJobForReview} reviewedJobs={reviewedJobs} getTimeAgo={getTimeAgo} showActionModal={showActionModal} />
                </>
            )}

            <LevelUpModal isOpen={showLevelUpModal} onClose={() => setShowLevelUpModal(false)} level={currentLevel} />

            <ReviewModal
                isOpen={!!selectedJobForReview}
                onClose={() => setSelectedJobForReview(null)}
                onConfirm={handleReviewSubmit}
                title={user.role === 'freelancer' ? "Califica al Cliente" : "Califica a"}
                targetName={user.role === 'freelancer' ? `@${selectedJobForReview?.buyerUsername}` : `@${selectedJobForReview?.freelancerUsername}`}
                serviceTitle={selectedJobForReview?.serviceTitle}
                subtitle={user.role === 'freelancer' ? "¿Cómo fue tu experiencia trabajando con este cliente?" : "¿Estás satisfecho con el resultado final?"}
            />


        </div>
    );
};

export default Dashboard;
