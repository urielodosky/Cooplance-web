import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { getProfilePicture } from '../utils/avatarUtils';
import { registerActivity } from '../utils/gamification';
import ProposalApplyModal from '../components/project/ProposalApplyModal';
import '../styles/pages/ServiceDetail.scss';
import '../styles/pages/ProjectDetail.scss';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);

    useEffect(() => {
        const fetchProject = () => {
            const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');
            const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');

            const foundProject = storedProjects.find(p => p.id === parseInt(id));

            if (foundProject) {
                // Enrich with client data
                const client = storedUsers.find(u => u.id === foundProject.clientId) || {};
                setProject({
                    ...foundProject,
                    clientName: client.role === 'company' ? client.companyName : (client.firstName ? `${client.firstName} ${client.lastName}` : foundProject.clientName),
                    clientAvatar: client.avatar || foundProject.clientAvatar,
                    clientRating: client.rating || 0,
                    clientReviews: client.reviewsCount || 0,
                    clientRole: client.role || foundProject.clientRole // Persist role
                });
            }
            setLoading(false);
        };

        fetchProject();
    }, [id]);

    const handleApply = () => {
        if (!user) {
            alert('Debes iniciar sesión para postularte.');
            navigate('/login');
            return;
        }

        if (user.role !== 'freelancer') {
            alert('Solo los freelancers pueden postularse a proyectos.');
            return;
        }

        const storedProposals = JSON.parse(localStorage.getItem('cooplance_db_proposals') || '[]');
        const alreadyApplied = storedProposals.some(p => p.projectId === project.id && p.freelancerId === user.id);

        if (alreadyApplied) {
            alert('Ya te has postulado a este proyecto.');
            return;
        }

        // Active Job Limit Check (Simultaneous Work)
        const storedJobs = JSON.parse(localStorage.getItem('cooplance_db_jobs') || '[]');
        const activeJobs = storedJobs.filter(j => j.freelancerId === user.id && j.status === 'active');

        const getActiveJobLimit = (level) => {
            if (level === 1) return 2;
            if (level === 2) return 5;
            if (level === 3) return 10;
            if (level === 4) return 15;
            return Infinity; // Level 5+
        };

        const limit = getActiveJobLimit(user.level || 1);
        if (activeJobs.length >= limit) {
            alert(`Has alcanzado el límite de trabajos activos simultáneos (${limit}) para tu Nivel ${user.level || 1}.\n\nDebes terminar tus trabajos actuales o subir de nivel para postularte a más proyectos.`);
            return;
        }

        // All checks passed, open the modal instead of instant apply
        setShowApplyModal(true);
    };

    const handleApplySuccess = () => {
        setShowApplyModal(false);
        alert('¡Postulación enviada con éxito!');
        navigate('/explore-clients');
    };

    if (loading) return <div className="container" style={{ paddingTop: '6rem' }}>Cargando...</div>;
    if (!project) return <div className="container" style={{ paddingTop: '6rem' }}>Proyecto no encontrado.</div>;

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
                                <span className={`detail-tag work-mode-tag ${project.workMode === 'presential' ? 'presential' : ''}`}>
                                    {project.workMode === 'presential' ? `Presencial (${project.location})` : 'Remoto'}
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

                        <button className="btn-primary full-width-btn" onClick={handleApply}>
                            Postularse Ahora
                        </button>
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
