import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useTeams } from '../context/TeamContext';
import { getProfilePicture } from '../utils/avatarUtils';
import ServiceCard from '../features/services/components/ServiceCard';
import { supabase } from '../lib/supabase';
import ReportModal from '../components/common/ReportModal';
import { BADGE_FAMILIES } from '../data/badgeDefinitions';
import {
    CreditCard as Coin,
    Zap as Flame,
    Rocket,
    Heart,
    Star,
    Handshake,
    Eye,
    Users
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
                <h3 className="section-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                    {isOwnProfile ? 'Mis Insignias' : 'Insignias del Freelancer'}
                </h3>
                {isOwnProfile && (
                    <button 
                        className="btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}
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
                            {status.badge && <p className="badge-desc">{status.badge.desc}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FreelancerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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

    // Calculate teams where this freelancer is a member
    const memberTeams = teams.filter(team =>
        team.members && team.members.some(m => m.userId.toString() === (id || '').toString())
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
                // Note: We'll fetch completed jobs specifically
                const { data: jobsData, error: jError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('freelancer_id', id)
                    .in('status', ['completed', 'canceled'])
                    .limit(10);
                
                if (jError) throw jError;
                setFreelancerJobs(jobsData || []);

                // 4. Fetch Reviews Received (as target)
                const { data: recData, error: recError } = await supabase
                    .from('service_reviews')
                    .select('*, reviewer:profiles!reviewer_id(username, first_name, last_name, avatar_url)')
                    .eq('target_id', id);
                
                if (!recError) setReviewsReceived(recData || []);

                // 5. Fetch Reviews Given
                const { data: givData, error: givError } = await supabase
                    .from('service_reviews')
                    .select('*, service:services!service_id(title, owner:profiles!owner_id(username, first_name, last_name, avatar_url))')
                    .eq('reviewer_id', id);
                
                if (!givError) setReviewsGiven(givData || []);

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
                    background: 'var(--gradient-primary)',
                    opacity: 0.8
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div className="profile-avatar-wrapper" style={{
                        width: '180px', height: '180px',
                        padding: '8px',
                        background: 'var(--gradient-primary)',
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
                                background: 'var(--primary)', color: 'white',
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
                            </div>
                            <p style={{ 
                                margin: '0.25rem 0 0 0', 
                                fontSize: '1.2rem', 
                                color: 'var(--primary)', 
                                fontWeight: 700,
                                opacity: 0.8 
                            }}>
                                @{freelancer.username}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{[freelancer.city, freelancer.province, freelancer.country].filter(Boolean).join(', ') || 'Planeta Tierra'}</span>
                            </div>
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
                            <button 
                                onClick={() => setIsReportModalOpen(true)}
                                className="btn-secondary"
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', 
                                    padding: '8px 16px', background: 'rgba(239, 68, 68, 0.05)', 
                                    color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)',
                                    fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                Reportar Perfil
                            </button>
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
                                service={service}
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
                    }}>{freelancerJobs.length} Finalizados</span>
                </div>

                {freelancerJobs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {freelancerJobs.map(job => (
                            <div key={job.id} className="glass" style={{ padding: '1.2rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{job.serviceTitle}</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cliente: <strong>{job.buyerName}</strong></p>
                                </div>
                                <div>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        background: job.deliveryResult === 'Cancelado' ? 'rgba(239, 68, 68, 0.1)'
                                            : job.deliveryResult === 'Entregado fuera de plazo' ? 'rgba(245, 158, 11, 0.1)'
                                                : 'rgba(16, 185, 129, 0.1)',
                                        color: job.deliveryResult === 'Cancelado' ? '#ef4444'
                                            : job.deliveryResult === 'Entregado fuera de plazo' ? '#f59e0b'
                                                : '#10b981',
                                    }}>
                                        {job.deliveryResult || 'Entregado a tiempo'}
                                    </span>
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
                            const role = team.members.find(m => m.userId.toString() === id.toString())?.role || 'Miembro';
                            return (
                                <div key={team.id} className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => navigate(`/team/${team.id}`)}>
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
                                    borderRadius: '16px',
                                    padding: '1.75rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    boxShadow: 'var(--shadow-md)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border)',
                                                flexShrink: 0,
                                                background: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {review.reviewer?.avatar_url ? (
                                                    <img src={review.reviewer.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontWeight: 'bold' }}>{review.reviewer?.username?.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {review.reviewer?.first_name ? `${review.reviewer.first_name} ${review.reviewer.last_name || ''}` : review.reviewer?.username}
                                                </h4>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cliente</span>
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                            <span>{review.rating}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        </div>
                                    </div>
                                    <p style={{ fontStyle: 'italic', lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>"{review.comment}"</p>
                                </div>
                            ))
                        ) : (
                            <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Este usuario aún no ha recibido reseñas.</p>
                            </div>
                        )
                    ) : (
                        reviewsGiven.length > 0 ? (
                            reviewsGiven.map(review => (
                                <div key={review.id} className="glass" style={{
                                    borderRadius: '16px',
                                    padding: '1.75rem',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    boxShadow: 'var(--shadow-md)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border)',
                                                flexShrink: 0,
                                                background: 'var(--bg-body)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-muted)'
                                            }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {review.service?.title || 'Servicio/Proyecto'}
                                                </h4>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calificado por {freelancer?.first_name || freelancer?.username}</span>
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                            <span>{review.rating}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        </div>
                                    </div>
                                    <p style={{ fontStyle: 'italic', lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>"{review.comment}"</p>
                                </div>
                            ))
                        ) : (
                            <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Este usuario aún no ha dado reseñas.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
            </div>

            <ReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                itemId={id}
                itemType="profile"
                itemName={`${freelancer.first_name} ${freelancer.last_name}`}
            />
        </div>
    );
};

export default FreelancerDetail;
