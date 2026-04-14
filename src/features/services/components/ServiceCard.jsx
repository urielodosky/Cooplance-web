




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

    return (
        <div
            className="service-card clickable"
            onClick={() => navigate(`/service/${service.id}`)}
            style={getCardStyle()}
        >
            <div className="service-image-container">
                <img src={service.image} alt={service.title} className="service-image" />
                {isOwner && (
                    <button 
                        className="delete-service-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Borrar este servicio?')) deleteService(service.id);
                        }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                )}
            </div>

            <div className="service-content">
                <div className="freelancer-info">
                    <img
                        src={getProfilePicture({ role: 'freelancer', avatar: avatar, gender: 'male' })} // Fallback
                        alt={service.freelancerName}
                        className="freelancer-avatar"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span className="freelancer-username" style={{ fontSize: '1rem', fontWeight: 'bold', ...(highlightColor ? { color: highlightColor } : {}) }}>
                                {displayUsername}
                            </span>
                            {(rating > 0) ? (
                                <div className="service-rating" style={{ fontSize: '0.8rem', marginLeft: '0' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    <span>{rating.toFixed(1)}</span>
                                    <span className="rating-count">({reviewCount})</span>
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 4px', borderRadius: '3px', fontWeight: '500' }}>Vendedor Nuevo</span>
                            )}
                        </div>
                        <span className="freelancer-realname" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {service.freelancerName}
                        </span>
                        <span className="freelancer-level" style={{ ...(highlightColor ? { color: highlightColor } : {}), display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            {isTopLevel && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            )}
                            Nivel {displayLevel}
                        </span>
                    </div>
                </div>

                <h4 className="service-title">{service.title}</h4>
            </div>

            <div className="service-footer">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="modality-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        {service.category}
                    </span>

                    {/* Display Subcategories (Priority) or Tags (Fallback) */}
                    {(() => {
                        const rawSubs = service.subcategory || service.subcategories;
                        const subcategories = Array.isArray(rawSubs) ? rawSubs : (rawSubs ? [rawSubs] : []);

                        const hasSubcategories = subcategories.length > 0;
                        const items = subcategories; // STRICTLY subcategories
                        const tooltipTitle = "Subcategorías";

                        if (items.length > 0) {
                            return (
                                <div className="help-icon-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <span className="modality-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', padding: '2px 6px', minHeight: 'unset' }}>
                                        +{items.length}
                                    </span>
                                    <div className="help-tooltip" style={{ width: 'auto', minWidth: '120px', bottom: '100%', marginBottom: '5px', left: '50%', transform: 'translateX(-50%)' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{tooltipTitle}</div>
                                        <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.8rem', textAlign: 'left', listStyleType: 'disc' }}>
                                            {items.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <span className="modality-badge" style={{
                        background: service.workMode && service.workMode.includes('presential') ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                        color: service.workMode && service.workMode.includes('presential') ? '#8b5cf6' : 'var(--secondary)'
                    }}>
                        {service.workMode && service.workMode.includes('presential') ? (() => {
                            const locationText = service.location || '';
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
                    <span className="modality-badge" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                        {(() => {
                            const time = service.deliveryTime || '3';
                            const displayTime = !isNaN(time) ? `${time} ${time == 1 ? 'día' : 'días'}` : time;
                            return (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    {displayTime}
                                </span>
                            );
                        })()}
                    </span>
                </div>
                <div className="service-price-container">
                    <span className="price-label">DESDE</span>
                    <span className="service-price">${service.price} <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>ARS</span></span>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard;
