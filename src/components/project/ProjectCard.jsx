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
    const displayUsername = project.profiles?.username || project.clientName?.replace(/\s+/g, '_').toLowerCase() || 'usuario';
    const avatar = project.clientAvatar || project.profiles?.avatar_url;

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete && typeof onDelete === 'function') {
            onDelete(project.id);
        }
    };

    return (
        <div className="project-card clickable" onClick={handleClick} style={{ position: 'relative' }}>
            {/* Delete Button for Owners */}
            {onDelete && (
                <button 
                    className="delete-project-btn"
                    onClick={handleDelete}
                    title="Eliminar Proyecto"
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>Nuevo Paso</span>
                            )}
                        </div>
                        <span className="client-realname" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {project.clientName || 'Usuario'}
                        </span>
                    </div>
                    <span className="project-time-ago">{getTimeAgo(project.createdAt)}</span>
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

                    <span className="category-badge" style={{
                        background: project.workMode === 'presential' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                        color: project.workMode === 'presential' ? '#8b5cf6' : 'var(--secondary)'
                    }}>
                        {project.workMode === 'presential' ? 'Presencial' : 'Remoto'}
                    </span>

                    {project.deadline && (
                        <span className="category-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            Expira: {project.deadline}
                        </span>
                    )}
                </div>

                <div className="project-budget-container">
                    <span className="budget-label">PRESUPUESTO</span>
                    <span className="project-budget">
                        {project.budgetType === 'negotiable' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{ fontSize: '1.1rem' }}>${project.budget} <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>ARS</span></span>
                                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Ofertable</span>
                            </div>
                        ) : (
                            <>${project.budget} <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>ARS</span></>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
