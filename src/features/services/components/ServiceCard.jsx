import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getProfilePicture } from '../../../utils/avatarUtils'; // Make sure this util exists or create mocked
import '../../../styles/components/ServiceCard.scss';
import { formatLocation } from '../../../utils/locationFormat';
import { useServices } from '../context/ServiceContext';

const ServiceCard = ({ service }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { deleteService } = useServices();
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Check if current user is owner
    const isOwner = user && user.id === service.freelancerId;

    // Mock data if missing
    const rating = service.rating || 0;
    const reviewCount = service.reviewCount || 0;

    // Fetch fresh user data to ensure latest gamification (and username) is displayed
    const getFreelancerDetails = () => {
        try {
            const allUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            return allUsers.find(u => u.id === service.freelancerId) || {};
        } catch (e) {
            return {};
        }
    };
    const fUser = getFreelancerDetails();
    const displayUsername = fUser.username || service.freelancerName?.replace(/\s+/g, '_').toLowerCase();
    const displayLevel = Math.min(10, Math.max(1, fUser.level || service.level || 1));
    const avatar = fUser.avatar || service.freelancerAvatar;

    const isTopLevel = displayLevel >= 10;
    const isNewTalent = displayLevel <= 2;

    const getCardStyle = () => {
        if (isTopLevel) return { border: '1px solid #fbbf24', boxShadow: '0 0 10px rgba(251, 191, 36, 0.1)' };
        if (isNewTalent) return { border: '1px solid #10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)' };
        return {};
    };

    const getHighlightColor = () => {
        if (isTopLevel) return '#fbbf24';
        if (isNewTalent) return '#10b981';
        return null;
    };

    const highlightColor = getHighlightColor();

    const renderLevelBadge = () => {
        if (displayLevel === 1) return <span className="status-badge new">Vendedor Nuevo</span>;
        if (displayLevel === 10) return <span className="status-badge expert">Vendedor Experto</span>;
        return null;
    };

    return (
        <div
            className="service-card clickable"
            onClick={() => navigate(`/service/${service.id}`)}
            style={getCardStyle()}
        >
            <div className="service-image-container">
                <img 
                    src={service.image || service.image_url || service.imageUrl} 
                    alt={service.title} 
                    className="service-image" 
                    onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=Service&background=0a0a1a&color=6366f1&size=512';
                    }}
                />
                {isOwner && (
                    <button 
                        className="delete-service-btn"
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm('¿Borrar este servicio definitivamente?')) return;
                            
                            setIsDeleting(true);
                            try {
                                await deleteService(service.id);
                            } catch (err) {
                                alert(`Error al borrar: ${err.message}`);
                                setIsDeleting(false);
                            }
                        }}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <div className="sync-spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        )}
                    </button>
                )}
            </div>

            <div className="service-content">
                <div className="avatar-layout-row">
                    <img
                        src={getProfilePicture(fUser.id ? { ...fUser, role: 'freelancer' } : { 
                            role: 'freelancer', 
                            avatar: avatar || service.freelancerAvatar || service.avatar_url, 
                            gender: fUser.gender || 'male',
                            username: displayUsername
                        })}
                        alt={service.freelancerName}
                        className="avatar-img"
                    />
                    <div className="avatar-details-col">
                        <div className="username-badge-row">
                            <span className="username-text" style={highlightColor ? { color: highlightColor } : {}}>
                                {displayUsername}
                            </span>
                            {renderLevelBadge()}
                        </div>
                        <span className="fullname-text">{service.freelancerName}</span>
                        <span className="level-text" style={highlightColor ? { color: highlightColor } : {}}>
                            Nivel {displayLevel}
                        </span>
                    </div>
                </div>

                <div className="title-desc-section">
                    <h4 className="card-title">{service.title}</h4>
                    <p className="card-description">
                        {service.description || 'Sin descripción disponible.'}
                    </p>
                </div>

                <div className="meta-info-row">
                    <span className="category-meta">{service.category}</span>
                    <span className="subcategory-meta">{service.subcategory}</span>
                    {(() => {
                        const rawSpecs = service.specialties || [];
                        const specs = Array.isArray(rawSpecs) ? rawSpecs : [];
                        if (specs.length > 0) return <span className="extra-meta">+{specs.length}</span>;
                        return null;
                    })()}
                </div>

                <div className="modality-deadline-row">
                    <span className={`modality-text ${service.workMode?.includes('presential') ? 'presential' : 'remote'}`}>
                        {service.workMode?.includes('presential') ? 'Presencial' : 'Remoto'}
                    </span>
                    <span className="deadline-text">
                        {(() => {
                            const time = service.deliveryTime || '3';
                            return `${time} ${time == 1 ? 'día' : 'días'}`;
                        })()}
                    </span>
                </div>
            </div>

            <div className="service-footer-new">
                <div className="price-tag-col">
                    <span className="price-amount">${service.price} ARS</span>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
