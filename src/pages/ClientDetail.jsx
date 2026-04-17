import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import '../styles/pages/ServiceDetail.scss';

const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [client, setClient] = useState(null);
    const [clientProjects, setClientProjects] = useState([]);
    const [clientJobs, setClientJobs] = useState([]);
    const [loading, setLoading] = useState(true);

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

                // 2. Fetch Active Projects (Jobs created by this client)
                const { data: projectsData, error: prError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('client_id', id)
                    .eq('status', 'open');
                
                if (prError) throw prError;
                setClientProjects(projectsData || []);

                // 3. Fetch Completed Jobs (as Buyer)
                const { data: jobsData, error: jError } = await supabase
                    .from('jobs')
                    .select('*')
                    .eq('client_id', id)
                    .in('status', ['completed', 'canceled']);
                
                if (jError) throw jError;
                setClientJobs(jobsData || []);

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

            {/* Hero Section */}
            <div className="glass" style={{
                borderRadius: '24px',
                padding: '3rem',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                    background: 'var(--gradient-primary)'
                }}></div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{
                        width: '140px', height: '140px',
                        padding: '6px',
                        background: 'var(--bg-card-hover)',
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        flexShrink: 0
                    }}>
                        <img
                            src={getProfilePicture({ role: client.role || 'client', avatar: client.avatar })}
                            alt={client.firstName || 'Cliente'}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                                {client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : (client.company_name || client.username || 'Usuario')}
                            </h1>
                            <span style={{
                                background: 'var(--secondary)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                letterSpacing: '0.5px'
                            }}>CLIENTE VERIFICADO</span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '1rem', padding: '4px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                {client.location || 'Ubicación no especificada'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '1rem', padding: '4px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                {client.role === 'company' ? 'Empresa' : 'Particular'}
                            </span>
                        </div>

                        <p style={{ maxWidth: '800px', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '12px' }}>
                            {client.bio || "Este usuario no ha añadido una descripción todavía."}
                        </p>
                    </div>
                </div>
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
                    <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                        Aún no hay trabajos finalizados en el historial.
                    </div>
                )}
            </div>

            {/* NEW REVIEWS SECTION - PREMIUM DESIGN */}
            <div style={{ marginTop: '4rem' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Reseñas Recibidas
                    </h2>
                </div>

                <div style={{ padding: '3rem', border: '1px dashed var(--border)', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este usuario aún no tiene reseñas.</p>
                </div>
            </div>

                <div style={{ padding: '3rem', border: '1px dashed var(--border)', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Este usuario aún no dio reseñas.</p>
                </div>
        </div>
    );
};

export default ClientDetail;
