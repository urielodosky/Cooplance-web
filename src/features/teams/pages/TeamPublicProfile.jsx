import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useTeams } from '../../../context/TeamContext';
import ServiceCard from '../../services/components/ServiceCard';
import { MapPin, Star, Users, Briefcase, MessageSquare, ChevronLeft, MoreVertical } from 'lucide-react';
import '../../../styles/main.scss';

const TeamPublicProfile = () => {
    const { coopId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { respondToInvite, applyToTeam } = useTeams();
    
    const [team, setTeam] = useState(null);
    const [services, setServices] = useState([]);
    const [reviews, setReviews] = useState([]); // Future implementation
    const [loading, setLoading] = useState(true);

    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [isApplyingNow, setIsApplyingNow] = useState(false);
    const [applyError, setApplyError] = useState('');

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                // Fetch team with members
                const { data: teamData, error: teamError } = await supabase
                    .from('coops')
                    .select('*, members:coop_members(*)')
                    .eq('id', coopId)
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

                // Fetch team services - using filter for JSONB query to avoid 400 error
                const { data: servicesData, error: servicesError } = await supabase
                    .from('services')
                    .select('*, owner:profiles!owner_id(*)')
                    .filter('config->>teamId', 'eq', coopId);
                
                if (servicesError) console.error("Error fetching services:", servicesError);
                
                // Map services for ServiceCard
                const mappedServices = (servicesData || []).map(s => ({
                    ...s,
                    freelancerId: s.owner_id,
                    freelancerUsername: s.owner?.username,
                    freelancerAvatar: s.owner?.avatar_url,
                    freelancerName: s.owner?.first_name ? `${s.owner.first_name} ${s.owner.last_name || ''}`.trim() : s.owner?.username,
                    level: s.owner?.level || 1,
                    image: s.image_url,
                    specialties: s.config?.specialties || s.specialties || []
                }));

                setServices(mappedServices);

            } catch (err) {
                console.error("Error fetching team profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (coopId) fetchTeamData();
    }, [coopId]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem' }}><div className="loading-spinner"></div></div>;
    if (!team) return <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}><h2 style={{ opacity: 0.5 }}>Coop no encontrada.</h2><button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>Volver</button></div>;

    const isMember = (team.members || []).some(m => m.user_id === user?.id && m.status === 'active');
    const isPendingMember = (team.members || []).some(m => m.user_id === user?.id && m.status === 'pending_invitation');
    const isApplying = (team.members || []).some(m => m.user_id === user?.id && m.status === 'pending_application');
    const isRejected = (team.members || []).some(m => m.user_id === user?.id && m.status === 'rejected');
    const activeMembers = (team.members || []).filter(m => m.status === 'active' || m.role === 'owner');
    const rating = team.stats?.avgRating || 0;

    const handleSendApplication = async () => {
        if (!coverLetter.trim()) {
            setApplyError('Por favor, escribe una carta de presentación.');
            return;
        }
        setIsApplyingNow(true);
        setApplyError('');
        try {
            await applyToTeam(team.id, coverLetter);
            setIsApplyModalOpen(false);
            setCoverLetter('');
            // Optional: Show success toast
        } catch (e) {
            setApplyError(e.message);
        } finally {
            setIsApplyingNow(false);
        }
    };

    const handleInviteResponse = async (accept) => {
        try {
            await respondToInvite(team.id, accept);
            if (!accept) navigate(-1);
            else window.location.reload();
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ChevronLeft size={18} />
                Volver
            </button>

            {/* Hero Section - Premium Style matching Freelancer/Client profiles */}
            <div className="glass profile-hero-premium" style={{
                borderRadius: '32px',
                padding: '3.5rem',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)'
            }}>
                {/* Accent bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    opacity: 0.8
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    {/* Avatar Column */}
                    <div className="profile-avatar-wrapper" style={{
                        width: '180px', height: '180px',
                        padding: '8px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        borderRadius: '50%',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        flexShrink: 0
                    }}>
                        <div style={{
                            width: '100%', height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid var(--bg-card)',
                            background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {team.avatar_url ? (
                                <img src={team.avatar_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ fontSize: '4rem', fontWeight: 900, color: '#fbbf24' }}>{team.name?.charAt(0).toUpperCase()}</div>
                            )}
                        </div>
                    </div>

                    {/* Details Column */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                                <h1 style={{ 
                                    margin: 0, fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)'
                                }}>
                                    {team.name}
                                </h1>
                                <span style={{
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    color: '#fbbf24',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(251, 191, 36, 0.2)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Coop</span>
                                
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24',
                                    padding: '6px 14px', borderRadius: '12px',
                                    fontSize: '0.9rem', fontWeight: '800',
                                    border: '1px solid rgba(251, 191, 36, 0.2)'
                                }}>
                                    <Star size={16} fill="#fbbf24" />
                                    {rating > 0 ? rating.toFixed(1) : "NUEVO"}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700, opacity: 0.8 }}>
                                    Coop de Cooplance
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    <MapPin size={14} />
                                    <span>Global / Remoto</span>
                                </div>
                            </div>
                        </div>

                        {/* Bio Container */}
                        <div className="bio-container-premium" style={{
                            background: 'var(--bg-card)',
                            padding: '1.5rem',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            lineHeight: 1.6,
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            position: 'relative',
                            wordBreak: 'break-word'
                        }}>
                            <svg style={{ position: 'absolute', top: '15px', right: '20px', opacity: 0.1 }} width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14C19.017 11.2386 16.7784 9 14.017 9V7C17.883 7 21.017 10.134 21.017 14V21H14.017ZM3.01701 21L3.01701 18C3.01701 16.8954 3.91244 16 5.01701 16H8.01701V14C8.01701 11.2386 5.77844 9 3.01701 9V7C6.88301 7 10.017 10.134 10.017 14V21H3.01701Z"/></svg>
                            {team.description || "Esta Coop es un espacio de colaboración donde freelancers combinan su talento para ofrecer servicios excepcionales de alta calidad."}
                        </div>

                        {/* Categories Chips */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                            {(team.categories || []).map((cat, idx) => (
                                <span key={idx} style={{
                                    padding: '0.5rem 1.2rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '14px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)',
                                    fontWeight: '600'
                                }}>{cat}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Application Section */}
                {!isMember && !isPendingMember && user?.role === 'freelancer' && (
                    <div style={{ 
                        marginTop: '3rem', padding: '2.5rem', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>¿Quieres unirte a {team.name}?</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                {isApplying 
                                    ? "Tu solicitud está siendo revisada por los administradores de la Coop." 
                                    : isRejected 
                                    ? "Tu solicitud previa fue rechazada. Puedes intentar postularte nuevamente en el futuro." 
                                    : "Buscamos talento para expandir nuestra oferta de servicios. ¡Postúlate y empieza a colaborar!"}
                            </p>
                        </div>
                        <button 
                            onClick={() => !isApplying && setIsApplyModalOpen(true)} 
                            className={isApplying ? "btn-secondary" : "btn-primary"} 
                            style={{ 
                                padding: '1rem 2.5rem', 
                                borderRadius: '16px', 
                                fontSize: '1rem', 
                                fontWeight: 800,
                                opacity: isApplying ? 0.7 : 1,
                                cursor: isApplying ? 'default' : 'pointer'
                            }}
                            disabled={isApplying}
                        >
                            {isApplying ? "Solicitud Pendiente" : "Postularse Ahora"}
                        </button>
                    </div>
                )}
            </div>

            {/* Application Modal */}
            {isApplyModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(8px)' }} onClick={() => setIsApplyModalOpen(false)}>
                    <div className="glass animate-in" style={{ width: '90%', maxWidth: '600px', padding: '2.5rem', borderRadius: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-glow)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤝</div>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Postulación a {team.name}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Cuéntales por qué eres la pieza que falta en su equipo.</p>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>Carta de Presentación</label>
                            <textarea 
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                placeholder="Me interesa unirme porque tengo experiencia en... y puedo aportar..."
                                style={{ 
                                    width: '100%', height: '200px', padding: '1.2rem', 
                                    borderRadius: '20px', background: 'rgba(0,0,0,0.2)', 
                                    border: '1px solid var(--border)', color: 'white', 
                                    fontSize: '1rem', resize: 'none', outline: 'none',
                                    lineHeight: 1.5
                                }}
                            />
                            {applyError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.8rem', textAlign: 'center' }}>{applyError}</p>}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsApplyModalOpen(false)} className="btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '16px' }}>Cancelar</button>
                            <button 
                                onClick={handleSendApplication} 
                                className="btn-primary" 
                                style={{ flex: 1, padding: '1rem', borderRadius: '16px' }}
                                disabled={isApplyingNow || !coverLetter.trim()}
                            >
                                {isApplyingNow ? 'Enviando...' : 'Enviar Postulación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEAM MEMBERS SECTION */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <Users size={28} color="var(--primary)" />
                        Equipo / Miembros
                    </h2>
                    <span style={{
                        background: 'var(--bg-card-hover)', padding: '0.4rem 1rem', borderRadius: '20px', color: 'var(--text-primary)', fontWeight: '600'
                    }}>{activeMembers.length} Activos</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {activeMembers.map(member => (
                        <div key={member.user_id} className="glass" style={{ 
                            display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.5rem', 
                            background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)',
                            transition: 'transform 0.2s'
                        }}>
                            <Link to={`/freelancer/${member.user_id}`} style={{ display: 'block', flexShrink: 0 }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '18px', 
                                    background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    color: 'white', fontWeight: 'bold', fontSize: '1.5rem', overflow: 'hidden',
                                    border: '2px solid rgba(255,255,255,0.1)'
                                }}>
                                    {member.profile?.avatar_url ? (
                                        <img src={member.profile.avatar_url} alt={member.profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (member.profile?.username?.charAt(0).toUpperCase() || 'U')}
                                </div>
                            </Link>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link to={`/freelancer/${member.user_id}`} style={{ textDecoration: 'none' }}>
                                    <h4 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 800 }}>
                                        {member.profile?.first_name ? `${member.profile.first_name} ${member.profile.last_name || ''}` : member.profile?.username}
                                    </h4>
                                </Link>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{member.profile?.username}</span>
                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>Nivel {member.profile?.level || 1}</span>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        background: member.role === 'owner' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                        color: member.role === 'owner' ? '#f59e0b' : 'var(--primary)',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        border: member.role === 'owner' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)'
                                    }}>
                                        {member.role === 'owner' ? 'Fundador' : member.role === 'admin' ? 'Admin' : member.role === 'manager' ? 'Gestor' : 'Miembro'}
                                    </span>
                                </div>
                                {member.profile?.rating > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.3rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800 }}>
                                        <Star size={12} fill="#fbbf24" />
                                        {member.profile.rating.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SERVICES SECTION */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <Briefcase size={28} color="var(--primary)" />
                        Servicios de la Coop
                    </h2>
                    <span style={{
                        background: 'var(--bg-card-hover)', padding: '0.4rem 1rem', borderRadius: '20px', color: 'var(--text-primary)', fontWeight: '600'
                    }}>{services.length} Publicados</span>
                </div>

                {services.length > 0 ? (
                    <div className="services-grid-explore">
                        {services.map(service => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                ) : (
                    <div className="glass" style={{ padding: '5rem', textAlign: 'center', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>💼</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Esta Coop no tiene servicios publicados aún.</p>
                    </div>
                )}
            </div>

            {/* REVIEWS SECTION */}
            <div style={{ marginBottom: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <MessageSquare size={28} color="var(--primary)" />
                        Reseñas Recibidas
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '800', fontSize: '1.2rem' }}>
                        <Star size={20} fill="#fbbf24" />
                        {rating > 0 ? rating.toFixed(1) : "0.0"}
                    </div>
                </div>
                
                <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>Aún no hay reseñas para esta Coop.</p>
                </div>
            </div>
        </div>
    );
};

export default TeamPublicProfile;
