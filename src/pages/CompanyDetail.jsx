import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateAge } from '../utils/ageUtils';
import { supabase } from '../lib/supabase';
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

                // 2. Fetch Active Projects (Jobs created by this company)
                const { data: projectsData, error: prError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('client_id', id)
                    .eq('status', 'open');
                
                if (prError) throw prError;
                setCompanyProjects(projectsData || []);

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

            {/* Hero Section */}
            <div className="company-hero glass">
                <div className="hero-gradient-bar"></div>

                <div className="hero-content-wrapper">
                    <div className="company-logo-large">
                        <img
                            src={getProfilePicture({ role: 'company', avatar: company.avatar })}
                            alt={company.name || company.companyName}
                        />
                    </div>

                    <div className="company-info">
                        <div className="company-title-row">
                            <h1 className="company-title">
                                {company.company_name || company.companyName || `${company.first_name || ''} ${company.last_name || ''}`.trim() || 'Empresa'}
                            </h1>
                            <span className="verified-badge">VERIFICADO</span>
                        </div>

                        <div className="company-meta-row">
                            <span className="company-meta-tag">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="8" height="14" x="3" y="2" rx="2" /><path d="M21 14h-5" /><path d="M21 12h-5" /><path d="M21 16h-5" /></svg>
                                {company.industry || 'Tecnología'}
                            </span>

                            <span className="company-meta-tag">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                {company.location || 'Remoto'}
                            </span>
                        </div>

                        <p className="company-bio">
                            {company.bio || "Este usuario no ha añadido una descripción todavía."}
                        </p>
                    </div>
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
