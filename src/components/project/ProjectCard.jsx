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
                    <img
                        src={getProfilePicture({ role: project.clientRole || 'client', avatar: avatar })}
                        alt={project.clientName}
                        className="avatar-img round clickable"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/${project.clientRole === 'company' ? 'company' : 'client'}/${project.clientId || project.authorId}`);
                        }}
                    />
                    <div className="avatar-details-col">
                        <span className="username-text">{displayUsername}</span>
                        <div className="name-level-row">
                            <span className="fullname-text">{project.clientName || 'Usuario'}</span>
                            <span className="level-dot">•</span>
                            <span className="level-number">Nivel {projectLevel}</span>
                            {renderLevelBadge()}
                        </div>
                    </div>
                </div>

                <div className="title-desc-section">
                    <h3 className="card-title">{project.title}</h3>
                    <p className="card-description">{project.description}</p>
                </div>

                <div className="meta-info-row">
                    <div className="subtle-badge category-badge">{project.category}</div>
                    {project.subcategory && (
                        <div className="subtle-badge subcategory-badge">{project.subcategory}</div>
                    )}
                    
                    <div className="modality-tag">
                        {project.workMode === 'presential' ? (
                            <svg className="modality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        ) : (
                            <svg className="modality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2"/></svg>
                        )}
                        <span>{project.workMode === 'presential' ? 'Presencial' : 'Remoto'}</span>
                    </div>

                    {project.specialties && project.specialties.length > 0 && (
                        <div className="extra-meta tooltip-container">
                            +{project.specialties.length}
                            <div className="tooltip-content">
                                <ul>
                                    {project.specialties.map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="project-footer-new">
                <div className="timeline-info">
                    <span className="published-date">{getTimeAgo(project.createdAt)}</span>
                    <span className="separator">•</span>
                    <span className="expiry-date">Expira: {formatDate(project.deadline)}</span>
                </div>
                <div className="price-info">
                    <div className="price-row">
                        <span className="price-amount">${project.budget} ARS</span>
                        {project.budgetType === 'negotiable' && <span className="negotiable-tag">Negociable</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
