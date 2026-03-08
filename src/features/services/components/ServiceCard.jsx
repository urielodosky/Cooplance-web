import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getProfilePicture } from '../../../utils/avatarUtils'; // Make sure this util exists or create mocked
import '../../../styles/components/ServiceCard.scss';

const ServiceCard = ({ service }) => {
    const navigate = useNavigate();

    // Mock data if missing
    const rating = service.rating || 0;
    const reviewCount = service.reviewCount || 0;
    const avatar = service.freelancerAvatar; // Logic to get actual avatar if available

    const isTopLevel = service.level >= 10;
    const isNewTalent = service.level <= 2;

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
                            <span className="freelancer-name" style={highlightColor ? { color: highlightColor } : {}}>
                                {service.freelancerName}
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
                        <span className="freelancer-level" style={highlightColor ? { color: highlightColor, display: 'flex', alignItems: 'center', gap: '3px' } : {}}>
                            {isTopLevel && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            )}
                            Nivel {service.level}
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
                        {service.workMode && service.workMode.includes('presential') ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                {service.location || 'Presencial'}
                            </span>
                        ) : (
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
