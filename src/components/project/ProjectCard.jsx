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

const ProjectCard = ({ project, onApply, onDelete }) => {
    const navigate = useNavigate();
    const displayUsername = project.clientUsername || project.profiles?.username || project.clientName?.replace(/\s+/g, '_').toLowerCase() || 'usuario';
    const avatar = project.clientAvatar || project.profiles?.avatar_url;
    const projectLevel = project.profiles?.level || 1;

    const handleClick = () => {
        navigate(`/project/${project.id}`);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete && typeof onDelete === 'function') {
            onDelete(project.id);
        }
    };

    const renderLevelBadge = () => {
        if (projectLevel === 1) return <span className="status-badge new">Primer Pedido</span>;
        if (projectLevel === 10) return <span className="status-badge expert">Cliente Experto</span>;
        return null;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No definida';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className={`project-card clickable category-${(project.category || '').toLowerCase().replace(/\s+/g, '-')}`} onClick={handleClick}>
            {/* Delete Button for Owners */}
            {onDelete && (
                <button 
                    className="delete-project-btn"
                    onClick={handleDelete}
                    title="Eliminar Proyecto"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            )}

            <div className="project-image-container">
                <img 
                    src={project.imageUrl || 'https://ui-avatars.com/api/?name=Project&background=0a0a1a&color=6366f1&size=512'} 
                    alt={project.title} 
                    className="project-image" 
                    onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=Project&background=0a0a1a&color=6366f1&size=512';
                    }}
                />
            </div>

            <div className="project-content">
                <div className="avatar-layout-row">
                    <div className="profile-avatar-wrapper small" style={{
                        width: '48px', height: '48px',
                        padding: '3px',
                        background: 'var(--gradient-secondary, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%))',
                        borderRadius: '50%',
                        flexShrink: 0
                    }}>
                        <div style={{
                            width: '100%', height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid var(--bg-card)',
                            background: 'var(--bg-card)'
                        }}>
                            <img
                                src={getProfilePicture({ role: project.clientRole || 'client', avatar: avatar })}
                                alt={project.clientName}
                                className="clickable"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/${project.clientRole === 'company' ? 'company' : 'client'}/${project.clientId || project.authorId}`);
                                }}
                            />
                        </div>
                    </div>
                    <div className="avatar-details-col">
                        <div className="username-row">
                            <span className="username-text" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>@{displayUsername}</span>
                        </div>
                        <div className="name-level-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="fullname-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{project.clientName || 'Usuario'}</span>
                            <span className="level-badge-compact" style={{ 
                                fontSize: '0.7rem', 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                color: '#3b82f6', 
                                padding: '1px 8px', 
                                borderRadius: '6px',
                                fontWeight: 700
                            }}>Nivel {projectLevel}</span>
                        </div>
                    </div>
                </div>

                <div className="title-desc-section" style={{ margin: '1.25rem 0' }}>
                    <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>{project.title}</h3>
                    <p className="card-description" style={{ fontSize: '0.9rem', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
                </div>

                <div className="meta-info-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="premium-badge-tag" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>{project.category}</div>
                    
                    <div className="modality-tag-premium" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {project.workMode === 'presential' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        )}
                        <span>{project.workMode === 'presential' ? 'Presencial' : 'Remoto'}</span>
                    </div>

                    {project.specialties && project.specialties.length > 0 && (
                        <div className="extra-meta tooltip-container" style={{ background: 'var(--bg-card-hover)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, cursor: 'help' }}>
                            +{project.specialties.length}
                            <div className="tooltip-content">
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {project.specialties.map((s, idx) => <li key={idx} style={{ padding: '2px 0' }}>{s}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="project-footer-new" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="timeline-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getTimeAgo(project.createdAt)}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>Expira: {formatDate(project.deadline)}</span>
                </div>
                <div className="price-info">
                    <div className="price-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span className="price-amount" style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>${project.budget} ARS</span>
                        {project.budgetType === 'negotiable' && <span className="negotiable-tag" style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Negociable</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
