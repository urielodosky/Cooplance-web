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
import { useActionModal } from '../context/ActionModalContext';


import ProjectDetailSkeleton from '../components/project/ProjectDetailSkeleton';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { showActionModal } = useActionModal();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [applyMessage, setApplyMessage] = useState({ text: '', type: '' });
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [isGalleryHovered, setIsGalleryHovered] = useState(false);

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
            const { getWeeklyProposalCount } = await import('../lib/proposalService');
            const weeklyProposals = await getWeeklyProposalCount(user.id);
            
            const getProposalLimit = (level) => {
                if (level <= 1) return 5;
                if (level === 2) return 10;
                if (level === 3) return 20;
                if (level === 4) return 30;
                return 50;
            };

            const pLimit = getProposalLimit(user.level || 1);
            if (weeklyProposals >= pLimit) {
                setApplyMessage({ 
                    text: `Has alcanzado tu límite semanal de ${pLimit} postulaciones para el Nivel ${user.level || 1}. Espera a que se cumpla la semana o sube de nivel.`, 
                    type: 'error' 
                });
                setTimeout(() => setApplyMessage({ text: '', type: '' }), 5000);
                return;
            }

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

    const handleDelete = async (e) => {
        e.stopPropagation();
        
        showActionModal({
            title: 'Eliminar Proyecto',
            message: '¿Estás seguro de que deseas eliminar este proyecto de forma permanente?',
            type: 'confirm',
            severity: 'error',
            onConfirm: async () => {
                try {
                    await deleteProject(id);
                    showActionModal({
                        title: '¡Éxito!',
                        message: 'Proyecto eliminado con éxito.',
                        severity: 'success'
                    });
                    navigate('/dashboard');
                } catch (err) {
                    showActionModal({
                        title: 'Error',
                        message: 'Error al eliminar proyecto: ' + err.message,
                        severity: 'error'
                    });
                }
            }
        });
    };

    if (loading) return <ProjectDetailSkeleton />;
    if (!project) return <div className="container" style={{ paddingTop: '6rem', color: 'var(--text-primary)', textAlign: 'center' }}><h3>Proyecto no encontrado.</h3></div>;

    // Formatting date
    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    // Collate media items
    const mediaItems = [];
    if (project.images?.length > 0) {
        project.images.forEach((img, i) => mediaItems.push({ type: 'image', src: img, label: `Imagen ${i + 1}` }));
    } else if (project.imageUrl) {
        mediaItems.push({ type: 'image', src: project.imageUrl, label: 'Imagen Principal' });
    }

    if (project.videos?.length > 0) {
        project.videos.forEach((vid, i) => mediaItems.push({ 
            type: 'video', 
            src: vid.src || vid, 
            videoType: vid.type || 'url', 
            label: vid.name || `Video ${i + 1}` 
        }));
    } else if (project.videoUrl) {
        mediaItems.push({ type: 'video', src: project.videoUrl, videoType: 'url', label: 'Video Principal' });
    }

    const translateFrequency = (freq) => {
        const map = { 'one-time': 'Pago Único', 'weekly': 'Semanal', 'biweekly': 'Quincenal', 'monthly': 'Mensual' };
        return map[freq] || 'Pago Único';
    };

    const isOwner = user?.id === project.clientId;

    return (
        <div className="container service-detail-container" style={{ paddingTop: '2rem' }}>
            <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Volver
            </button>

            {isOwner && (
                <div className="owner-banner" style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--primary)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span><strong>Es tu publicación.</strong> Así es como la ven los demás.</span>
                    {(project.status === 'open' || !project.status) && (
                        <button 
                            className="btn-secondary danger" 
                            onClick={handleDelete} 
                            style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}
                        >
                            Eliminar Publicación
                        </button>
                    )}
                </div>
            )}

            <div className="detail-grid">
                {/* Main Content */}
                <div className="detail-main">
                    
                    {/* MEDIA GALLERY - SERVICE STYLE */}
                    {mediaItems.length > 0 && (
                        <div className="glass detail-hero-section" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <div 
                                style={{ position: 'relative', background: '#0a0a1a', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', height: '400px' }}
                                onMouseEnter={() => setIsGalleryHovered(true)}
                                onMouseLeave={() => setIsGalleryHovered(false)}
                            >
                                {mediaItems[activeMediaIndex]?.type === 'image' ? (
                                    <img
                                        src={mediaItems[activeMediaIndex].src}
                                        alt={project.title}
                                        className="detail-hero-image"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                    />
                                ) : mediaItems[activeMediaIndex]?.type === 'video' ? (
                                    mediaItems[activeMediaIndex].videoType === 'url' ? (
                                        <div className="video-wrapper" style={{ width: '100%', height: '100%' }}>
                                            <iframe
                                                src={mediaItems[activeMediaIndex].src.replace('watch?v=', 'embed/')}
                                                title="Project Video"
                                                allowFullScreen
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                            />
                                        </div>
                                    ) : (
                                        <video
                                            src={mediaItems[activeMediaIndex].src}
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                        />
                                    )
                                ) : null}

                                {mediaItems.length > 1 && isGalleryHovered && (
                                    <>
                                        <button onClick={() => setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1)}
                                            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 5 }}
                                        >‹</button>
                                        <button onClick={() => setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0)}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 5 }}
                                        >›</button>
                                    </>
                                )}

                                {mediaItems.length > 1 && (
                                    <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {activeMediaIndex + 1} / {mediaItems.length}
                                    </span>
                                )}
                            </div>

                            {mediaItems.length > 1 && (
                                <div className="detail-thumbnail-strip" style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem', overflowX: 'auto' }}>
                                    {mediaItems.map((item, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setActiveMediaIndex(index)}
                                            className={`thumbnail-btn ${index === activeMediaIndex ? 'active' : ''}`}
                                            style={{ width: '60px', height: '60px', flexShrink: 0, padding: 0, border: index === activeMediaIndex ? '2px solid var(--primary)' : '2px solid transparent', borderRadius: '4px', overflow: 'hidden' }}
                                        >
                                            {item.type === 'image' ? (
                                                <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div className="video-thumb-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="detail-content">
                        {/* Header Section */}
                        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                <h1 className="detail-title" style={{ margin: 0, fontSize: '2.2rem' }}>{project.title}</h1>
                                {project.status === 'open' && (
                                    <span className="project-status-badge">
                                        <span className="status-dot"></span>
                                        ABIERTO
                                    </span>
                                )}
                            </div>

                            {/* Client Header Info - Service Style */}
                            <div
                                className="detail-freelancer-badge"
                                onClick={() => navigate(project.clientRole === 'company' ? `/company/${project.clientId}` : `/client/${project.clientId}`)}
                                style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '0.8rem', borderRadius: '12px', border: '1px solid transparent', marginBottom: '1.5rem' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                                <img
                                    src={getProfilePicture({ role: project.clientRole, avatar: project.clientAvatar, companyName: project.clientName })}
                                    alt={project.clientName}
                                    style={{ width: '48px', height: '48px', borderRadius: project.clientRole === 'company' ? '8px' : '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{project.clientName}</h3>
                                        <span className="level-badge-lg" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>Nivel {project.clientLevel || 1}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{project.clientRole === 'company' ? 'Empresa' : 'Cliente'}</span>
                                        {project.clientRating > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border)' }}>
                                                <span style={{ color: '#fbbf24' }}>★</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.clientRating}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({project.clientReviews || 0})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-tags" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                <span className={`detail-tag work-mode-tag ${project.workMode === 'presential' ? 'presential' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    {project.workMode === 'presential' ? (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            {formatLocationDetail(project.location) || 'Presencial'}
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="12" x="3" y="4" rx="2" ry="2" /><line x1="2" x2="22" y1="20" y2="20" /></svg>
                                            Remoto
                                        </>
                                    )}
                                </span>
                                {project.tags && project.tags.map((tag, i) => (
                                    <span key={i} className="detail-tag" style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="detail-section">
                            <h3>Descripción del Proyecto</h3>
                            <p className="detail-description">
                                {project.description}
                            </p>
                        </div>

                        {/* Category & Information Section - Service Style */}
                        <div className="detail-section">
                            <h3>Categoría e Información</h3>
                            <div className="category-info-layout">
                                <div className="category-main-row">
                                    {project.category && (
                                        <div className="category-pill">
                                            <span className="pill-label">Categoría</span>
                                            <span className="pill-value">{project.category}</span>
                                        </div>
                                    )}
                                    {project.subcategories && project.subcategories.length > 0 && (
                                        <div className="category-pill subcategory">
                                            <span className="pill-label">Subcategoría</span>
                                            <span className="pill-value">
                                                {Array.isArray(project.subcategories) ? project.subcategories.join(', ') : project.subcategories}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {project.specialties && project.specialties.length > 0 && (
                                    <div className="specialties-section">
                                        <h4 className="specialties-title">Especialidades</h4>
                                        <div className="specialties-grid">
                                            {project.specialties.map(spec => (
                                                <span key={spec} className="specialty-tag">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multimedia Grid - Only if no carousel logic happened (fallback) */}
                        {!mediaItems.length > 0 && ((project.images && project.images.length > 0) || (project.videos && project.videos.length > 0)) && (
                            <div className="detail-section">
                                <h3>Material Adicional</h3>
                                <div className="detail-projects-grid" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '1.5rem',
                                    marginTop: '1rem' 
                                }}>
                                    {/* Legacy grid view if needed */}
                                </div>
                            </div>
                        )}

                        {/* FAQs Section */}
                        {project.faqs && project.faqs.length > 0 && (
                            <div className="glass detail-section" style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '12px' }}>
                                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                                    Preguntas Frecuentes
                                </h3>
                                <div className="detail-faqs">
                                    {project.faqs.map((faq, index) => (
                                        <div key={index} className="faq-item" style={{ marginBottom: '1rem' }}>
                                            <div className="faq-question" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{faq.question}</div>
                                            <div className="faq-answer" style={{ color: 'var(--text-secondary)' }}>{faq.answer}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Company Details */}
                        {project.clientRole === 'company' && (
                            <div className="detail-section" style={{ marginTop: '2rem' }}>
                                <h3>Detalles de la Vacante</h3>
                                <div className="additional-details-grid">
                                    <div className="faq-item glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                                        <div className="faq-question" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Duración Contrato</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                                            {project.contractDuration || project.executionTime || 'No especificado'}
                                        </div>
                                    </div>
                                    <div className="faq-item glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                                        <div className="faq-question" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Frecuencia de Pago</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                                            {translateFrequency(project.paymentFrequency)}
                                        </div>
                                    </div>
                                    <div className="faq-item glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                                        <div className="faq-question" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vacantes</div>
                                        <div className="faq-answer" style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
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
                    <div className="glass sidebar-sticky" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div className="pricing-box" style={{ padding: '2rem' }}>
                            <div className="price-header" style={{ marginBottom: '1.5rem' }}>
                                <span className="price-amount" style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    ${project.budget}
                                </span>
                                <span className="price-unit" style={{ color: 'var(--text-muted)', fontSize: '1rem', marginLeft: '0.5rem' }}>
                                    {project.budgetType === 'fixed' ? 'ARS (Fijo)' : 'ARS (A convenir)'}
                                </span>
                            </div>

                            <div className="price-features" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="feature-item" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    Publicado: {new Date(project.createdAt).toLocaleDateString()}
                                </div>
                                {project.deadline && (
                                    <div className="feature-item urgent" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem', color: '#ef4444' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                        Expira: {formatDate(project.deadline)}
                                    </div>
                                )}
                            </div>

                            {applyMessage.text && (
                                <div style={{
                                    padding: '0.8rem 1rem',
                                    marginBottom: '1rem',
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
                                <button className="btn-primary full-width-btn" disabled style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', cursor: 'default' }}>
                                    Ya te has postulado
                                </button>
                            ) : (
                                <button 
                                    className="btn-primary full-width-btn hire-button" 
                                    onClick={isOwner ? null : handleApply}
                                    style={isOwner ? { cursor: 'default', opacity: 0.8, background: 'var(--glass-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}
                                >
                                    {isOwner ? 'Este es tu pedido' : 'Postularse Ahora'}
                                </button>
                            )}
                        </div>

                        {/* CLIENT INFO SECTION - REBUILT TO MATCH SERVICE DETAIL */}
                        <div className="sidebar-reviews-section" style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <h4 style={{ margin: '0 0 1.2rem 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                Sobre el Cliente
                            </h4>
                            <div 
                                className="client-profile-card"
                                onClick={() => navigate(project.clientRole === 'company' ? `/company/${project.clientId}` : `/client/${project.clientId}`)}
                            >
                                <img
                                    src={getProfilePicture({ role: project.clientRole, companyName: project.clientName, avatar: project.clientAvatar })}
                                    alt={project.clientName}
                                    className={`client-avatar ${project.clientRole === 'company' ? 'company' : ''}`}
                                />
                                <div className="client-info">
                                    <div className="client-name">
                                        {project.clientName}
                                        {project.clientRole === 'company' && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
                                        )}
                                    </div>
                                    {project.clientIndustry && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '4px' }}>{project.clientIndustry}</div>
                                    )}
                                    <div className="client-rating">
                                        <span className="rating-value">★ {project.clientRating}</span>
                                        <span>({project.clientReviews})</span>
                                    </div>
                                </div>
                            </div>
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
