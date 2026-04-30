import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useTeams } from '../../../context/TeamContext';
import ServiceCard from '../../services/components/ServiceCard';
import '../../../styles/main.scss';

const TeamPublicProfile = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { respondToInvite } = useTeams();
    
    const [team, setTeam] = useState(null);
    const [services, setServices] = useState([]);
    const [reviews, setReviews] = useState([]); // Future implementation
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                // Fetch team with members
                const { data: teamData, error: teamError } = await supabase
                    .from('coops')
                    .select('*, members:coop_members(*)')
                    .eq('id', teamId)
                    .single();

                if (teamError) throw teamError;

                // Fetch member profiles
                const memberIds = (teamData.members || []).map(m => m.user_id);
                if (memberIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, username, avatar_url, first_name, last_name, level, rating')
                        .in('id', memberIds);
                    
                    if (profiles) {
                        teamData.members = teamData.members.map(m => ({
                            ...m,
                            profile: profiles.find(p => p.id === m.user_id) || null
                        }));
                    }
                }

                setTeam(teamData);

                // Fetch team services (matching teamId in config)
                const { data: servicesData } = await supabase
                    .from('services')
                    .select('*, profiles:freelancer_id(*)')
                    .eq('config->>teamId', teamId);
                
                setServices(servicesData || []);

            } catch (err) {
                console.error("Error fetching team profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (teamId) fetchTeamData();
    }, [teamId]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loading-spinner"></div></div>;
    if (!team) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}><h2>Equipo no encontrado.</h2><button className="btn-secondary" onClick={() => navigate(-1)}>Volver</button></div>;

    const isPendingMember = (team.members || []).some(m => m.user_id === user?.id && m.status === 'pending');
    const activeMembers = (team.members || []).filter(m => m.status === 'active' || m.role === 'owner');
    
    // Fallback to team.stats.avgRating if available, otherwise 0
    const rating = team.stats?.avgRating || 0;

    const handleInviteResponse = async (accept) => {
        try {
            await respondToInvite(team.id, accept);
            if (!accept) navigate(-1);
            else window.location.reload(); // Quick refresh to load dashboard
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '2rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Volver
            </button>

            {/* TEAM HEADER & BASIC INFO */}
            <div className="glass" style={{ padding: '3rem', borderRadius: '24px', marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                        width: '120px', height: '120px', borderRadius: '50%', 
                        background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '3.5rem', fontWeight: 'bold', color: 'white',
                        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
                        overflow: 'hidden'
                    }}>
                        {team.avatar ? <img src={team.avatar} alt={team.name || 'Coop'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (team.name?.charAt(0)?.toUpperCase() || 'C')}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{team.name || 'Agencia sin nombre'}</h1>
                        <div style={{ 
                            background: rating > 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                            color: rating > 0 ? '#fbbf24' : '#10b981', 
                            padding: '0.4rem 1rem', 
                            borderRadius: '12px', 
                            fontSize: '1.2rem', 
                            fontWeight: '800',
                            border: `1px solid ${rating > 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}>
                            {rating > 0 ? (
                                <>★ {rating.toFixed(1)}</>
                            ) : (
                                "NUEVO"
                            )}
                        </div>
                    </div>

                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '600px', margin: '1.5rem auto' }}>
                        {team.description || "Esta agencia aún no ha agregado una descripción."}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', justifyContent: 'center' }}>
                        {(team.categories || []).map((cat, i) => (
                            <span key={i} style={{ 
                                background: 'rgba(139, 92, 246, 0.1)', 
                                color: '#a78bfa', 
                                padding: '0.5rem 1.2rem', 
                                borderRadius: '14px', 
                                fontSize: '0.9rem', 
                                fontWeight: '600',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>

                {isPendingMember && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--primary)', marginTop: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem' }}>Tienes una invitación pendiente para unirte a esta agencia.</span>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <button onClick={() => handleInviteResponse(false)} className="btn-secondary" style={{ padding: '0.6rem 1.2rem' }}>Rechazar</button>
                            <button onClick={() => handleInviteResponse(true)} className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>Aceptar Invitación</button>
                        </div>
                    </div>
                )}
            </div>

            {/* MEMBERS SECTION */}
            <div className="glass" style={{ padding: '2.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem' }}>Equipo ({activeMembers.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {activeMembers.map(member => (
                        <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <Link to={`/freelancer/${member.user_id}`} style={{ display: 'block' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', overflow: 'hidden' }}>
                                    {member.profile?.avatar_url ? <img src={member.profile.avatar_url} alt={member.profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (member.profile?.username?.charAt(0).toUpperCase() || 'U')}
                                </div>
                            </Link>
                            <div style={{ flex: 1 }}>
                                <Link to={`/freelancer/${member.user_id}`} style={{ textDecoration: 'none' }}>
                                    <h4 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                        {member.profile?.first_name ? `${member.profile.first_name} ${member.profile.last_name || ''}` : member.profile?.username}
                                    </h4>
                                </Link>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>@{member.profile?.username}</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>• Nivel {member.profile?.level || 1}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SERVICES SECTION */}
            <div className="glass" style={{ padding: '2.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem' }}>Servicios de la Agencia</h3>
                {services.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {services.map(service => (
                            <ServiceCard key={service.id} service={{...service, level: 1}} />
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>Esta agencia no tiene servicios publicados aún.</p>
                    </div>
                )}
            </div>

            {/* REVIEWS SECTION */}
            <div className="glass" style={{ padding: '2.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Reseñas Recibidas</h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24' }}>★ {rating > 0 ? rating.toFixed(1) : '0.0'}</div>
                </div>
                
                {reviews.length > 0 ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {/* Map reviews here when available */}
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>La agencia aún no tiene reseñas de clientes.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default TeamPublicProfile;
