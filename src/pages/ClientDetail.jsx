import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
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
                            </div>
                            <p style={{ 
                                margin: '0.25rem 0 0 0', 
                                fontSize: '1.2rem', 
                                color: '#3b82f6', 
                                fontWeight: 700,
                                opacity: 0.8 
                            }}>
                                @{client.username}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.location || 'Ubicación no especificada'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.role === 'company' ? 'Empresa' : 'Particular'}</span>
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
                            {client.bio || "Este cliente busca excelencia y profesionalismo en cada proyecto. Comprometido con el crecimiento mutuo y la calidad."}
                        </div>
                    </div>
                </div>

                {/* Badges Section - Moved inside hero but after flex row */}
                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    {(() => {
                        const badgesArray = client.gamification?.badges || client.badges || [];
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
