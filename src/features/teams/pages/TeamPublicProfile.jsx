import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../../features/auth/context/AuthContext';
import ReportModal from '../../../components/common/ReportModal';
import '../../../styles/main.scss';

const TeamPublicProfile = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { getPublicProfile, respondToInvite } = useTeams();
    const { user } = useAuth();
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const data = await getPublicProfile(teamId);
                setTeam(data);
            } catch (err) {
                setError("No se pudo cargar el perfil del equipo.");
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, [teamId, getPublicProfile]);

    if (loading) return <div className="loading-spinner"></div>;
    if (error) return <div className="container" style={{ padding: '4rem' }}><h2>Error: {error}</h2></div>;
    if (!team) return null;

    const isPendingMember = team.members.some(m => (m.user_id === user?.id || m.userId === user?.id) && m.status === 'pending');

    const handleInviteResponse = async (accept) => {
        try {
            await respondToInvite(team.id, accept);
            if (accept) {
                const updatedTeam = await getPublicProfile(team.id);
                setTeam(updatedTeam);
            } else {
                navigate(-1);
            }
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '1000px' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>← Volver</button>

            {/* Header */}
            <div className="glass" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)' }}>
                    {team.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>{team.name}</h1>
                    
                    {/* Categories Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.2rem' }}>
                        {(team.categories || []).map((cat, i) => (
                            <span key={i} style={{ 
                                background: 'rgba(139, 92, 246, 0.1)', 
                                color: '#a78bfa', 
                                padding: '0.4rem 1rem', 
                                borderRadius: '12px', 
                                fontSize: '0.85rem', 
                                fontWeight: '600',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                {cat}
                            </span>
                        ))}
                    </div>

                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '600px', marginBottom: '1.5rem' }}>{team.description}</p>

                    {isPendingMember && (
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Tienes una invitación pendiente de esta Coop.</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleInviteResponse(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Aceptar</button>
                                <button onClick={() => handleInviteResponse(false)} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Rechazar</button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reputación</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24' }}>★ {team.stats?.avgRating || 0}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proyectos</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{team.stats?.totalProjects || 0}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Miembros</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{team.members.filter(m => m.status === 'active').length}</span>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignSelf: 'flex-start' }}>
                    <button 
                        onClick={() => setIsReportModalOpen(true)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                        Reportar Agencia
                    </button>
                </div>
            </div>

            <ReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportedId={team.id}
                referenceType="coop"
                itemName={team.name}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '2rem' }}>

                {/* Left Column: Transparency & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Transparency Metrics */}
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>Transparencia</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span>Tasa de Rotación Histórica</span>
                            <span style={{ fontWeight: 'bold', color: parseFloat(team.metrics.rotationRate) > 30 ? '#ef4444' : '#10b981' }}>{team.metrics.rotationRate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tiempo Promedio Entrega</span>
                            <span style={{ fontWeight: 'bold' }}>{team.metrics.avgDeliveryTime}</span>
                        </div>
                    </div>

                    {/* Ex-Members History */}
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Historial de Miembros</h3>

                        {team.members.filter(m => m.status === 'left').length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay registros de salidas.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {team.members.filter(m => m.status === 'left').map(m => (
                                    <div key={m.user_id || m.userId} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                            <span style={{ fontWeight: '600' }}>{m.username}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Salió: {new Date(m.leftAt).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rol anterior: {m.role}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Name History */}
                    {team.nameHistory && team.nameHistory.length > 0 && (
                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                            <h3 className="section-title" style={{ marginBottom: '1rem', color: '#f59e0b' }}>Historial de Nombres</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {team.nameHistory.map((h, i) => (
                                    <div key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{h.oldName}</span>
                                        <span style={{ fontSize: '0.8rem' }}>{new Date(h.changedAt).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Current Team & Services */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Active Members */}
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Equipo Activo</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {team.members.filter(m => m.status === 'active').map(member => (
                                <div key={member.user_id || member.userId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {member.username.charAt(0)}
                                    </div>
                                    <div className="team-text-info">
                                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{member.username}</h2>
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                            {(team.categories || []).slice(0, 2).map((cat, i) => (
                                                <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>{cat}</span>
                                            ))}
                                            {team.categories?.length > 2 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+1</span>}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {member.role === 'owner' ? 'Fundador' : member.role} • Nivel {member.level}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Services */}
                    <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Servicios</h3>
                        {team.services && team.services.length > 0 ? (
                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                {team.services.map(s => (
                                    <div key={s.id} style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.3rem' }}>{s.title}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{s.price}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>Este equipo no ofrece servicios públicos aún.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPublicProfile;
