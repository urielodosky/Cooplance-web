import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import '../../../styles/main.scss';

const MyCoops = () => {
    const { userTeams, loading } = useTeams();
    const { user } = useAuth();
    const navigate = useNavigate();

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

            {/* List */}
            {userTeams.length === 0 ? (
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
                    {userTeams.map(team => {
                        const myMember = team.members.find(m => m.userId === user.id || m.id === user.id);
                        const myRole = myMember?.role || 'worker';
                        
                        return (
                            <div key={team.id} className="team-card animate-in" style={{
                                padding: '2rem',
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                borderRadius: '28px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-lg)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden'
                            }} onClick={() => navigate(`/coop/${team.id}`)}>
                                
                                {/* Glow Effect */}
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '-20px', 
                                    right: '-20px', 
                                    width: '100px', 
                                    height: '100px', 
                                    background: 'var(--primary)', 
                                    filter: 'blur(60px)', 
                                    opacity: '0.1',
                                    pointerEvents: 'none'
                                }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                                    {team.logo ? (
                                        <img src={team.logo} alt={team.name} style={{ width: '64px', height: '64px', borderRadius: '20px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                                            {team.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: '800', 
                                            textTransform: 'uppercase', 
                                            padding: '4px 10px', 
                                            borderRadius: '8px',
                                            background: myRole === 'owner' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                                            color: myRole === 'owner' ? 'var(--primary)' : 'var(--text-secondary)',
                                            border: myRole === 'owner' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {myRole === 'owner' ? 'Fundador' : myRole.charAt(0).toUpperCase() + myRole.slice(1)}
                                        </span>
                                        {team.status === 'Borrador' && (
                                            <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span>
                                                BORRADOR
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 style={{ marginBottom: '0.8rem', fontSize: '1.6rem', fontWeight: '800' }}>{team.name}</h3>
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.8rem', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {team.description}
                                </p>

                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                                    {(team.categories || []).map((cat, i) => (
                                        <span key={i} style={{ 
                                            fontSize: '0.75rem', 
                                            padding: '0.4rem 1rem', 
                                            borderRadius: '12px', 
                                            background: 'rgba(255,255,255,0.03)', 
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {cat}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
                                            {(team.members || []).slice(0, 3).map((m, idx) => (
                                                <div key={idx} style={{ 
                                                    width: '28px', 
                                                    height: '28px', 
                                                    borderRadius: '50%', 
                                                    border: '2px solid var(--bg-card)', 
                                                    background: 'var(--bg-muted)',
                                                    marginLeft: idx === 0 ? 0 : '-10px',
                                                    overflow: 'hidden'
                                                }}>
                                                    {/* Fallback avatar */}
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                                                        {m.username?.charAt(0) || 'U'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                            {team.members?.length || 0} Miembros
                                        </span>
                                    </div>
                                    <div style={{
                                        color: 'var(--primary)',
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        Panel Coop
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Quick Add Card */}
                    {userTeams.length > 0 && userTeams.length < 2 && (
                        <div className="team-card-add glass" style={{
                            padding: '2rem',
                            cursor: 'pointer',
                            borderRadius: '28px',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            minHeight: '300px'
                        }} onClick={() => navigate('/create-coop')}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </div>
                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nueva Agencia</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyCoops;
