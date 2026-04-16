import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../context/TeamContext';
import { getProfilePicture } from '../utils/avatarUtils';
import ServiceCard from '../features/services/components/ServiceCard';
import { supabase } from '../lib/supabase';
import '../styles/pages/ServiceDetail.scss';

const FreelancerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { teams } = useTeams();
    const [freelancer, setFreelancer] = useState(null);
    const [freelancerServices, setFreelancerServices] = useState([]);
    const [freelancerJobs, setFreelancerJobs] = useState([]);
    const [reviewsReceived, setReviewsReceived] = useState([]);
    const [reviewsGiven, setReviewsGiven] = useState([]);
    const [loading, setLoading] = useState(true);

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

                // 2. Fetch Services
                const { data: servicesData, error: sError } = await supabase
                    .from('services')
                    .select('*')
                    .eq('owner_id', id)
                    .eq('active', true);
                
                if (sError) throw sError;
                setFreelancerServices(servicesData || []);

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

                // 4. Fetch Reviews Received
                const { data: recData, error: recError } = await supabase
                    .from('service_reviews')
                    .select('*, reviewer:profiles!reviewer_id(username, first_name, last_name, avatar_url)')
                    .in('service_id', servicesData.map(s => s.id));
                
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
                            src={getProfilePicture({ 
                                role: 'freelancer', 
                                avatar: freelancer.avatar_url || freelancer.avatar, 
                                gender: freelancer.gender 
                            })}
                            alt={freelancer.first_name || 'Freelancer'}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                                {freelancer.first_name ? `${freelancer.first_name} ${freelancer.last_name || ''}` : freelancer.username}
                            </h1>
                            <span style={{
                                background: 'var(--primary)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                letterSpacing: '0.5px'
                            }}>FREELANCER NIVEL {freelancer.level || 1}</span>
                             
                             {freelancer.cv_url && (
                                 <button 
                                     onClick={() => {
                                         const link = document.createElement('a');
                                         link.href = freelancer.cv_url;
                                         link.target = '_blank';
                                         link.download = `CV_${freelancer.first_name || freelancer.username}.png`;
                                         link.click();
                                     }}
                                     className="btn-secondary"
                                     style={{ 
                                         fontSize: '0.75rem', 
                                         padding: '4px 12px', 
                                         borderRadius: '10px',
                                         display: 'flex',
                                         alignItems: 'center',
                                         gap: '0.5rem',
                                         cursor: 'pointer',
                                         background: 'rgba(255,255,255,0.05)',
                                         border: '1px solid var(--border)'
                                     }}
                                 >
                                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                     Ver CV
                                 </button>
                             )}
                            {freelancer.gamification?.vacation?.active && (() => {
                                const daysLeft = Math.max(0, 15 - Math.floor((Date.now() - freelancer.gamification.vacation.startDate) / 86400000));
                                return (
                                    <span style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10b981',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid rgba(16, 185, 129, 0.25)'
                                    }}>
                                        De vacaciones — faltan {daysLeft} días
                                    </span>
                                );
                            })()}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '1rem', padding: '4px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                {freelancer.location || 'Ubicación no especificada'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '1rem', padding: '4px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                                {freelancerServices.length} Servicios
                            </span>
                        </div>

                        <p style={{ maxWidth: '800px', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            {freelancer.bio || `Hola, soy ${freelancer.first_name || freelancer.username}. Especialista en ofrecer soluciones de alta calidad. Contáctame para discutir tu proyecto.`}
                        </p>
                    </div>
                </div>
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

            {/* Reviews Section */}
            <div style={{ marginTop: '4rem' }}>
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Reseñas Recibidas
                    </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    {reviewsReceived.length > 0 ? (
                        reviewsReceived.map(review => (
                            <div key={review.id} className="glass" style={{
                                borderRadius: '16px',
                                padding: '1.75rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div
                                        style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
                                    >
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
                                                <img
                                                    src={review.reviewer.avatar_url}
                                                    alt="Avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
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
                                        <span>{review.rating}</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                </div>
                                <p style={{
                                    fontStyle: 'italic',
                                    lineHeight: '1.6',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.95rem',
                                    margin: 0
                                }}>
                                    "{review.comment}"
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Este freelancer aún no ha recibido reseñas.</p>
                        </div>
                    )}
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
                    {reviewsGiven.length > 0 ? (
                        reviewsGiven.map(review => (
                            <div key={review.id} className="glass" style={{
                                borderRadius: '16px',
                                padding: '1.75rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div
                                        style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
                                    >
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
                                            {review.service?.owner?.avatar_url ? (
                                                <img
                                                    src={review.service.owner.avatar_url}
                                                    alt="Avatar"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span style={{ fontWeight: 'bold' }}>{review.service?.owner?.username?.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                En: {review.service?.title}
                                            </h4>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Para: {review.service?.owner?.first_name ? `${review.service.owner.first_name} ${review.service.owner.last_name || ''}` : review.service?.owner?.username}
                                            </span>
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
                                        <span>{review.rating}</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                </div>
                                <p style={{
                                    fontStyle: 'italic',
                                    lineHeight: '1.6',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.95rem',
                                    margin: 0
                                }}>
                                    "{review.comment}"
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="glass" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Este freelancer aún no ha dado reseñas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FreelancerDetail;
