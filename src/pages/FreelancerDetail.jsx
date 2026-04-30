import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../utils/dateUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { useTeams } from '../context/TeamContext';
import { getProfilePicture } from '../utils/avatarUtils';
import ServiceCard from '../features/services/components/ServiceCard';
import { supabase } from '../lib/supabase';
import ReportModal from '../components/common/ReportModal';
import { BADGE_FAMILIES } from '../data/badgeDefinitions';
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
    MoreVertical,
    MapPin
} from 'lucide-react';
import '../styles/pages/ServiceDetail.scss';

const BadgesSection = ({ freelancer, isOwnProfile, navigate }) => {
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

    const unlockedIds = freelancer.gamification?.badges || freelancer.badges || [];

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

    const familyStatus = BADGE_FAMILIES.map(f => {
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
                <h3 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                    {isOwnProfile ? 'Mis Insignias' : 'Insignias del Freelancer'}
                </h3>
                {isOwnProfile && (
                    <button 
                        className="btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}
                        onClick={() => navigate('/badges')}
                    >
                        Ver todas
                    </button>
                )}
            </div>
            <div className="badges-scroll-wrapper" style={{ 
                display: 'flex', 
                gap: '1.25rem', 
                overflowX: 'auto', 
                paddingBottom: '1.25rem',
                paddingRight: '1rem',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                margin: '0 -1rem',
                paddingLeft: '1rem'
            }}>
                {familyStatus.map((status, idx) => (
                    <div 
                        key={idx} 
                        className={`badge-family-card ${status.badge ? 'unlocked' : 'locked'} tier-${status.tier?.name || 'none'}`}
                        style={{
                            flex: '0 0 160px',
                            minWidth: '160px',
                            margin: 0,
                            '--tier-color': status.tier?.color || 'rgba(128, 128, 128, 0.2)'
                        }}
                    >
                        <div className="badge-icon-wrapper">
                            {status.icon}
                        </div>
                        <div className="badge-content">
                            <span className="family-label" style={{ fontSize: '0.65rem', opacity: 0.7 }}>{status.familyTitle}</span>
                            <h4 className="badge-name" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>{status.badge ? status.badge.title : 'No desbloqueado'}</h4>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .badges-scroll-wrapper::-webkit-scrollbar {
                    display: none;
                }
                @media (max-width: 768px) {
                    .profile-hero-premium {
                        padding: 2rem 1.5rem !important;
                    }
                    .profile-hero-content {
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        gap: 2rem !important;
                    }
                    .hero-details-column {
                        align-items: center !important;
                    }
                    .hero-meta-row {
                        justify-content: center !important;
                        flex-wrap: wrap !important;
                    }
                    .hero-action-buttons {
                        width: 100% !important;
                        flex-direction: column !important;
                    }
                    .hero-action-buttons .btn-primary,
                    .hero-action-buttons .btn-secondary {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }
            `}</style>
        </div>
    );
};

const FreelancerDetail = ({ isBlocked = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showActionModal } = useActionModal();
    const { user: currentUser } = useAuth();
    const { teams } = useTeams();
    const [freelancer, setFreelancer] = useState(null);
    const isOwnProfile = currentUser?.id === id;
    const [freelancerServices, setFreelancerServices] = useState([]);
    const [freelancerJobs, setFreelancerJobs] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [activeReviewTab, setActiveReviewTab] = useState('received');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasBlocked, setHasBlocked] = useState(false);
    
    const averageRating = reviewsReceived.length > 0 
        ? (reviewsReceived.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewsReceived.length).toFixed(1)
        : null;

    // Calculate teams where this freelancer is a member
    const memberTeams = teams.filter(team =>
        team.members && team.members.some(m => m.user_id === id)
    );

    useEffect(() => {
        const fetchFreelancerData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Profile
                const { data: profile, error: pError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (pError) throw pError;
                setFreelancer(profile);

                // 2. Fetch Services with Profile data
                const { data: servicesData, error: sError } = await supabase
                    .from('services')
                    .select('*, owner:profiles!owner_id(username, first_name, last_name, avatar_url, level)')
                    .eq('owner_id', id)
                    .eq('active', true);
                
                if (sError) throw sError;
                
                // Map services to match the structure expected by ServiceCard
                const mappedServices = (servicesData || []).map(s => ({
                    ...s,
                    freelancerId: s.owner_id,
                    freelancerUsername: s.owner?.username,
                    freelancerAvatar: s.owner?.avatar_url,
                    freelancerName: s.owner?.first_name ? `${s.owner.first_name} ${s.owner.last_name || ''}`.trim() : s.owner?.username,
                    level: s.owner?.level || 1,
                    image: s.image_url,
                    // Use specialties from config or root
                    specialties: s.config?.specialties || s.specialties || []
                }));
                setFreelancerServices(mappedServices);

                // 3. Fetch Jobs (for work history)
                const { data: jobsData, error: jError } = await supabase
                    .from('jobs')
                    .select('*, client:profiles!client_id(username, first_name, last_name, avatar_url)')
                    .eq('provider_id', id)
                    .in('status', ['completed', 'canceled'])
                    .limit(10);
                
                if (jError) throw jError;

                // Map jobs to include serviceTitle and clientName
                const mappedJobs = (jobsData || []).map(j => {
                    const wasCanceled = j.status === 'canceled' || (j.delivery_result && (
                        j.delivery_result.toLowerCase().includes('cancelado') || 
                        j.delivery_result.toLowerCase().includes('cancelación')
                    ));
                    return {
                        ...j,
                        serviceTitle: j.service_title || 'Servicio Personalizado',
                        clientName: j.client?.first_name ? `${j.client.first_name} ${j.client.last_name || ''}`.trim() : j.client?.username,
                        deliveryResult: wasCanceled ? 'Cancelado' : (j.delivery_result || 'Finalizado'),
                        _isCanceled: wasCanceled
                    };
                });
                setFreelancerJobs(mappedJobs);
                
                // 4. Check if we have blocked this user
                if (currentUser && currentUser.id !== id) {
                    const { data: blockData } = await supabase
                        .from('user_blocks')
                        .select('id')
                        .eq('blocker_id', currentUser.id)
                        .eq('blocked_id', id)
                        .single();
                    setHasBlocked(!!blockData);
                }

                // 4. Fetch Reviews Received (as target)
                const { data: recData, error: recError } = await supabase
                    .from('service_reviews')
                    .select(`
                        *, 
                        reviewer:reviewer_id(username, first_name, last_name, avatar_url, role),
                        job:job_id(service_title, service_id, project_id, status, delivery_result)
                    `)
                    .eq('target_id', id)
                    .order('created_at', { ascending: false });
                
                if (recError) {
                    console.error("[FreelancerDetail] Error fetching reviews received:", recError);
                } else {
                    setReviewsReceived(recData || []);
                }

                // 5. Fetch Reviews Given (as reviewer)
                const { data: givData, error: givError } = await supabase
                    .from('service_reviews')
                    .select(`
                        *, 
                        target:target_id(username, first_name, last_name, avatar_url, role),
                        job:job_id(service_title, service_id, project_id, status, delivery_result)
                    `)
                    .eq('reviewer_id', id)
                    .order('created_at', { ascending: false });
                
                if (givError) {
                    console.error("[FreelancerDetail] Error fetching reviews given:", givError);
                } else {
                    setReviewsGiven(givData || []);
                }

            } catch (err) {
                console.error("Error loading freelancer data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchFreelancerData();
    }, [id]);

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem' }}>
                <div className="skeleton-pulse" style={{ width: '100px', height: '40px', marginBottom: '1.5rem', borderRadius: '8px' }}></div>
                <div className="glass" style={{ borderRadius: '24px', padding: '3rem', marginBottom: '3rem', height: '300px' }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div className="skeleton-pulse" style={{ width: '140px', height: '140px', borderRadius: '50%' }}></div>
                        <div style={{ flex: 1 }}>
                            <div className="skeleton-pulse" style={{ height: '3rem', width: '60%', marginBottom: '1rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1.5rem', width: '40%', marginBottom: '1.5rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '4rem', width: '100%', borderRadius: '12px' }}></div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton-pulse" style={{ height: '200px', borderRadius: '16px' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!freelancer) {
        return <div className="container" style={{ paddingTop: '6rem', textAlign: 'center' }}>
            <h2 style={{ opacity: 0.5 }}>Freelancer no encontrado.</h2>
            <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: '1rem' }}>Ir al Inicio</button>
        </div>;
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Volver
            </button>

            {/* Hero Section - Premium Redesign */}
            <div className="glass profile-hero-premium" style={{
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
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    opacity: 0.8
                }}></div>

                <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 100 }}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        style={{ 
                            background: 'rgba(255,255,255,0.1)', 
                            border: '1px solid rgba(255,255,255,0.2)', 
                            color: 'white', 
                            padding: '10px', 
                            borderRadius: '14px', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <MoreVertical size={22} />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div 
                                onClick={() => setIsMenuOpen(false)}
                                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 90 }}
                            />
                            <div className="glass" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.75rem',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '20px',
                                padding: '0.6rem',
                                minWidth: '180px',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                zIndex: 101,
                                animation: 'slideDown 0.2s ease-out'
                            }}>
                                {isOwnProfile ? (
                                    <>
                                        <button 
                                            onClick={() => navigate('/settings')}
                                            style={{ 
                                                padding: '0.8rem 1rem', background: 'none', border: 'none', 
                                                color: 'var(--text-primary)', textAlign: 'left', borderRadius: '12px',
                                                cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                            Configuración
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={async () => {
                                                setIsMenuOpen(false);
                                                if (!currentUser) return;
                                                try {
                                                    const { blockUser, unblockUser } = await import('../services/safetyService');
                                                    if (hasBlocked) {
                                                        await unblockUser(currentUser.id, id);
                                                        setHasBlocked(false);
                                                        showActionModal({
                                                            title: 'Usuario Desbloqueado',
                                                            message: "Has desbloqueado a este usuario.",
                                                            severity: 'success'
                                                        });
                                                    } else {
                                                        await blockUser(currentUser.id, id);
                                                        setHasBlocked(true);
                                                        showActionModal({
                                                            title: 'Usuario Bloqueado',
                                                            message: "Has bloqueado a este usuario.",
                                                            severity: 'success'
                                                        });
                                                        setTimeout(() => navigate('/dashboard'), 1500);
                                                    }
                                                } catch (err) {
                                                    console.error("Error al gestionar bloqueo:", err);
                                                    showActionModal({
                                                        title: 'Error',
                                                        message: "No se pudo completar la acción.",
                                                        severity: 'error'
                                                    });
                                                }
                                            }}
                                            style={{ 
                                                padding: '0.8rem 1rem', background: 'none', border: 'none', 
                                                color: hasBlocked ? 'var(--primary)' : '#ef4444', textAlign: 'left', borderRadius: '12px',
                                                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = hasBlocked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                            {hasBlocked ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsReportModalOpen(true);
                                            }}
                                            style={{ 
                                                padding: '0.8rem 1rem', background: 'none', border: 'none', 
                                                color: 'var(--text-primary)', textAlign: 'left', borderRadius: '12px',
                                                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                            Reportar
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div className="profile-avatar-wrapper" style={{
                        width: '180px', height: '180px',
                        padding: '8px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                                src={getProfilePicture(freelancer)}
                                alt={freelancer.username}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        {freelancer.level >= 3 && (
                            <div style={{
                                position: 'absolute', bottom: '10px', right: '10px',
                                background: '#3b82f6', color: 'white',
                                width: '32px', height: '32px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '3px solid var(--bg-card)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
                            </div>
                        )}
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
                                    {freelancer.first_name} {freelancer.last_name}
                                </h1>
                                <span className="level-badge-premium" style={{
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Nivel {freelancer.level || 1}</span>
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
                                    color: 'var(--primary)', 
                                    fontWeight: 700,
                                    opacity: 0.8 
                                }}>
                                    @{freelancer.username}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                    <MapPin size={14} />
                                    <span>{[freelancer.city, freelancer.province, freelancer.country].filter(Boolean).join(', ') || 'Planeta Tierra'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                            {freelancer.cv_url && (
                                <button 
                                    onClick={() => window.open(freelancer.cv_url, '_blank')}
                                    className="btn-premium-action"
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        padding: '8px 16px', background: 'var(--primary)', 
                                        color: 'white', borderRadius: '12px', border: 'none',
                                        fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Ver Curriculum
                                </button>
                            )}
                        </div>

                        <div className="bio-container-premium" style={{
                            background: 'var(--bg-card)',
                            padding: '1.25rem',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            lineHeight: 1.5,
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            position: 'relative',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere'
                        }}>
                            <svg style={{ position: 'absolute', top: '15px', right: '20px', opacity: 0.1 }} width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14C19.017 11.2386 16.7784 9 14.017 9V7C17.883 7 21.017 10.134 21.017 14V21H14.017ZM3.01701 21L3.01701 18C3.01701 16.8954 3.91244 16 5.01701 16H8.01701V14C8.01701 11.2386 5.77844 9 3.01701 9V7C6.88301 7 10.017 10.134 10.017 14V21H3.01701Z"/></svg>
                            {freelancer.bio || `¡Hola! Soy ${freelancer.first_name || freelancer.username}. Me apasiona crear soluciones excepcionales y ayudar a mis clientes a alcanzar sus objetivos con profesionalismo y creatividad.`}
                        </div>
                    </div>
                </div>
                {/* Badges Section - Premium Grid */}
                <BadgesSection freelancer={freelancer} isOwnProfile={isOwnProfile} navigate={navigate} />
            </div>

            {isBlocked ? (
                <div className="glass" style={{
                    padding: '4rem',
                    textAlign: 'center',
                    borderRadius: '32px',
                    border: '1px solid var(--border)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    marginTop: '2rem'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Contenido Bloqueado</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                        No puedes ver el portafolio ni la actividad de este usuario porque existe un bloqueo activo. 
                        Aun así, puedes usar el menú superior para reportar o gestionar el bloqueo.
                    </p>
                </div>
            ) : (
                <>
                    {/* CV Section */}
                    {freelancer.cv_url && (
                        <div style={{ marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    Hoja de Vida / CV
                                </h2>
                            </div>
                            <div className="glass" style={{ padding: '1rem', borderRadius: '12px', overflow: 'hidden', textAlign: 'center' }}>
                                <img src={freelancer.cv_url} alt="Curriculum Vitae" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
                                Portafolio / Servicios
                            </h2>
                            <span style={{
                                background: 'var(--bg-card-hover)',
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                color: 'var(--text-primary)',
                                fontWeight: '600'
                            }}>{freelancerServices.length} Activos</span>
                        </div>

                        {freelancerServices.length > 0 ? (
                            <div className="services-grid-explore">
                                {freelancerServices.map(service => (
                                    <ServiceCard
                                        key={service.id}
                                        service={{
                                            ...service,
                                            freelancerRating: averageRating ? parseFloat(averageRating) : 0,
                                            reviewCount: reviewsReceived.filter(r => r.job?.service_id === service.id).length
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
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>💼</div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Este freelancer no tiene servicios activos.</p>
                            </div>
                        )}
                    </div>

                    {/* Job History Section */}
                    <div style={{ marginTop: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Historial de Trabajos
                            </h2>
                            <span style={{
                                background: 'var(--bg-card-hover)',
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                color: 'var(--text-primary)',
                                fontWeight: '600'
                            }}>{freelancerJobs.filter(j => !j._isCanceled).length} Finalizados{freelancerJobs.filter(j => j._isCanceled).length > 0 ? ` · ${freelancerJobs.filter(j => j._isCanceled).length} Cancelados` : ''}</span>
                        </div>

                        {freelancerJobs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {freelancerJobs.map(job => (
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
                                                onClick={() => navigate(`/client/${job.client_id}`)}
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
                                                {job.client?.avatar_url ? (
                                                    <img src={job.client.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {job.client?.username?.charAt(0)?.toUpperCase() || 'C'}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.serviceTitle}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        Cliente: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{job.clientName}</span>
                                                    </span>
                                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }}></span>
                                                    <span onClick={() => navigate(`/client/${job.client_id}`)} style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', cursor: 'pointer' }}>@{job.client?.username}</span>
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
                                                    background: job._isCanceled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: job._isCanceled ? '#ef4444' : '#10b981',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    marginBottom: '0.15rem'
                                                }}>
                                                    {job._isCanceled ? 'CANCELADO' : (job.deliveryResult || 'Finalizado')}
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

                    <div style={{ marginTop: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                Mis Coops / Equipos
                            </h2>
                            <span style={{
                                background: 'var(--bg-card-hover)',
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                color: 'var(--text-primary)',
                                fontWeight: '600'
                            }}>{memberTeams.length} Activas</span>
                        </div>

                        {memberTeams.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {memberTeams.map(team => {
                                    const role = team.members.find(m => m.user_id === id)?.role || 'Miembro';
                                    return (
                                        <div key={team.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/coop/${team.id}/public`)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                    {team.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{team.name}</h3>
                                                    <span style={{ fontSize: '0.85rem', color: role === 'owner' ? '#fbbf24' : 'var(--text-secondary)' }}>
                                                        {role === 'owner' ? 'Fundador' : 'Miembro'}
                                                    </span>
                                                </div>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {team.description || 'Sin descripción'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                Este freelancer no pertenece a ninguna Coop pública.
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
                                    borderBottom: activeReviewTab === 'received' ? '3px solid #3b82f6' : '3px solid transparent',
                                    color: activeReviewTab === 'received' ? 'var(--text-primary)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                    margin: 0
                                }}
                            >
                                Reseñas Recibidas ({reviewsReceived.length}) {averageRating && <span style={{ color: '#fbbf24', marginLeft: '6px' }}>★{averageRating}</span>}
                            </h2>
                            <h2 
                                onClick={() => setActiveReviewTab('given')}
                                style={{ 
                                    fontSize: '1.4rem', cursor: 'pointer', paddingBottom: '1rem', 
                                    borderBottom: activeReviewTab === 'given' ? '3px solid #3b82f6' : '3px solid transparent',
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
                                            gap: '1.5rem',
                                            transition: 'transform 0.2s'
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
                                            gap: '1.5rem',
                                            transition: 'transform 0.2s'
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
                </>
            )}

            <ReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportedId={id}
                referenceType="profile"
                itemName={freelancer ? `${freelancer.first_name} ${freelancer.last_name || ''}` : ''}
            />
        </div>
    );
};

export default FreelancerDetail;
