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
    // Only use image if explicitly provided by user
    const hasImage = !!project.imageUrl;
    const displayUsername = project.profiles?.username || project.clientName?.replace(/\s+/g, '_').toLowerCase() || 'usuario';
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

    return (
        <div className="project-card clickable" onClick={handleClick} style={{ position: 'relative' }}>
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
                    <img
                        src={getProfilePicture({ role: project.clientRole || 'client', avatar: avatar })}
                        alt={project.clientName}
                        className="avatar-img clickable"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (project.clientRole === 'company') {
                                navigate(`/company/${project.clientId || project.authorId}`);
                            } else {
                                navigate(`/client/${project.clientId || project.authorId}`);
                            }
                        }}
                    />
                    <div className="avatar-details-col">
                        <div className="username-badge-row">
                            <span
                                className="username-text clickable"
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
                            {renderLevelBadge()}
                        </div>
                        <span className="fullname-text">{project.clientName || 'Usuario'}</span>
                        <span className="level-text">Nivel {projectLevel}</span>
                    </div>
                </div>

                <div className="title-desc-section">
                    <h3 className="card-title">{project.title}</h3>
                    <p className="card-description">
                        {project.description}
                    </p>
                </div>

                <div className="meta-info-row">
                    <span className="category-meta">{project.category}</span>
                    {project.subcategory && <span className="subcategory-meta">{project.subcategory}</span>}
                </div>

                <div className="modality-deadline-row">
                    <span className={`modality-text ${project.workMode === 'presential' ? 'presential' : 'remote'}`}>
                        {project.workMode === 'presential' ? 'Presencial' : 'Remoto'}
                    </span>
                    <span className="deadline-text">
                        {project.deadline || getTimeAgo(project.createdAt)}
                    </span>
                </div>
            </div>

            <div className="project-footer-new">
                <div className="price-tag-col">
                    <span className="price-amount">${project.budget} ARS</span>
                    {project.budgetType === 'negotiable' && <span className="negotiable-label">(negociable)</span>}
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
