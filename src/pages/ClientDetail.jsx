import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import ProjectCard from '../components/project/ProjectCard';
import '../styles/pages/ServiceDetail.scss';

const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [clientProjects, setClientProjects] = useState([]);
    const [clientJobs, setClientJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');
        const storedJobs = JSON.parse(localStorage.getItem('cooplance_db_jobs') || '[]');

        const foundClient = storedUsers.find(u => u.id === parseInt(id));

        if (foundClient) {
            if (foundClient.isDeleted) {
                setClient({
                    ...foundClient,
                    isDeleted: true,
                    firstName: 'Usuario',
                    lastName: 'Eliminado',
                    bio: 'Esta cuenta ha sido eliminada y ya no está disponible.'
                });
                setClientProjects([]);
                setClientJobs([]);
            } else {
                setClient(foundClient);
                // Find active projects by this client
                // Note: Projects might use clientId or authorId depending on seed data version, checking both
                const projects = storedProjects.filter(p => (p.clientId === foundClient.id || p.authorId === foundClient.id) && p.status === 'open');
                setClientProjects(projects);

                // Find finished jobs for this client (as buyer)
                const finishedJobs = storedJobs.filter(j =>
                    j.buyerId === foundClient.id &&
                    (j.status === 'completed' || j.status === 'canceled')
                );
                setClientJobs(finishedJobs);
            }
        }
        setLoading(false);
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
                                {client.firstName ? `${client.firstName} ${client.lastName || ''}` : 'Usuario'}
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
                                    clientName: client.firstName, // Ensure name is passed correctly
                                    clientAvatar: client.avatar,
                                    clientRating: client.rating,
                                    clientReviews: client.reviewsCount,
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                    {/* Mock Review 1 */}
                    <div className="glass" style={{
                        borderRadius: '16px',
                        padding: '1.75rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div
                                style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onClick={() => navigate('/freelancer/1')}
                                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                                onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            >
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)',
                                    flexShrink: 0
                                }}>
                                    <img
                                        src="https://ui-avatars.com/api/?name=Laura+M&background=ec4899&color=fff&size=128"
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Laura Martínez</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Freelancer</span>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(251, 191, 36, 0.15)',
                                color: '#fbbf24',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 'bold'
                            }}>
                                <span>5.0</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-card)',
                            borderLeft: '4px solid var(--primary)',
                            padding: '1rem',
                            borderRadius: '0 8px 8px 0',
                            marginBottom: '1.25rem'
                        }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>Proyecto Realizado</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Rediseño de Sitio Web</span>
                        </div>

                        <p style={{
                            fontStyle: 'italic',
                            lineHeight: '1.6',
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            margin: 0
                        }}>
                            "Un placer trabajar con este cliente. Instrucciones claras y feedback constructivo en todo momento."
                        </p>
                    </div>

                    {/* Mock Review 2 */}
                    <div className="glass" style={{
                        borderRadius: '16px',
                        padding: '1.75rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div
                                style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onClick={() => navigate('/freelancer/2')}
                                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                                onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            >
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)',
                                    flexShrink: 0
                                }}>
                                    <img
                                        src="https://ui-avatars.com/api/?name=Pedro+S&background=3b82f6&color=fff&size=128"
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Pedro Sánchez</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Freelancer</span>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(251, 191, 36, 0.15)',
                                color: '#fbbf24',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 'bold'
                            }}>
                                <span>4.5</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-card)',
                            borderLeft: '4px solid var(--primary)',
                            padding: '1rem',
                            borderRadius: '0 8px 8px 0',
                            marginBottom: '1.25rem'
                        }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>Proyecto Realizado</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Desarrollo App Móvil</span>
                        </div>

                        <p style={{
                            fontStyle: 'italic',
                            lineHeight: '1.6',
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            margin: 0
                        }}>
                            "Buena experiencia, el pago fue rápido. Hubo algunas demoras en la entrega de materiales pero se resolvió bien."
                        </p>
                    </div>
                </div>
            </div>

            {/* Given Reviews Section */}
            <div style={{ marginTop: '4rem' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                        Reseñas Dadas
                    </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {/* Mock Given Review 1 */}
                    <div className="glass" style={{
                        borderRadius: '16px',
                        padding: '1.75rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div
                                style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onClick={() => navigate('/freelancer/3')}
                                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                                onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            >
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)',
                                    flexShrink: 0
                                }}>
                                    <img
                                        src="https://ui-avatars.com/api/?name=Sofia+G&background=8b5cf6&color=fff&size=128"
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Sofía Gómez</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Freelancer</span>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(251, 191, 36, 0.15)',
                                color: '#fbbf24',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 'bold'
                            }}>
                                <span>5.0</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-card)',
                            borderLeft: '4px solid var(--primary)',
                            padding: '1rem',
                            borderRadius: '0 8px 8px 0',
                            marginBottom: '1.25rem'
                        }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>Proyecto Asignado</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Edición de Video Promocional</span>
                        </div>

                        <p style={{
                            fontStyle: 'italic',
                            lineHeight: '1.6',
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            margin: 0
                        }}>
                            "Excelente freelancer, entregó el trabajo mucho antes de lo esperado y captó la idea desde el primer momento."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetail;
