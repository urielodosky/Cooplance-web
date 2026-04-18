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

    // Prioritize the real username from the mapped service data (Supabase)
    const displayUsername = service.freelancerUsername || service.freelancerName?.replace(/\s+/g, '_').toLowerCase();
    const displayLevel = Math.min(10, Math.max(1, service.level || 1));
    const avatar = service.freelancerAvatar;

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
        <div className={`service-card clickable category-${(service.category || '').toLowerCase().replace(/\s+/g, '-')}`} onClick={() => navigate(`/service/${service.id}`)}>
            <div className="service-image-container">
                <img 
                    src={service.image || service.image_url || service.imageUrl || 'https://ui-avatars.com/api/?name=Service&background=0a0a1a&color=6366f1&size=512'} 
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
                        src={getProfilePicture({ 
                            role: 'freelancer', 
                            avatar: avatar || service.freelancerAvatar || service.avatar_url, 
                            username: displayUsername
                        })}
                        alt={service.freelancerName}
                        className="avatar-img round clickable"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/freelancer/${service.freelancerId}`);
                        }}
                    />
                    <div className="avatar-details-col">
                        <span className="username-text">@{displayUsername}</span>
                        <div className="name-level-row">
                            <span className="fullname-text">{service.freelancerName}</span>
                            <span className="level-dot">•</span>
                            <span className="level-number">Nivel {displayLevel}</span>
                            {renderLevelBadge()}
                        </div>
                    </div>
                </div>

                <div className="title-desc-section">
                    <h4 className="card-title">{service.title}</h4>
                    <p className="card-description">{service.description || 'Sin descripción disponible.'}</p>
                </div>

                <div className="meta-info-row">
                    <div className="subtle-badge category-badge">{service.category}</div>
                    {service.subcategory && (
                        <div className="subtle-badge subcategory-badge">{service.subcategory}</div>
                    )}
                    
                    <div className="modality-tag">
                        {service.workMode === 'presential' ? (
                            <svg className="modality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        ) : (
                            <svg className="modality-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2"/></svg>
                        )}
                        <span>{service.workMode === 'presential' ? 'Presencial' : 'Remoto'}</span>
                    </div>

                    {service.specialties && service.specialties.length > 0 && (
                        <div className="extra-meta tooltip-container">
                            +{service.specialties.length}
                            <div className="tooltip-content">
                                <ul>
                                    {service.specialties.map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="service-footer-new">
                <div className="delivery-info">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Entrega: {service.deliveryTime || 3} días</span>
                </div>
                <div className="price-info">
                    <span className="price-amount">${service.price || service.budget} ARS</span>
                    <span className="price-type">Fijo</span>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
