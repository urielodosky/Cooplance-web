import React, { useState, useEffect } from 'react';
import { formatRelativeDate } from '../utils/dateUtils';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateAge } from '../utils/ageUtils';
import { supabase } from '../lib/supabase';
import { CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
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
import '../styles/pages/CompanyDetail.scss';

const BadgesSection = ({ company, isOwnProfile, navigate }) => {
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

    const unlockedIds = company.gamification?.badges || company.badges || [];

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
                    {isOwnProfile ? 'Mis Insignias' : 'Insignias de la Empresa'}
                </h3>
                {isOwnProfile && (
                    <button 
                        className="btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #6366f1', color: '#6366f1', fontWeight: '700', cursor: 'pointer' }}
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
// We rely on ServiceDetail.css for some basics, but will add inline styles for specific company hero look

const CompanyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isOwnProfile = currentUser?.id === id;
    const [company, setCompany] = useState(null);
    const [companyProjects, setCompanyProjects] = useState([]);
    const [companyJobs, setCompanyJobs] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [activeReviewTab, setActiveReviewTab] = useState('received');
    const [loading, setLoading] = useState(true);

    // V23: Strict access control for U18 Freelancers
    const isU18Freelancer = currentUser?.role === 'freelancer' && calculateAge(currentUser.dob) < 18;

    useEffect(() => {
        if (isU18Freelancer) {
            navigate('/dashboard');
        }
    }, [isU18Freelancer, navigate]);

    useEffect(() => {
        const fetchCompanyData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Company Profile
                const { data: profile, error: pError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (pError) throw pError;
                setCompany(profile);

                // 2. Fetch Active Projects from 'projects' table (Corrected from 'jobs')
                const { data: projectsData, error: prError } = await supabase
                    .from('projects')
                    .select('*, client:profiles!client_id(username, first_name, last_name, avatar_url, level, rating, reviews_count)')
                    .eq('client_id', id)
                    .eq('status', 'open');
                
                if (prError) throw prError;
                
                // Map projects to ensure nested data is correctly formatted for ProjectCard
                const mappedProjects = (projectsData || []).map(p => ({
                    ...p,
                    clientUsername: p.client?.username,
                    clientAvatar: p.client?.avatar_url,
                    clientName: p.client?.company_name || (p.client?.first_name ? `${p.client.first_name} ${p.client.last_name || ''}`.trim() : p.client?.username),
                    clientRating: p.client?.rating || 0,
                    clientReviews: p.client?.reviews_count || 0,
                    clientLevel: p.client?.level || 1
                }));
                setCompanyProjects(mappedProjects);

                // 3. Fetch Completed Jobs (as Buyer)
                const { data: jobsData, error: jError } = await supabase
                    .from('jobs')
                    .select('*, client:profiles!client_id(username, first_name, last_name, avatar_url)')
                    .eq('provider_id', id)
                    .in('status', ['completed', 'canceled']);
                
                if (jError) throw jError;
                
                // Map jobs to include serviceTitle and clientName
                const mappedJobs = (jobsData || []).map(j => ({
                    ...j,
                    serviceTitle: j.service_title || 'Servicio Personalizado',
                    clientName: j.client?.first_name ? `${j.client.first_name} ${j.client.last_name || ''}`.trim() : j.client?.username
                }));
                setCompanyJobs(mappedJobs);
                console.log("Company jobs loaded:", mappedJobs.length);

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
                    console.error("[CompanyDetail] Error fetching reviews received:", recError);
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
                    console.error("[CompanyDetail] Error fetching reviews given:", givError);
                } else {
                    setReviewsGiven(givData || []);
                }

            } catch (err) {
                console.error("Error loading company data:", err);
                // Fail silently
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchCompanyData();
    }, [id]);

    if (loading) return <div className="container" style={{ paddingTop: '6rem' }}>Cargando...</div>;
    if (!company) return <div className="container" style={{ paddingTop: '6rem' }}>Empresa no encontrada.</div>;

    return (
        <div className="container company-container">
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Volver
            </button>

            {/* Hero Section - Premium Redesign */}
            <div className="glass company-hero-premium" style={{
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
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    opacity: 0.8
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div className="company-logo-wrapper" style={{
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
                                src={getProfilePicture(company)}
                                alt={company.company_name}
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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
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
                                    {company.company_name || company.first_name || 'Empresa Cooplance'}
                                </h1>
                                <span className="company-badge-premium" style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Empresa Verificada</span>
                            </div>
                            <p style={{ 
                                margin: '0.25rem 0 0 0', 
                                fontSize: '1.2rem', 
                                color: '#6366f1', 
                                fontWeight: 700,
                                opacity: 0.8 
                            }}>
                                @{company.username}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span>{[company.city, company.province, company.country].filter(Boolean).join(', ') || 'Planeta Tierra'}</span>
                            </div>
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
                            {company.bio || "Esta empresa busca excelencia y profesionalismo en cada proyecto. Comprometido con el crecimiento mutuo y la calidad."}
                        </div>
                    </div>
                </div>

                {/* Badges Section - Premium Grid */}
                <BadgesSection company={company} isOwnProfile={isOwnProfile} navigate={navigate} />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <div className="section-header">
                    <h2 className="section-title-lg">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                        Oportunidades Abiertas
                    </h2>
                    <span className="count-badge">{companyProjects.length} Vacantes</span>
                </div>

                {companyProjects.length > 0 ? (
                    <div className="services-grid-explore">
                        {companyProjects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={{
                                    ...project,
                                    clientName: company.company_name || company.first_name,
                                    clientAvatar: company.avatar_url,
                                    clientRating: company.rating,
                                    clientReviews: company.reviews_count,
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-box">
                        <div className="empty-state-icon">📁</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Esta empresa no tiene ofertas activas en este momento.</p>
                    </div>
                )}
            </div>

            {/* Job History Section */}
            <div style={{ marginTop: '4rem' }}>
                <div className="section-header">
                    <h2 className="section-title-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Historial de Trabajos Contratados
                    </h2>
                    <span className="count-badge">{companyJobs.length} Finalizados</span>
                </div>

                {companyJobs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {companyJobs.map(job => (
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
                    <div className="empty-state-box">
                        <div className="empty-state-icon">📋</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Aún no hay trabajos finalizados en el historial.</p>
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
                        Reseñas Recibidas ({reviewsReceived.length})
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
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>⭐</div>
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
                                                onClick={() => navigate(`/profile/${review.target_id}`)}
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
                                                    onClick={() => navigate(`/profile/${review.target_id}`)}
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
        </div>
    );
};

export default CompanyDetail;
