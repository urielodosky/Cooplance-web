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
                <div className="avatar-layout-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="profile-avatar-wrapper small" style={{
                        width: '44px', height: '44px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--bg-card-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        <img
                            src={getProfilePicture({ 
                                role: 'freelancer', 
                                avatar: avatar || service.freelancerAvatar || service.avatar_url, 
                                username: displayUsername
                            })}
                            alt={service.freelancerName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className="avatar-details-col" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div className="username-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="username-text" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>@{displayUsername}</span>
                        </div>
                        <div className="status-info-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="level-dot-text" style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600 }}>• Nivel {displayLevel}</span>
                            {displayLevel === 1 && (
                                <span className="status-badge-compact new" style={{ 
                                    fontSize: '0.7rem', 
                                    background: 'rgba(16, 185, 129, 0.1)', 
                                    color: '#10b981', 
                                    padding: '2px 8px', 
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    lineHeight: '1'
                                }}>Vendedor Nuevo</span>
                            )}
                            {displayLevel === 10 && (
                                <span className="status-badge-compact expert" style={{ 
                                    fontSize: '0.7rem', 
                                    background: 'rgba(251, 191, 36, 0.1)', 
                                    color: '#fbbf24', 
                                    padding: '2px 8px', 
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    lineHeight: '1'
                                }}>Vendedor Experto</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="title-desc-section" style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
                    <h4 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.25rem', fontWeight: 800 }}>{service.title}</h4>
                    <p className="card-description" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>{service.description || 'Sin descripción disponible.'}</p>
                </div>

                <div className="meta-info-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="category-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="category-capsule" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {service.category}
                        </div>
                        
                        {(service.subcategory || (service.specialties && service.specialties.length > 0)) && (
                            <div className="subcategory-capsule tooltip-container" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, cursor: 'help' }}>
                                {service.subcategory || service.specialties[0]} 
                                {service.specialties && service.specialties.length > 0 && (
                                    <span style={{ marginLeft: '4px', color: 'var(--text-primary)' }}>+{service.specialties.length}</span>
                                )}
                                <div className="tooltip-content">
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {service.specialties?.map((s, idx) => <li key={idx} style={{ padding: '2px 0' }}>{s}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modality-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>
                        {service.workMode === 'presential' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        )}
                        <span>{service.workMode === 'presential' ? 'Presencial' : 'Remoto'}</span>
                    </div>
                </div>
            </div>

            <div className="service-footer-new" style={{ padding: '12px 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="delivery-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Entrega: {service.deliveryTime || 3} días</span>
                </div>
                <div className="price-info" style={{ textAlign: 'right' }}>
                    <div className="price-amount" style={{ color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>
                        ${service.price || service.budget} ARS
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
