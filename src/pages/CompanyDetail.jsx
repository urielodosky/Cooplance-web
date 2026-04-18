import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateAge } from '../utils/ageUtils';
import { supabase } from '../lib/supabase';
import { CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
import '../styles/pages/CompanyDetail.scss';
// We rely on ServiceDetail.css for some basics, but will add inline styles for specific company hero look

const CompanyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [company, setCompany] = useState(null);
    const [companyProjects, setCompanyProjects] = useState([]);
    const [companyJobs, setCompanyJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // V23: Strict access control for U18 Freelancers
    const isU18Freelancer = user?.role === 'freelancer' && calculateAge(user.dob) < 18;

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
                    .select('*')
                    .eq('client_id', id)
                    .in('status', ['completed', 'canceled']);
                
                if (jError) throw jError;
                setCompanyJobs(jobsData || []);

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
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    opacity: 0.8
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                    <div className="company-logo-wrapper" style={{
                        width: '180px', height: '180px',
                        padding: '8px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                            background: '#6366f1', color: 'white',
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

                {/* Badges Section - Moved inside hero but after flex row */}
                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    {(() => {
                        const badgesArray = company.gamification?.badges || company.badges || [];
                        if (badgesArray.length === 0) return null;

                        return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {CLIENT_BADGE_FAMILIES.flatMap(f => f.badges)
                                    .filter(b => badgesArray.includes(b.id))
                                    .map(badge => (
                                        <div 
                                            key={badge.id}
                                            className="glass help-icon-wrapper"
                                            style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '12px', 
                                                border: '1px solid var(--secondary)', 
                                                background: 'rgba(59, 130, 246, 0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                cursor: 'help'
                                            }}
                                        >
                                            <div style={{ color: 'var(--secondary)' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{badge.title}</span>
                                            
                                            <div className="help-tooltip" style={{ bottom: '100%', marginBottom: '8px', width: '200px' }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{badge.title}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{badge.desc}</div>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        );
                    })()}
                </div>
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
                            <div key={job.id} className="glass" style={{ padding: '1.2rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{job.serviceTitle}</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Freelancer: <strong>{job.freelancerName}</strong></p>
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
                    <div className="empty-state-box">
                        <div className="empty-state-icon">📋</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Aún no hay trabajos finalizados en el historial.</p>
                    </div>
                )}
            </div>

            {/* REVIEWS SECTION */}
            <div style={{ marginTop: '4rem' }}>
                <div className="section-header">
                    <h2 className="section-title-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Reseñas Recibidas
                    </h2>
                </div>

                <div className="empty-state-box" style={{ padding: '3rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este usuario aún no tiene reseñas.</p>
                </div>
            </div>

            {/* GIVEN REVIEWS SECTION */}
            <div style={{ marginTop: '4rem' }}>
                <div className="section-header">
                    <h2 className="section-title-lg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                        Reseñas Dadas
                    </h2>
                </div>

                <div className="empty-state-box" style={{ padding: '3rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este usuario aún no dio reseñas.</p>
                </div>
            </div>
        </div>
    );
};

export default CompanyDetail;
