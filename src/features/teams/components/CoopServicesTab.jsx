import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCard from '../../services/components/ServiceCard';
import ServiceCreateForm from '../../services/components/ServiceCreateForm';
import { getProposalsByTeam, deleteProposal as deleteProposalApi, updateProposalStatus as updateProposalStatusApi } from '../../../lib/proposalService';

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

const getRemainingDays = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
};

const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' años';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' meses';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' días';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm';
    return Math.floor(seconds) + 's';
};

const CoopServicesTab = ({ coop, amIOwner, amIAdmin, amIManager, pendingJobs, loadingJobs, handleAcceptJob, handleModifyTeam }) => {
    const navigate = useNavigate();
    const [activeServiceTab, setActiveServiceTab] = useState('tarjetas');
    const [isCreatingService, setIsCreatingService] = useState(false);
    const [proposals, setProposals] = useState([]);
    const [loadingProposals, setLoadingProposals] = useState(true);
    const [expandedProposalId, setExpandedProposalId] = useState(null);

    useEffect(() => {
        const fetchProposals = async () => {
            setLoadingProposals(true);
            const data = await getProposalsByTeam(coop.id);
            setProposals(data);
            setLoadingProposals(false);
        };
        if (coop?.id) fetchProposals();
    }, [coop?.id]);

    // Filter services that belong to this coop
    // NOTE: This assumes we have access to services array, we can pass it as a prop or use hook.
    // For now, we assume coop.team_services contains them (mapped in TeamContext).
    const coopServices = coop.team_services || [];

    const handleCreateServiceClick = () => {
        setIsCreatingService(true);
    };

    if (isCreatingService) {
        return (
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0 }}>Crear Servicio de Agencia</h3>
                    <button className="btn-secondary" onClick={() => setIsCreatingService(false)}>Volver</button>
                </div>
                <ServiceCreateForm 
                    onCancel={() => setIsCreatingService(false)} 
                    coopId={coop.id}
                    coopMembers={coop.members}
                />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveServiceTab('tarjetas')}
                    style={{ background: 'transparent', border: 'none', color: activeServiceTab === 'tarjetas' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold', padding: '0.5rem', borderBottom: activeServiceTab === 'tarjetas' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Tarjetas y Pedidos
                </button>
                <button 
                    onClick={() => setActiveServiceTab('activos')}
                    style={{ background: 'transparent', border: 'none', color: activeServiceTab === 'activos' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold', padding: '0.5rem', borderBottom: activeServiceTab === 'activos' ? '2px solid var(--primary)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Proyectos Activos
                </button>
            </div>

            {activeServiceTab === 'tarjetas' && (
                <>
                    {/* SERVICIOS CREADOS (MAX 3) */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0 }}>Servicios Creados</h3>
                            {amIAdmin && coopServices.length < 3 && (
                                (() => {
                                    const activeMembersCount = coop.members?.filter(m => m.status !== 'left').length || 0;
                                    if (activeMembersCount < 2) {
                                        return (
                                            <button className="btn-primary" disabled style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: 0.5, cursor: 'not-allowed' }} title="Necesitas al menos 2 miembros activos en la agencia para poder ofrecer servicios.">
                                                + Crear Servicio
                                            </button>
                                        );
                                    }
                                    return (
                                        <button className="btn-primary" onClick={handleCreateServiceClick} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                            + Crear Servicio
                                        </button>
                                    );
                                })()
                            )}
                        </div>
                        {coopServices.length > 0 ? (
                            <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {coopServices.map(service => (
                                    <ServiceCard key={service.id} service={{ ...service, level: 1 }} />
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>
                                {(coop.members?.filter(m => m.status !== 'left').length || 0) < 2 
                                    ? "Necesitas reclutar al menos 1 miembro más en tu agencia para poder ofrecer servicios y recibir pedidos."
                                    : "La agencia no ha creado ningún servicio aún. (Máximo 3)."
                                }
                            </p>
                        )}
                    </div>

                    {/* PEDIDOS ENTRANTES */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <h3 style={{ margin: '0 0 2rem 0' }}>Pedidos Recibidos</h3>
                        {loadingJobs ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando pedidos...</div>
                        ) : pendingJobs.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {pendingJobs.map(job => (
                                    <div key={job.id} style={{ padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{job.service_title || 'Trabajo Directo'}</h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>
                                                        {job.profiles?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>Cliente: {job.profiles?.first_name ? `${job.profiles.first_name} ${job.profiles.last_name || ''}` : job.profiles?.username}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>${job.budget || 0}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.delivery_days || 0} días entrega</div>
                                            </div>
                                        </div>
                                        
                                        {amIManager && (
                                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAcceptJob(job.id)}>Aceptar y Asignar Equipo</button>
                                                <button className="btn-secondary" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>Rechazar</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>No hay pedidos pendientes. Las contrataciones directas que reciba tu agencia aparecerán aquí.</p>
                            </div>
                        )}
                    </div>

                    {/* POSTULACIONES ENVIADAS */}
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <h3 style={{ margin: '0 0 2rem 0' }}>Postulaciones Enviadas</h3>
                        <div className="dashboard-list-scroll">
                            {loadingProposals ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando postulaciones...</div>
                            ) : proposals.length > 0 ? (
                                proposals.map(proposal => {
                                    const isExpanded = expandedProposalId === proposal.id;
                                    return (
                                        <div key={proposal.id} className={`proposal-card enhanced status-${proposal.status} ${isExpanded ? 'expanded' : ''}`} onClick={() => navigate(`/project/${proposal.projectId}`)}>
                                            <div className="proposal-card-content">
                                                <div className="proposal-client-info" onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(proposal.clientRole === 'company' ? `/company/${proposal.clientId}` : `/client/${proposal.clientId}`);
                                                }}>
                                                    <div className="client-avatar-wrapper">
                                                        {proposal.clientAvatar ? (
                                                            <img src={proposal.clientAvatar} alt={proposal.clientUsername} />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}>
                                                                {proposal.clientUsername?.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
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
                                                            Enviada hace {getTimeAgo(proposal.createdAt)}
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
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="proposal-letter-box" onClick={e => e.stopPropagation()}>
                                                    <h5>Carta de Presentación</h5>
                                                    <p>{proposal.coverLetter || 'Sin mensaje adjunto.'}</p>
                                                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                                        <div><strong>Presupuesto propuesto:</strong> ${proposal.amount}</div>
                                                        <div><strong>Tiempo de entrega:</strong> {proposal.deliveryDays} días</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Las postulaciones que la agencia envíe a proyectos aparecerán aquí.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeServiceTab === 'activos' && (
                <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Proyectos Activos
                    </h3>
                    {coop.jobs?.filter(s => s.status === 'active').length > 0 ? (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {coop.jobs.filter(s => s.status === 'active').map(job => (
                                <div key={job.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.3rem' }}>{job.service_title}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Presupuesto: ${job.budget}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => navigate(`/project/${job.project_id || job.id}`)}
                                                style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                VER DETALLES
                                            </button>
                                            {amIManager && (
                                                <button 
                                                    onClick={() => handleModifyTeam(job)}
                                                    style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    MODIFICAR EQUIPO
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                        <div style={{ width: '45%', height: '100%', background: '#10b981', borderRadius: '10px' }}></div>
                                    </div>
                                    <p style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estado del trabajo en progreso...</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay proyectos activos en este momento.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CoopServicesTab;
