import React, { useState, useEffect } from 'react';
import { formatRelativeDate } from '../utils/dateUtils';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
import ReportModal from '../components/common/ReportModal';
import { useActionModal } from '../context/ActionModalContext';
import {
    CreditCard as Coin,
    Zap as Flame,
    Rocket,
    Heart,
    Star,
    Handshake,
    Eye,
    Users,
    MapPin,
    MoreVertical
} from 'lucide-react';
import '../styles/pages/ServiceDetail.scss';

const BadgesSection = ({ client, isOwnProfile, navigate }) => {
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

    const unlockedIds = client.gamification?.badges || client.badges || [];

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

    const badgeTiers = [
        { name: 'bronze', color: '#cd7f32' },
        { name: 'silver', color: '#c0c0c0' },
        { name: 'gold', color: '#ffd700' },
        { name: 'platinum', color: '#e5e4e2' },
        { name: 'diamond', color: '#b9f2ff' }
    ];

    const familyStatus = CLIENT_BADGE_FAMILIES.map(f => {
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
        <div className="dashboard-badges-section" style={{ marginTop: '2.5rem' }}>
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="section-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                    {isOwnProfile ? 'Mis Insignias' : 'Insignias del Cliente'}
                </h3>
                {isOwnProfile && (
                    <button 
                        className="btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #3b82f6', color: '#3b82f6', fontWeight: '700', cursor: 'pointer' }}
                        onClick={() => navigate('/badges')}
                    >
                        Ver mis insignias
                    </button>
                )}
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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showActionModal } = useActionModal();
    const { user: currentUser } = useAuth();
    const isOwnProfile = currentUser?.id === id;
    const [client, setClient] = useState(null);
    const [clientProjects, setClientProjects] = useState([]);
    const [clientJobs, setClientJobs] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [activeReviewTab, setActiveReviewTab] = useState('received');
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const averageRating = reviewsReceived.length > 0 
        ? (reviewsReceived.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewsReceived.length).toFixed(1)
        : null;

    useEffect(() => {
        const fetchClientData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Client Profile
                const { data: profile, error: pError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (pError) throw pError;
                setClient(profile);

                // 2. Fetch Active Projects with Client profile data
                const { data: projectsData, error: prError } = await supabase
                    .from('projects')
                    .select('*, client:profiles!client_id(username, first_name, last_name, avatar_url, level, rating, reviews_count)')
                    .eq('client_id', id)
                    .eq('status', 'open');
                
                if (prError) throw prError;

                // Map projects to ensure all nested client data is correctly formatted for ProjectCard
                const mappedProjects = (projectsData || []).map(p => ({
                    ...p,
                    clientUsername: p.client?.username,
                    clientAvatar: p.client?.avatar_url,
                    clientName: p.client?.first_name ? `${p.client.first_name} ${p.client.last_name || ''}`.trim() : p.client?.username,
                    clientRating: p.client?.rating || 0,
                    clientReviews: p.client?.reviews_count || 0,
                    clientLevel: p.client?.level || 1
                }));
                setClientProjects(mappedProjects);

                // 3. Fetch Completed Jobs (as Buyer)
                const { data: jobsData, error: jError } = await supabase
                    .from('jobs')
                    .select('*, provider:profiles!provider_id(username, first_name, last_name, avatar_url)')
                    .eq('client_id', id)
                    .in('status', ['completed', 'canceled']);
                
                if (jError) throw jError;
                
                // Map jobs to include serviceTitle and freelancerName
                const mappedJobs = (jobsData || []).map(j => ({
                    ...j,
                    serviceTitle: j.service_title || 'Servicio Personalizado',
                    freelancerName: j.provider?.first_name ? `${j.provider.first_name} ${j.provider.last_name || ''}`.trim() : j.provider?.username
                }));
                setClientJobs(mappedJobs);
                console.log("Client jobs loaded:", mappedJobs.length);

                // 4. Fetch Reviews Received (as target)
                const { data: recData, error: recError } = await supabase
                    .from('service_reviews')
                    .select(`
                        *, 
                        reviewer:reviewer_id(username, first_name, last_name, avatar_url, role),
                        job:job_id(service_title, service_id, project_id)
                    `)
                    .eq('target_id', id)
                    .order('created_at', { ascending: false });
                
                if (recError) {
                    console.error("[ClientDetail] Error fetching reviews received:", recError);
                } else {
                    setReviewsReceived(recData || []);
                }

                // 5. Fetch Reviews Given (as reviewer)
                const { data: givData, error: givError } = await supabase
                    .from('service_reviews')
                    .select(`
                        *, 
                        target:target_id(username, first_name, last_name, avatar_url, role),
                        job:job_id(service_title, service_id, project_id)
                    `)
                    .eq('reviewer_id', id)
                    .order('created_at', { ascending: false });
                
                if (givError) {
                    console.error("[ClientDetail] Error fetching reviews given:", givError);
                } else {
                    setReviewsGiven(givData || []);
                }

            } catch (err) {
                console.error("Error loading client data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchClientData();
    }, [id]);

    if (loading) return <div className="container" style={{ paddingTop: '6rem' }}>Cargando...</div>;
    if (!client) return <div className="container" style={{ paddingTop: '6rem' }}>Cliente no encontrado.</div>;

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Volver
            </button>

            {/* Hero Section - Premium Redesign */}
            <div className="glass client-hero-premium" style={{
                borderRadius: '32px',
                padding: '3.5rem',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                    background: 'var(--gradient-secondary, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%))',
                    opacity: 0.8
                }}></div>

                {!isOwnProfile && (
                    <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10 }}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid var(--border)', 
                                color: 'var(--text-primary)', 
                                padding: '8px', 
                                borderRadius: '12px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <MoreVertical size={20} />
                        </button>
                        {isMenuOpen && (
                            <>
                                <div 
                                    onClick={() => setIsMenuOpen(false)}
                                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}
                                />
                                <div className="glass" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '0.5rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '16px',
                                    padding: '0.5rem',
                                    minWidth: '160px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                }}>
                                    <button 
                                        onClick={async () => {
                                            setIsMenuOpen(false);
                                            if (!currentUser) return;
                                            try {
                                                const { blockUser } = await import('../services/safetyService');
                                                await blockUser(currentUser.id, id);
                                                showActionModal({
                                                    title: 'Usuario Bloqueado',
                                                    message: "Has bloqueado a este usuario. Ya no podrá contactarte ni ver tu contenido.",
                                                    severity: 'success'
                                                });
                                                setTimeout(() => navigate('/dashboard'), 1500);
                                            } catch (err) {
                                                console.error("Error al bloquear:", err);
                                                showActionModal({
                                                    title: 'Error',
                                                    message: "No se pudo completar el bloqueo. Inténtalo de nuevo.",
                                                    severity: 'error'
                                                });
                                            }
                                        }}
                                        style={{ 
                                            padding: '0.75rem 1rem', background: 'none', border: 'none', 
                                            color: '#ef4444', textAlign: 'left', borderRadius: '10px',
                                            cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                        Bloquear
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsReportModalOpen(true);
                                        }}
                                        style={{ 
                                            padding: '0.75rem 1rem', background: 'none', border: 'none', 
                                            color: 'var(--text-primary)', textAlign: 'left', borderRadius: '10px',
                                            cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                        Reportar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div className="profile-avatar-wrapper" style={{
                        width: '180px', height: '180px',
                        padding: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                            background: 'var(--bg-card)'
                        }}>
                            <img
                                src={getProfilePicture(client)}
                                alt={client.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <div style={{
                            position: 'absolute', bottom: '10px', right: '10px',
                            background: '#3b82f6', color: 'white',
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '3px solid var(--bg-card)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                                <h1 style={{ 
                                    margin: 0, 
                                    fontSize: '3rem', 
                                    fontWeight: 900, 
                                    letterSpacing: '-0.03em', 
                                    color: 'var(--text-primary)'
                                }}>
                                    {client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : (client.company_name || 'Particular')}
                                </h1>
                                <span className="client-badge-premium" style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Cliente Verificado</span>
                                {averageRating && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(251, 191, 36, 0.1)',
                                        color: '#fbbf24',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontSize: '0.9rem',
                                        fontWeight: '800',
                                        border: '1px solid rgba(251, 191, 36, 0.2)'
                                    }}>
                                        <Star size={16} fill="#fbbf24" />
                                        {averageRating}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '1.2rem', 
                                    color: '#3b82f6', 
                                    fontWeight: 700,
                                    opacity: 0.8 
                                }}>
                                    @{client.username}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    <MapPin size={14} />
                                    <span>{[client.city, client.province, client.country].filter(Boolean).join(', ') || 'Planeta Tierra'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                    <span>{client.role === 'company' ? 'Empresa' : 'Particular'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                        </div>

                        <div className="bio-container-premium" style={{
                            background: 'rgba(255,255,255,0.02)',
                            padding: '1.25rem',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            lineHeight: 1.5,
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            position: 'relative'
                        }}>
                             <svg style={{ position: 'absolute', top: '15px', right: '20px', opacity: 0.1 }} width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14C19.017 11.2386 16.7784 9 14.017 9V7C17.883 7 21.017 10.134 21.017 14V21H14.017ZM3.01701 21L3.01701 18C3.01701 16.8954 3.91244 16 5.01701 16H8.01701V14C8.01701 11.2386 5.77844 9 3.01701 9V7C6.88301 7 10.017 10.134 10.017 14V21H3.01701Z"/></svg>
                            {client.bio || "Este cliente busca excelencia y profesionalismo en cada proyecto. Comprometido con el crecimiento mutuo y la calidad."}
                        </div>
                    </div>
                </div>

                {/* Badges Section - Premium Grid */}
                <BadgesSection client={client} isOwnProfile={isOwnProfile} navigate={navigate} />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                        Proyectos Publicados
                    </h2>
                    <span style={{
                        background: 'var(--bg-card-hover)',
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        fontWeight: '600'
                    }}>{clientProjects.length} Activos</span>
                </div>

                {clientProjects.length > 0 ? (
                    <div className="services-grid-explore">
                        {clientProjects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={{
                                    ...project,
                                    clientName: client.company_name || client.first_name || client.username,
                                    clientAvatar: client.avatar_url,
                                    clientRating: client.rating,
                                    clientReviews: client.reviews_count,
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="glass" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '4rem',
                        borderRadius: '16px',
                        border: '1px dashed var(--border)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📁</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Este cliente no tiene proyectos activos en este momento.</p>
                    </div>
                )}
            </div>

            {/* Job History Section */}
            <div style={{ marginTop: '4rem' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Historial de Trabajos Contratados
                    </h2>
                    <span style={{
                        background: 'var(--bg-card-hover)',
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        color: 'var(--text-primary)',
                        fontWeight: '600',
                        marginTop: '0.5rem',
                        display: 'inline-block'
                    }}>{clientJobs.length} Finalizados</span>
                </div>

                {clientJobs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {clientJobs.map(job => (
                            <div key={job.id} className="glass" style={{
                                padding: '1rem',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                    <div 
                                        onClick={() => navigate(`/profile/${job.provider_id}`)}
                                        style={{
                                            width: '40px', height: '40px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            background: 'var(--bg-card-hover)',
                                            cursor: 'pointer',
                                            border: '1px solid var(--border)',
                                            flexShrink: 0
                                        }}
                                    >
                                        {job.provider?.avatar_url ? (
                                            <img src={job.provider.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                {job.provider?.username?.charAt(0)?.toUpperCase() || 'F'}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.serviceTitle}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                Freelancer: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{job.freelancerName}</span>
                                            </span>
                                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></span>
                                            <span onClick={() => navigate(`/profile/${job.provider_id}`)} style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}>@{job.provider?.username}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.6rem',
                                            fontWeight: '800',
                                            background: job.deliveryResult === 'Cancelado' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: job.deliveryResult === 'Cancelado' ? '#ef4444' : '#10b981',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '0.15rem'
                                        }}>
                                            {job.deliveryResult || 'Finalizado'}
                                        </span>
                                        {job.amount && (
                                            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                ${job.amount}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            if (job.service_id) navigate(`/service/${job.service_id}`);
                                            else if (job.project_id) navigate(`/project/${job.project_id}`);
                                        }}
                                        className="btn-primary"
                                        style={{ 
                                            padding: '7px 14px', 
                                            borderRadius: '10px', 
                                            fontSize: '0.8rem', 
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        Ver Detalle
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                        Aún no hay trabajos finalizados en el historial.
                    </div>
                )}
            </div>

            {/* Reviews Section - Tabs-like structure */}
            <div style={{ marginTop: '4rem' }}>
                <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--border)', marginBottom: '2.5rem' }}>
                    <h2 
                        onClick={() => setActiveReviewTab('received')}
                        style={{ 
                            fontSize: '1.4rem', cursor: 'pointer', paddingBottom: '1rem', 
                            borderBottom: activeReviewTab === 'received' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: activeReviewTab === 'received' ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                            margin: 0
                        }}
                    >
                        Reseñas Recibidas ({reviewsReceived.length})
                    </h2>
                    <h2 
                        onClick={() => setActiveReviewTab('given')}
                        style={{ 
                            fontSize: '1.4rem', cursor: 'pointer', paddingBottom: '1rem', 
                            borderBottom: activeReviewTab === 'given' ? '3px solid var(--primary)' : '3px solid transparent',
                            color: activeReviewTab === 'given' ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                            margin: 0
                        }}
                    >
                        Reseñas Dadas ({reviewsGiven.length})
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {activeReviewTab === 'received' ? (
                        reviewsReceived.length > 0 ? (
                            reviewsReceived.map(review => (
                                <div key={review.id} className="glass" style={{
                                    borderRadius: '20px',
                                    padding: '2rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div 
                                                onClick={() => navigate(`/profile/${review.reviewer_id}`)}
                                                style={{
                                                    width: '52px',
                                                    height: '52px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    background: 'var(--bg-card-hover)',
                                                    cursor: 'pointer',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                {review.reviewer?.avatar_url ? (
                                                    <img src={review.reviewer.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>
                                                        {review.reviewer?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 
                                                    onClick={() => navigate(`/profile/${review.reviewer_id}`)}
                                                    style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer' }}
                                                >
                                                    {review.reviewer?.first_name ? `${review.reviewer.first_name} ${review.reviewer.last_name || ''}` : (review.reviewer?.username || 'Usuario')}
                                                </h4>
                                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>@{review.reviewer?.username}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '2px', marginBottom: '0.25rem' }}>
                                                {[...Array(5)].map((_, i) => {
                                                    const starRating = review.rating;
                                                    const isFull = i + 1 <= starRating;
                                                    const isHalf = i < starRating && i + 1 > starRating;
                                                    
                                                    return (
                                                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <defs>
                                                                <linearGradient id={`starGrad-${review.id}-${i}`}>
                                                                    <stop offset="50%" stopColor="#fbbf24" />
                                                                    <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                                                                </linearGradient>
                                                            </defs>
                                                            <polygon 
                                                                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                                                fill={isFull ? '#fbbf24' : (isHalf ? `url(#starGrad-${review.id}-${i})` : 'rgba(255,255,255,0.1)')}
                                                            />
                                                        </svg>
                                                    );
                                                })}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatRelativeDate(review.created_at)}</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #3b82f6' }}>
                                        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>"{review.comment}"</p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Por el trabajo:</span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>{review.project_title_snapshot || review.service_title_snapshot || review.job?.service_title || 'Trabajo Finalizado'}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (review.job?.service_id) navigate(`/service/${review.job.service_id}`);
                                                else if (review.job?.project_id) navigate(`/project/${review.job.project_id}`);
                                            }}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Ver Detalle
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="glass" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Aún no hay reseñas recibidas.</p>
                            </div>
                        )
                    ) : (
                        reviewsGiven.length > 0 ? (
                            reviewsGiven.map(review => (
                                <div key={review.id} className="glass" style={{
                                    borderRadius: '20px',
                                    padding: '2rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div 
                                                onClick={() => navigate(review.target?.role === 'client' ? `/client/${review.target_id}` : review.target?.role === 'company' ? `/company/${review.target_id}` : `/profile/${review.target_id}`)}
                                                style={{
                                                    width: '52px',
                                                    height: '52px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    background: 'var(--bg-card-hover)',
                                                    cursor: 'pointer',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                {review.target?.avatar_url ? (
                                                    <img src={review.target.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>
                                                        {review.target?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 
                                                    onClick={() => navigate(review.target?.role === 'client' ? `/client/${review.target_id}` : review.target?.role === 'company' ? `/company/${review.target_id}` : `/profile/${review.target_id}`)}
                                                    style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer' }}
                                                >
                                                    {review.target?.first_name ? `${review.target.first_name} ${review.target.last_name || ''}` : (review.target?.username || 'Usuario')}
                                                </h4>
                                                <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>@{review.target?.username}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '2px', marginBottom: '0.25rem' }}>
                                                {[...Array(5)].map((_, i) => {
                                                    const starRating = review.rating;
                                                    const isFull = i + 1 <= starRating;
                                                    const isHalf = i < starRating && i + 1 > starRating;
                                                    
                                                    return (
                                                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <defs>
                                                                <linearGradient id={`starGrad-${review.id}-${i}`}>
                                                                    <stop offset="50%" stopColor="#fbbf24" />
                                                                    <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                                                                </linearGradient>
                                                            </defs>
                                                            <polygon 
                                                                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                                                fill={isFull ? '#fbbf24' : (isHalf ? `url(#starGrad-${review.id}-${i})` : 'rgba(255,255,255,0.1)')}
                                                            />
                                                        </svg>
                                                    );
                                                })}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatRelativeDate(review.created_at)}</span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #3b82f6' }}>
                                        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>"{review.comment}"</p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Por el trabajo:</span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>{review.project_title_snapshot || review.service_title_snapshot || review.job?.service_title || 'Trabajo Finalizado'}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (review.job?.service_id) navigate(`/service/${review.job.service_id}`);
                                                else if (review.job?.project_id) navigate(`/project/${review.job.project_id}`);
                                            }}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Ver Detalle
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="glass" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>✍️</div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Aún no has dado reseñas.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
            <ReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportedId={id}
                referenceType="profile"
                itemName={client?.first_name ? `${client.first_name} ${client.last_name || ''}` : client?.username}
            />
        </div>
    );
};

export default ClientDetail;
