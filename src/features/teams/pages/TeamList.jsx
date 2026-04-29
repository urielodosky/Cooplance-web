import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import '../../../styles/main.scss';

const TeamList = () => {
    const { userTeams, loading } = useTeams();
    const { user } = useAuth();
    const navigate = useNavigate();

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '1000px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Mis Coops Activos
                        <div className="help-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div className="help-icon" style={{ width: '20px', height: '20px', fontSize: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'help' }}>?</div>
                            <div className="help-tooltip" style={{ width: '280px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'normal', textAlign: 'left', bottom: '100%', marginBottom: '10px', fontSize: '0.85rem', lineHeight: '1.4', fontWeight: 'normal' }}>
                                {user.role === 'freelancer'
                                    ? <>Las <strong>Coops</strong> son equipos colaborativos donde puedes unirte con otros freelancers para ofrecer servicios conjuntos y abordar proyectos más grandes.</>
                                    : <>Las <strong>Coops</strong> te permiten agrupar a tus mejores freelancers en equipos dedicados, facilitando la gestión de proyectos complejos y asegurando resultados de calidad.</>
                                }
                            </div>
                        </div>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {user.role === 'freelancer'
                            ? 'Gestiona tus equipos de trabajo y colaboraciones.'
                            : 'Organiza y gestiona tus equipos de talento externos.'}
                    </p>
                </div>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={() => navigate('/create-team')}>
                    <span style={{ fontSize: '1.4rem', lineHeight: '0.8', marginBottom: '2px' }}>+</span> Fundar Coop
                </button>
            </div>

            {/* List */}
            {userTeams.length === 0 ? (
                <div className="glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>No tienes Coops activas</h2>
                    <p style={{ maxWidth: '500px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                        {user.role === 'freelancer'
                            ? 'Únete a otros freelancers para potenciar tus servicios y acceder a proyectos más grandes.'
                            : 'Arma tu equipo ideal. Reúne a tus freelancers favoritos y potencia tus proyectos con un flujo de trabajo centralizado.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {userTeams.map(team => {
                        const myRole = team.members.find(m => m.user_id === user.id || m.userId === user.id)?.role || 'member';
                        const categoryLabel = team.categories && team.categories.length > 0
                            ? team.categories.map(c => c.name).join(', ')
                            : 'General';

                        return (
                            <div key={team.id} className="team-card" style={{
                                padding: '1.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderRadius: '24px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-md)'
                            }} onClick={() => navigate(`/team/${team.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                                    {team.logo ? (
                                        <img src={team.logo} alt={team.name} style={{ width: '56px', height: '56px', borderRadius: '18px', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)' }} />
                                    ) : (
                                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
                                            {team.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <span className={`status-badge ${myRole === 'owner' ? 'active' : ''}`} style={{ height: 'fit-content', borderRadius: '20px', padding: '4px 12px' }}>
                                        {myRole === 'owner' ? 'Fundador' : 'Miembro'}
                                    </span>
                                </div>

                                <h3 style={{ marginBottom: '0.6rem', fontSize: '1.4rem' }}>{team.name}</h3>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {team.description}
                                </p>

                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                    {team.categories?.map((c, i) => (
                                        <span key={i} style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '20px', background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                                            {c.name}
                                        </span>
                                    ))}
                                </div>

                                {team.services && team.services.filter(s => s.active).length > 0 ? (
                                    <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>Servicios publicados:</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {team.services.filter(s => s.active).slice(0, 2).map((srv, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.title}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Desde ${srv.price}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {team.services.filter(s => s.active).length > 2 && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.2rem' }}>+ {team.services.filter(s => s.active).length - 2} servicio(s) más...</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No tiene servicios activos en este momento.</p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.2rem', marginTop: 'auto' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        background: 'var(--bg-muted)',
                                        padding: '6px 14px',
                                        borderRadius: '20px'
                                    }}>
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{team.members.length}</span> miembros
                                    </div>
                                    <span style={{
                                        color: 'var(--primary)',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s'
                                    }}>
                                        Entrar →
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TeamList;
