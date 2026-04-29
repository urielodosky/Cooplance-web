import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import '../../../styles/main.scss';

const MyCoops = () => {
    const { userTeams, loading, respondToInvite, acceptRules } = useTeams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const activeCoops = userTeams.filter(team => {
        if (!team.members) return false;
        const m = team.members.find(mem => mem.user_id === user.id);
        return m?.accepted_rules_at !== null;
    });

    const pendingInvitations = userTeams.filter(team => {
        if (!team.members) return false;
        const m = team.members.find(mem => mem.user_id === user.id);
        return m?.accepted_rules_at === null;
    });

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '1000px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        Mis Coops
                        <div className="help-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div className="help-icon" style={{ width: '24px', height: '24px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', cursor: 'help', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
                            <div className="help-tooltip" style={{ width: '300px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'normal', textAlign: 'left', bottom: '100%', marginBottom: '15px', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 'normal', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}>
                                {user.role === 'freelancer'
                                    ? <>Las <strong>Coops</strong> son agencias colaborativas donde te unes con otros talentos para facturar más y acceder a proyectos corporativos de gran escala.</>
                                    : <>Tus <strong>Coops</strong> te permiten gestionar equipos de freelancers como una sola entidad profesional, centralizando la facturación y el talento.</>
                                }
                            </div>
                        </div>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {user.role === 'freelancer'
                            ? 'Gestiona tus agencias, miembros y reparto de ganancias.'
                            : 'Organiza y supervisa tus equipos de talento de confianza.'}
                    </p>
                </div>
                
                {/* Highlighted Button if 0 or 1 coop */}
                {userTeams.length <= 1 && (
                    <button className="btn-primary" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.6rem',
                        padding: '0.7rem 1.4rem',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
                    }} onClick={() => navigate('/create-coop')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Fundar Nueva Coop
                    </button>
                )}
            </div>

            {/* Invitations Section */}
            {pendingInvitations.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Invitaciones Pendientes ({pendingInvitations.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {pendingInvitations.map(team => {
                            const invite = team.members.find(m => m.user_id === user.id);
                            const inviter = invite?.inviter;
                            const inviterName = inviter ? (inviter.first_name ? `${inviter.first_name} ${inviter.last_name || ''}` : inviter.username) : 'Un miembro';
                            
                            return (
                                <div key={team.id} className="glass animate-in" style={{ 
                                    padding: '1.5rem', 
                                    borderRadius: '24px', 
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    background: 'rgba(139, 92, 246, 0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.2rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div 
                                                onClick={() => navigate(`/coop/${team.id}/public`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {team.logo || team.avatar_url ? (
                                                    <img src={team.logo || team.avatar_url} alt={team.name} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>
                                                        {team.name.substring(0, 1)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                                                    <span 
                                                        onClick={() => navigate(`/coop/${team.id}/public`)}
                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {team.name}
                                                    </span>
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    Invitado por <strong>@{inviter?.username || 'miembro'}</strong> ({inviterName})
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                onClick={() => respondToInvite(team.id, false)}
                                            >
                                                Rechazar
                                            </button>
                                            <button 
                                                className="btn-primary" 
                                                style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                                                onClick={() => acceptRules(team.id)}
                                            >
                                                Aceptar e Ingresar
                                            </button>
                                        </div>
                                    </div>

                                    {invite?.invitation_message && (
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.03)', 
                                            padding: '1rem', 
                                            borderRadius: '12px', 
                                            borderLeft: '4px solid var(--primary)',
                                            fontSize: '0.9rem',
                                            lineHeight: '1.5',
                                            color: 'var(--text-secondary)',
                                            fontStyle: 'italic'
                                        }}>
                                            "{invite.invitation_message}"
                                        </div>
                                    )}

                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Al aceptar, confirmas que has leído y aceptas el <strong>Estatuto Interno</strong> de la agencia.
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List */}
            {activeCoops.length === 0 ? (
                <div className="glass" style={{ 
                    textAlign: 'center', 
                    padding: '4rem 2rem', 
                    borderRadius: '32px',
                    border: '2px dashed rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.01)'
                }}>
                    <div style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22"></line><line x1="15" y1="22" x2="15" y2="22"></line><line x1="12" y1="18" x2="12" y2="18"></line><line x1="12" y1="14" x2="12" y2="14"></line><line x1="12" y1="10" x2="12" y2="10"></line><line x1="12" y1="6" x2="12" y2="6"></line><line x1="8" y1="18" x2="8" y2="18"></line><line x1="8" y1="14" x2="8" y2="14"></line><line x1="8" y1="10" x2="8" y2="10"></line><line x1="8" y1="6" x2="8" y2="6"></line><line x1="16" y1="18" x2="16" y2="18"></line><line x1="16" y1="14" x2="16" y2="14"></line><line x1="16" y1="10" x2="16" y2="10"></line><line x1="16" y1="6" x2="16" y2="6"></line></svg>
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: '800' }}>Aún no perteneces a ninguna Coop</h2>
                    <p style={{ maxWidth: '600px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                        {user.role === 'freelancer'
                            ? 'Las agencias son el futuro del trabajo remoto. Crea tu propia Coop para invitar a otros colegas y empezar a competir por proyectos de alto presupuesto.'
                            : 'Arma tu equipo ideal. Reúne a tus freelancers favoritos bajo una misma bandera y simplifica la gestión de tus proyectos más complejos.'}
                    </p>
                    <button className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }} onClick={() => navigate('/create-coop')}>
                        Comenzar Ahora
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {activeCoops.map(team => {
                        const myMember = team.members.find(m => m.user_id === user.id);
                        const myRole = myMember?.role || 'worker';
                        const activeMembers = team.members?.filter(m => m.status !== 'left') || [];
                        
                        // Array of colors for categories
                        const catColors = [
                            'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        ];
                        
                        return (
                            <div key={team.id} className="glass coop-card" style={{ 
                                padding: '2rem', 
                                borderRadius: '24px', 
                                position: 'relative', 
                                overflow: 'hidden', 
                                border: '1px solid rgba(255,255,255,0.08)', 
                                transition: 'all 0.3s ease', 
                                display: 'flex', 
                                flexDirection: 'column',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="coop-avatar" style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold', color: 'white', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)', flexShrink: 0 }}>
                                            {team.avatar_url ? <img src={team.avatar_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }} /> : team.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.4rem 0', color: 'var(--text-primary)', lineHeight: '1.2' }}>{team.name}</h3>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                Nivel {team.level || 1}
                                            </span>
                                        </div>
                                    </div>
                                    {myRole === 'owner' && (
                                        <span style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Fundador</span>
                                    )}
                                </div>

                                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{team.description}</p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '2.5rem' }}>
                                    {(team.categories || []).map((cat, idx) => (
                                        <span key={idx} style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: catColors[idx % catColors.length], color: 'white', fontSize: '0.8rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            {cat.name || cat}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div className="member-facepile" style={{ display: 'flex', marginRight: '1rem' }}>
                                            {activeMembers.slice(0, 4).map((m, i) => (
                                                <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #0f172a', marginLeft: i === 0 ? 0 : '-12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', overflow: 'hidden' }} title={m.profile?.username || 'Miembro'}>
                                                    {m.profile?.avatar_url ? <img src={m.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.profile?.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            ))}
                                            {activeMembers.length > 4 && (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #0f172a', marginLeft: '-12px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                                    +{activeMembers.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{activeMembers.length} Miembros</span>
                                    </div>
                                    <button onClick={() => navigate(`/teams/${team.id}/dashboard`)} className="btn-primary" style={{ padding: '0.7rem 1.2rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Panel Coop <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {/* Quick Add Card */}
                    {activeCoops.length > 0 && activeCoops.length < 2 && (
                        <div className="team-card-add glass" style={{
                            padding: '2rem',
                            cursor: 'pointer',
                            borderRadius: '24px',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            minHeight: '350px'
                        }} onClick={() => navigate('/create-coop')}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </div>
                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '1rem' }}>Nueva Agencia</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyCoops;
