import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { getProfilePicture } from '../utils/avatarUtils';
import { registerActivity } from '../utils/gamification';
import ProposalApplyModal from '../components/project/ProposalApplyModal';
import { formatLocationDetail } from '../utils/locationFormat';
import { calculateAge } from '../utils/ageUtils';
import { getProjectById, deleteProject } from '../lib/projectService';
import { getActiveJobsCount } from '../lib/jobService';
import '../styles/pages/ServiceDetail.scss';
import '../styles/pages/ProjectDetail.scss';


import ProjectDetailSkeleton from '../components/project/ProjectDetailSkeleton';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [applyMessage, setApplyMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const data = await getProjectById(id);
                if (data) {
                    setProject(data);
                } else {
                    console.error('Project not found for ID:', id);
                }
            } catch (err) {
                console.error('Error fetching project:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectData();
    }, [id]);

    // Check if user already applied (via Supabase)
    useEffect(() => {
        const checkApplied = async () => {
            if (user && project) {
                try {
                    const { hasUserApplied } = await import('../lib/proposalService');
                    const applied = await hasUserApplied(project.id, user.id);
                    setHasApplied(applied);
                } catch (err) {
                    console.error('Error checking application:', err);
                }
            }
        };
        checkApplied();
    }, [user, project]);

    const handleApply = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.role !== 'freelancer') {
            setApplyMessage({ text: 'Solo los freelancers pueden postularse a proyectos.', type: 'error' });
            setTimeout(() => setApplyMessage({ text: '', type: '' }), 4000);
            return;
        }

        // V23: Age protection - U18 Freelancers cannot apply to Company projects
        if (calculateAge(user.dob) < 18 && project?.clientRole === 'company') {
            setApplyMessage({ 
                text: 'Debes ser mayor de 18 años para postularte a ofertas de empresas.', 
                type: 'error' 
            });
            setTimeout(() => setApplyMessage({ text: '', type: '' }), 5000);
            return;
        }

        if (hasApplied) {
            return; // Button should be disabled, but just in case
        }

        const checkLimitAndOpen = async () => {
            const activeJobsCount = await getActiveJobsCount(user.id);

            const getActiveJobLimit = (level) => {
                if (level === 1) return 2;
                if (level === 2) return 5;
                if (level === 3) return 10;
                if (level === 4) return 15;
                return Infinity; // Level 5+
            };

            const limit = getActiveJobLimit(user.level || 1);
            if (activeJobsCount >= limit) {
                setApplyMessage({ 
                    text: `Has alcanzado el límite de trabajos activos (${limit}) para tu Nivel ${user.level || 1}. Termina tus trabajos actuales o sube de nivel.`, 
                    type: 'error' 
                });
                setTimeout(() => setApplyMessage({ text: '', type: '' }), 5000);
                return;
            }

            // All checks passed, open the modal
            setShowApplyModal(true);
        };

        checkLimitAndOpen();
    };

    const handleApplySuccess = () => {
        setShowApplyModal(false);
        setHasApplied(true);
        setApplyMessage({ text: '¡Postulación enviada con éxito!', type: 'success' });
        setTimeout(() => setApplyMessage({ text: '', type: '' }), 4000);
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto de forma permanente?')) return;
        
        try {
            await deleteProject(id);
            alert('Proyecto eliminado con éxito.');
            navigate('/dashboard');
        } catch (err) {
            alert('Error al eliminar proyecto: ' + err.message);
        }
    };

    if (loading) return <ProjectDetailSkeleton />;
    if (!project) return <div className="container" style={{ paddingTop: '6rem', color: 'var(--text-primary)', textAlign: 'center' }}><h3>Proyecto no encontrado.</h3></div>;

    const translateFrequency = (freq) => {
        const map = { 'one-time': 'Pago Único', 'weekly': 'Semanal', 'biweekly': 'Quincenal', 'monthly': 'Mensual' };
        return map[freq] || 'Pago Único';
    };

    return (
        <div className="container service-detail-container" style={{ paddingTop: '2rem' }}>
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Volver
            </button>

            <div className="detail-grid">
                {/* Main Content */}
                <div className="detail-main">
                    <div className="detail-content">
                        {/* Header Section */}
                        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <h1 className="detail-title" style={{ margin: 0, fontSize: '2.2rem' }}>{project.title}</h1>
                                {project.status === 'open' && (
                                    <span className="project-status-badge">
                                        <span className="status-dot"></span>
                                        ABIERTO
                                    </span>
                                )}
                            </div>

                            <div className="detail-tags" style={{ marginTop: '1rem' }}>
                                <span className="detail-tag project-category-tag">{project.category}</span>
                                {project.tags && project.tags.map((tag, i) => (
                                    <span key={i} className="detail-tag">
                                        {tag}
                                    </span>
                                ))}
                                <span className={`detail-tag work-mode-tag ${project.workMode === 'presential' ? 'presential' : ''}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                                    {project.workMode === 'presential' ? (
                                        <>
                                            <span>Presencial:</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {(() => {
                                                    const details = formatLocationDetail(project.location);
                                                    if (Array.isArray(details)) {
                                                        return details.map((line, idx) => <span key={idx} style={{ fontWeight: 'normal' }}>{line}</span>);
                                                    }
                                                    return <span style={{ fontWeight: 'normal' }}>{details}</span>;
                                                })()}
                                            </div>
                                        </>
                                    ) : 'Remoto'}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="detail-section">
                            <h3>Descripción del Proyecto</h3>
                            <p className="detail-description">
                                {project.description}
                            </p>
                        </div>

                        {/* Multimedia Grid - Added Premium Support */}
                        {((project.images && project.images.length > 0) || (project.videos && project.videos.length > 0)) && (
                            <div className="detail-section">
                                <h3>Material Adicional</h3>
                                <div className="detail-projects-grid" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '1.5rem',
                                    marginTop: '1rem' 
                                }}>
                                    {/* Videos First */}
                                    {project.videos?.map((vid, idx) => (
                                        <div key={`vid-${idx}`} className="glass project-item-card" style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            {vid.type === 'file' ? (
                                                <video src={vid.src} controls style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                                                    <iframe 
                                                        src={vid.src.replace('watch?v=', 'embed/')} 
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} 
                                                        allowFullScreen 
                                                    />
                                                </div>
                                            )}
                                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                Video de demostración {idx + 1}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Images */}
                                    {project.images?.map((img, idx) => (
                                        <div key={`img-${idx}`} className="glass project-item-card" style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <img 
                                                src={img} 
                                                alt={`Project image ${idx + 1}`} 
                                                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => window.open(img, '_blank')}
                                            />
                                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                Imagen {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FAQs Section - Main Column but Compact Size */}
                        {(() => {
                            const displayFaqs = (project.faqs && project.faqs.length > 0) ? project.faqs : [
                                { question: "¿Qué tecnologías prefieres?", answer: "Estamos abiertos a sugerencias, pero preferimos React y Node.js." },
                                { question: "¿El trabajo es 100% remoto?", answer: "Sí, todo el seguimiento se hará a través de Cooplance." }
                            ];

                            if (displayFaqs.length === 0) return null;

                            return (
                                <div className="glass detail-section" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px' }}>
                                    <h3 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', fontSize: '1rem' }}>
                                        Preguntas Frecuentes
                                    </h3>
                                    <div className="detail-faqs" style={{ gap: '0.5rem' }}>
                                        {displayFaqs.map((faq, index) => (
                                            <div key={index} className="faq-item" style={{ padding: '0.6rem', marginBottom: 0 }}>
                                                <div className="faq-question" style={{ marginBottom: '0.2rem', fontSize: '0.9rem' }}>{faq.question}</div>
                                                <div className="faq-answer" style={{ fontSize: '0.85rem' }}>{faq.answer}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* FAQs Section */}
                        {/* FAQs Section - Styled & With Dummy Data for Demo */}


                        {/* Requirements / Additional Info Grid - Only for Companies */}
                        {project.clientRole === 'company' && (
                            <div className="detail-section">
                                <h3>Detalles Adicionales</h3>
                                <div className="additional-details-grid">
                                    <div className="faq-item">
                                        <div className="faq-question" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Duración Contrato</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {project.contractDuration || project.executionTime || 'No especificado'}
                                        </div>
                                    </div>
                                    <div className="faq-item">
                                        <div className="faq-question" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Frecuencia de Pago</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {translateFrequency(project.paymentFrequency)}
                                        </div>
                                    </div>
                                    <div className="faq-item">
                                        <div className="faq-question" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Vacantes</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {project.vacancies || 1} Personas
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Sidebar */}
                <div className="detail-sidebar">
                    <div className="single-price-box">
                        <div className="price-header">
                            <span className="label">
                                {project.clientRole === 'company' ? 'Compensación' : 'Presupuesto'}
                            </span>
                            <span className="value">${project.budget} ARS</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {project.budgetType === 'fixed' ? (project.clientRole === 'company' ? '' : '(Fijo)') : '(A convenir)'}
                            </span>
                        </div>

                        <div className="project-meta-list">
                            <div className="meta-item">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>Publicado: {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            {project.deadline && (
                                <div className="meta-item urgent">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                    <span>Expira: {project.deadline}</span>
                                </div>
                            )}
                        </div>

                        {/* Inline message banner */}
                        {applyMessage.text && (
                            <div style={{
                                padding: '0.8rem 1rem',
                                marginBottom: '0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                textAlign: 'center',
                                background: applyMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                color: applyMessage.type === 'error' ? '#f87171' : '#4ade80',
                                border: `1px solid ${applyMessage.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                            }}>
                                {applyMessage.text}
                            </div>
                        )}

                        {hasApplied ? (
                            <button 
                                className="btn-primary full-width-btn" 
                                disabled
                                style={{ 
                                    background: 'rgba(34, 197, 94, 0.2)', 
                                    color: '#4ade80', 
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    cursor: 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Ya te has postulado a esta oferta
                            </button>
                        ) : (
                            <button className="btn-primary full-width-btn" onClick={handleApply}>
                                Postularse Ahora
                            </button>
                        )}
                    </div>



                    <div className="detail-content" style={{ padding: '1.5rem', borderTop: '4px solid var(--primary)' }}>
                        <h3 className="sidebar-title" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Sobre el Cliente</h3>
                        <div
                            className="client-profile-card"
                            onClick={() => {
                                if (project.clientRole === 'company') {
                                    navigate(`/company/${project.clientId}`);
                                } else {
                                    navigate(`/client/${project.clientId}`);
                                }
                            }}
                        >
                            <img
                                src={getProfilePicture({ role: project.clientRole, companyName: project.clientName, avatar: project.clientAvatar })}
                                alt={project.clientName}
                                className={`client-avatar ${project.clientRole === 'company' ? 'company' : ''}`}
                            />
                            <div>
                                <div className="client-name">
                                    {project.clientName}
                                    {project.clientRole === 'company' && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', opacity: 0.7 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
                                    )}
                                </div>
                                {project.clientRole === 'company' && (
                                    <div className="client-industry">
                                        {project.clientIndustry || 'Empresa Verificada'}
                                    </div>
                                )}
                                <div className="client-rating">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    <span className="rating-value">{project.clientRating}</span>
                                    <span>({project.clientReviews} reseñas)</span>
                                </div>
                            </div>
                            {project.clientId === user?.id && (
                                <button className="btn-secondary danger" onClick={handleDelete} style={{ marginTop: '1rem', width: '100%', borderColor: '#ef4444', color: '#ef4444' }}>
                                    Eliminar Publicación
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showApplyModal && (
                <ProposalApplyModal
                    project={project}
                    onClose={() => setShowApplyModal(false)}
                    onSuccess={handleApplySuccess}
                />
            )}
        </div>
    );
};

export default ProjectDetail;
