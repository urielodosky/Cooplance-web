import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../../utils/avatarUtils';
import '../../styles/components/ProjectCard.scss';
import { formatLocation } from '../../utils/locationFormat';

// Helper for time ago
const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Reciente';
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
};

const ProjectCard = ({ project, onApply }) => {
    const navigate = useNavigate();
    // Only use image if explicitly provided by user
    const hasImage = !!project.imageUrl;
    // Fetch fresh user data
    const getClientDetails = () => {
        try {
            const allUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            return allUsers.find(u => u.id === (project.clientId || project.authorId)) || {};
        } catch (e) {
            return {};
        }
    };
    const cUser = getClientDetails();
    const displayUsername = cUser.username || project.clientName?.replace(/\s+/g, '_').toLowerCase() || 'usuario';
    const avatar = cUser.avatar || project.clientAvatar;

    const handleClick = () => {
        navigate(`/project/${project.id}`);
    };

    return (
        <div className="project-card clickable" onClick={handleClick}>
            {hasImage && (
                <div className="project-image-container">
                    <img src={project.imageUrl} alt={project.title} className="project-image" />
                    {/* Optional visual overlay for video indicator if videoUrl exists */}
                </div>
            )}

            <div className="project-content">
                <div className="client-info">
                    <img
                        src={getProfilePicture({ role: project.clientRole || 'client', avatar: avatar })}
                        alt={project.clientName}
                        className="client-avatar clickable"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (project.clientRole === 'company') {
                                navigate(`/company/${project.clientId || project.authorId}`);
                            } else {
                                navigate(`/client/${project.clientId || project.authorId}`);
                            }
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span
                                className="client-username clickable"
                                style={{ cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (project.clientRole === 'company') {
                                        navigate(`/company/${project.clientId || project.authorId}`);
                                    } else {
                                        navigate(`/client/${project.clientId || project.authorId}`);
                                    }
                                }}
                            >
                                {displayUsername}
                            </span>
                            {project.clientRating > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.clientRating}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({project.clientReviews || 0})</span>
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>Nuevo</span>
                            )}
                        </div>
                        <span className="client-realname" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {project.clientName || 'Usuario'}
                        </span>
                        <span className="project-time-ago" style={{ marginTop: '2px' }}>{getTimeAgo(project.createdAt)}</span>
                    </div>
                </div>

                <h3 className="project-title">{project.title}</h3>

                <p className="project-excerpt">
                    {project.description}
                </p>
            </div>

            <div className="project-footer">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="category-badge">
                        {project.category}
                    </span>

                    {(() => {
                        // Filter out the main category from tags to avoid duplication
                        const displayTags = (project.tags || []).filter(t => t !== project.category);

                        if (displayTags.length > 0) {
                            return (
                                <div className="help-icon-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <span className="category-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border)', padding: '2px 6px', minHeight: 'unset' }}>
                                        +{displayTags.length}
                                    </span>
                                    <div className="help-tooltip" style={{ width: 'auto', minWidth: '120px', bottom: '100%', marginBottom: '5px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Etiquetas</div>
                                        <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.8rem', textAlign: 'left', listStyleType: 'disc' }}>
                                            {displayTags.map((tag, i) => (
                                                <li key={i}>{tag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                    <span className="category-badge" style={{
                        background: project.workMode === 'presential' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                        color: project.workMode === 'presential' ? '#8b5cf6' : 'var(--secondary)'
                    }}>
                        {project.workMode === 'presential' ? (() => {
                            const locationText = project.location || '';
                            const { display, tooltip } = formatLocation(locationText);
                            
                            if (tooltip.length > 0) {
                                return (
                                    <div className="help-icon-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            {display}
                                        </span>
                                        <div className="help-tooltip location-tooltip" style={{
                                            width: 'auto',
                                            minWidth: tooltip.length === 1 ? '140px' : '220px',
                                            maxWidth: tooltip.length >= 3 ? '380px' : '300px',
                                            bottom: '100%',
                                            marginBottom: '8px',
                                            left: '0',
                                            right: 'auto',
                                            transform: 'none',
                                            zIndex: 100,
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(15, 15, 25, 0.95)',
                                            backdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ubicaciones</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tooltip.length, 3)}, 1fr)`, gap: '12px' }}>
                                                {tooltip.map((group, i) => (
                                                    <div key={i} style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingLeft: i > 0 ? '12px' : '0' }}>
                                                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#818cf8', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                                            {group.province}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '2px' }}>
                                                            {group.cities.map((city, j) => (
                                                                <span key={j} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.4' }}>{city}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {display || locationText || 'Presencial'}
                                </span>
                            );
                        })() : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="12" x="3" y="4" rx="2" ry="2" /><line x1="2" x2="22" y1="20" y2="20" /></svg>
                                Remoto
                            </span>
                        )}
                    </span>

                    {project.deadline && typeof project.deadline === 'string' ? (
                        <span className="category-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            Expira: {project.deadline}
                        </span>
                    ) : project.executionTime && (
                        <span className="category-badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                            {(() => {
                                const val = String(project.executionTime).trim();
                                if (val.toLowerCase().includes('días') || val.toLowerCase().includes('semana') || val.toLowerCase().includes('mes')) {
                                    return `Plazo: ${val}`;
                                }
                                return `Plazo: ${val} días`;
                            })()}
                        </span>
                    )}
                </div>

                <div className="project-budget-container">
                    <span className="budget-label">PRESUPUESTO</span>
                    <span className="project-budget">
                        {project.budgetType === 'negotiable'
                            ? 'Ofertable'
                            : (project.budget ? <>${project.budget} <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>ARS</span></> : 'A convenir')}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
