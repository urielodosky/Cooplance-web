import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServices } from '../context/ServiceContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useJobs } from '../../../context/JobContext';
import ServiceCreateForm from '../components/ServiceCreateForm';
import { getProfilePicture } from '../../../utils/avatarUtils';
import PaymentModal from '../../../components/common/PaymentModal';
import { formatLocationDetail } from '../../../utils/locationFormat';
import BookingPicker from '../../../components/booking/BookingPicker';
import { getServiceReviews } from '../../../services/ReviewService';
import { supabase } from '../../../lib/supabase';
import '../../../styles/pages/ServiceDetail.scss';


const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { services, deleteService } = useServices();
    const { user, updateBalance } = useAuth();
    const { createJob } = useJobs();

    const service = services.find(s => String(s.id) === String(id));

    const [isGalleryHovered, setIsGalleryHovered] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [freelancerInternal, setFreelancerInternal] = useState(null);
    
    // UI states
    const [showEditForm, setShowEditForm] = useState(false);
    const [existingBookings, setExistingBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState({ date: null, time: null, dates: [] });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);

    useEffect(() => {
        if (service?.bookingConfig?.requiresBooking) {
            const fetchBookings = async () => {
                const { data } = await supabase
                    .from('jobs')
                    .select('booking_date, booking_time')
                    .eq('service_id', service.id)
                    .neq('status', 'canceled');
                
                if (data) {
                    setExistingBookings(data.map(j => ({
                        date: j.booking_date,
                        time: j.booking_time,
                        duration: service.bookingConfig.sessionDetails.slotDurationMinutes
                    })));
                }
            };
            fetchBookings();
        }
    }, [service]);

    // Load Reviews & Profile
    useEffect(() => {
        if (!service?.id) return;

        const loadContent = async () => {
            setReviewsLoading(true);
            setProfileLoading(true);
            try {
                // 1. Fetch Reviews
                const data = await getServiceReviews(service.id);
                setReviews(data);

                // 2. Fetch Freelancer Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', service.freelancerId)
                    .single();
                
                if (profile) setFreelancerInternal(profile);
            } catch (err) {
                console.error("Error loading service content:", err);
            } finally {
                setReviewsLoading(false);
                setProfileLoading(false);
            }
        };

        loadContent();
    }, [service?.id, service?.freelancerId]);

    if (!service) {
        return (
            <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
                <h2>Servicio no encontrado</h2>
                <button className="btn-primary" onClick={() => navigate('/explore')} style={{ marginTop: '1rem' }}>
                    Volver a Explorar
                </button>
            </div>
        );
    }

    // Build media items array for gallery
    const mediaItems = [];
    const allImages = service.images && service.images.length > 0 ? service.images : (service.image ? [service.image] : []);
    allImages.forEach((img, i) => mediaItems.push({ type: 'image', src: img, label: `Imagen ${i + 1}` }));
    const allVideos = service.videos && service.videos.length > 0 ? service.videos : (service.video ? [{ src: service.video, type: service.mediaType?.video || 'url' }] : []);
    allVideos.forEach((vid, i) => mediaItems.push({ type: 'video', src: vid.src || vid, videoType: vid.type || 'url', label: vid.name || `Video ${i + 1}` }));

    // Helper to get freelancer details for display
    const freelancerUser = freelancerInternal || {};
    const displayUsername = freelancerUser.username || service.freelancerName?.replace(/\s+/g, '_').toLowerCase();
    const displayRealName = freelancerUser.first_name ? `${freelancerUser.first_name} ${freelancerUser.last_name || ''}`.trim() : service.freelancerName;
    const displayLevel = Math.min(10, Math.max(1, freelancerUser.level || service.level || 1));
    const displayAvatar = getProfilePicture({
        role: 'freelancer',
        avatar: freelancerUser.avatar_url || service.freelancerAvatar,
        gender: freelancerUser.gender || 'male'
    });

    if (showEditForm) {
        return (
            <div className="container" style={{ padding: '2rem 0' }}>
                <div className="edit-header" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2>Modificando tu Servicio</h2>
                    <button className="btn-hero-secondary" onClick={() => setShowEditForm(false)}>Volver a Vista Previa</button>
                </div>
                <ServiceCreateForm initialData={service} onCancel={() => setShowEditForm(false)} />
            </div>
        );
    }

    const isOwner = user && (
        (service.freelancerId && service.freelancerId === user.id) ||
        service.freelancerName === (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.companyName || user.username))
    );

    const handleHire = () => {
        if (!user) {
            alert('Debes iniciar sesión para contratar.');
            navigate('/login');
            return;
        }
        if (isOwner) {
            alert('No puedes contratar tu propio servicio.');
            return;
        }

        if (service?.bookingConfig?.requiresBooking && (!selectedBooking.date || !selectedBooking.time)) {
            alert('Por favor, selecciona una fecha y horario disponible para el turno antes de continuar.');
            return;
        }

        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        const price = selectedTierForPayment ? selectedTierForPayment.price : service.price;
        const deliveryTime = selectedTierForPayment ? selectedTierForPayment.deliveryTime : service.deliveryTime;

        if (user.balance < price) {
            alert("Fondos insuficientes. Por favor recarga tu billetera.");
            setShowPaymentModal(false);
            return;
        }

        updateBalance(price, 'debit');

        createJob({
            ...service,
            price: price,
            deliveryTime: deliveryTime,
            selectedTier: selectedTierForPayment?.name || 'Estándar',
            bookingDate: service?.bookingConfig?.requiresBooking ? selectedBooking.date : null,
            bookingTime: service?.bookingConfig?.requiresBooking ? selectedBooking.time : null
        }, user);

        setShowPaymentModal(false);
        alert('¡Contratación exitosa! El dinero ha sido retenido en garantía.');
        navigate('/dashboard');
    };

    const handleDelete = async () => {
        const confirm = window.confirm('¿Estás seguro de que deseas eliminar este servicio definitivamente? Esta acción no se puede deshacer.');
        if (confirm) {
            try {
                await deleteService(service.id);
                alert('Servicio eliminado correctamente.');
                navigate('/dashboard');
            } catch (err) {
                console.error("Error al borrar servicio:", err);
                alert('Error al eliminar el servicio. Inténtalo de nuevo.');
            }
        }
    };

    return (
        <div className="container service-detail-container">
            {isOwner && (
                <div className="owner-banner" style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--primary)',
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span><strong>Es tu servicio.</strong> Así es como lo ven los demás.</span>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button className="btn-secondary" onClick={() => setShowEditForm(true)} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                            Editar Servicio
                        </button>
                        <button 
                            className="btn-secondary" 
                            onClick={handleDelete} 
                            style={{ 
                                fontSize: '0.9rem', 
                                padding: '0.4rem 1rem', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid #ef4444', 
                                color: '#ef4444' 
                            }}
                        >
                            Borrar
                        </button>
                    </div>
                </div>
            )}

            <div className="detail-grid">
                <div className="detail-main">
                    {/* MEDIA GALLERY */}
                    {mediaItems.length > 0 && (
                        <div className="glass detail-hero-section" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                            <div 
                                style={{ position: 'relative', background: '#0a0a1a', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', height: '350px' }}
                                onMouseEnter={() => setIsGalleryHovered(true)}
                                onMouseLeave={() => setIsGalleryHovered(false)}
                            >
                                {mediaItems[activeMediaIndex]?.type === 'image' ? (
                                    <img
                                        src={mediaItems[activeMediaIndex].src}
                                        alt={service.title}
                                        className="detail-hero-image"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                    />
                                ) : mediaItems[activeMediaIndex]?.type === 'video' ? (
                                    mediaItems[activeMediaIndex].videoType === 'url' ? (
                                        <div className="video-wrapper" style={{ width: '100%', height: '100%' }}>
                                            <iframe
                                                src={mediaItems[activeMediaIndex].src.replace('watch?v=', 'embed/')}
                                                title="Service Video"
                                                allowFullScreen
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                            />
                                        </div>
                                    ) : (
                                        <video
                                            src={mediaItems[activeMediaIndex].src}
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                        />
                                    )
                                ) : null}

                                {mediaItems.length > 1 && isGalleryHovered && (
                                    <>
                                        <button onClick={() => setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1)}
                                            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 5 }}
                                        >‹</button>
                                        <button onClick={() => setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0)}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 5 }}
                                        >›</button>
                                    </>
                                )}

                                {mediaItems.length > 1 && (
                                    <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {activeMediaIndex + 1} / {mediaItems.length}
                                    </span>
                                )}
                            </div>

                            {mediaItems.length > 1 && (
                                <div className="detail-thumbnail-strip">
                                    {mediaItems.map((item, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setActiveMediaIndex(index)}
                                            className={`thumbnail-btn ${index === activeMediaIndex ? 'active' : ''}`}
                                        >
                                            {item.type === 'image' ? (
                                                <img src={item.src} alt="" />
                                            ) : (
                                                <div className="video-thumb-placeholder">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="detail-content">
                        <h1 className="detail-title">{service.title}</h1>

                        <div
                            className="detail-freelancer-badge"
                            onClick={() => navigate(`/freelancer/${service.freelancerId}`)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '1rem', borderRadius: '12px', border: '1px solid transparent' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                            <img
                                src={displayAvatar}
                                alt={displayRealName}
                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{displayUsername}</h3>
                                    <span className="level-badge-lg" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>Nivel {displayLevel}</span>
                                    {freelancerUser.gamification?.vacation?.active && (() => {
                                        const daysLeft = Math.max(0, 15 - Math.floor((Date.now() - freelancerUser.gamification.vacation.startDate) / 86400000));
                                        return (
                                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.65rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                                Vacaciones — {daysLeft}d
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{displayRealName}</span>
                                    {service.rating > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border)' }}>
                                            <span style={{ color: '#fbbf24' }}>★</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{service.rating}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({service.reviewsCount || 0})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                            <span className="modality-badge" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                background: service.workMode && service.workMode.includes('presential') ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                color: service.workMode && service.workMode.includes('presential') ? '#8b5cf6' : 'var(--secondary)',
                                border: service.workMode && service.workMode.includes('presential') ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(6, 182, 212, 0.2)'
                            }}>
                                {service.workMode && service.workMode.includes('presential') ? (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                        <div style={{ marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {(() => {
                                                const details = formatLocationDetail(service.location);
                                                if (Array.isArray(details)) {
                                                    return details.map((line, idx) => <span key={idx}>{line}</span>);
                                                }
                                                return <span>{details || 'Presencial'}</span>;
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="12" x="3" y="4" rx="2" ry="2" /><line x1="2" x2="22" y1="20" y2="20" /></svg>
                                        Remoto
                                    </>
                                )}
                            </span>
                        </div>

                        <div className="detail-section">
                            <h3>Descripción</h3>
                            <p className="detail-description">{service.description}</p>
                        </div>

                        <div className="detail-section">
                            <h3>Categoría e Información</h3>
                            <div className="detail-tags" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                                {service.category && <span className="detail-tag">{service.category}</span>}
                                {service.subcategory && typeof service.subcategory === 'string' && (
                                    <span className="detail-tag">{service.subcategory}</span>
                                )}
                                {service.specialties && service.specialties.map(spec => (
                                    <span key={spec} className="detail-tag highlight">{spec}</span>
                                ))}
                            </div>
                        </div>

                        {service.faqs && service.faqs.length > 0 && (
                            <div className="glass detail-section" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px' }}>
                                <h3>Preguntas Frecuentes</h3>
                                <div className="detail-faqs">
                                    {service.faqs.map((faq, idx) => (
                                        <div key={idx} className="faq-item">
                                            <div className="faq-question">{faq.question || faq.q}</div>
                                            <div className="faq-answer">{faq.answer || faq.a}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="detail-sidebar">
                    <div className="glass sidebar-sticky">
                        <div className="pricing-box">
                            <div className="price-header">
                                <span className="price-amount">${service.price}</span>
                                <span className="price-unit">por servicio</span>
                            </div>
                            <div className="price-features">
                                <div className="feature-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    Entrega en {service.deliveryTime} días
                                </div>
                                <div className="feature-item">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Revisiones ilimitadas
                                </div>
                            </div>
                            
                            {service.bookingConfig?.requiresBooking && (
                                <div className="booking-sidebar-section" style={{ margin: '1rem 0' }}>
                                    <BookingPicker 
                                        config={service.bookingConfig}
                                        existingBookings={existingBookings}
                                        onSelect={(selection) => setSelectedBooking(selection)}
                                    />
                                </div>
                            )}

                            <button
                                className="btn-primary btn-block hire-button"
                                onClick={handleHire}
                                disabled={isOwner}
                            >
                                Contratar Servicio
                            </button>
                            {isOwner && (
                                <p className="owner-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                                    No puedes contratar tu propio servicio
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass detail-reviews-section" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    Reseñas del Servicio
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviewsLoading ? (
                        [1, 2].map(i => (
                            <div key={i} className="review-skeleton" style={{ paddingBottom: '0.8rem', opacity: 0.5 }}>
                                <div style={{ width: '80%', height: '12px', background: 'var(--border)', borderRadius: '4px' }} className="skeleton-pulse"></div>
                            </div>
                        ))
                    ) : reviews.length > 0 ? (
                        reviews.map(review => (
                            <div key={review.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{review.reviewerName}</span>
                                    <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>★ {review.rating}</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>"{review.comment}"</p>
                            </div>
                        ))
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay reseñas aún.</p>
                    )}
                </div>
            </div>

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                amount={service.price}
                freelancerName={displayUsername}
                onConfirm={handlePaymentSuccess}
                allowedMethods={freelancerUser.paymentMethods}
            />
        </div>
    );
};

export default ServiceDetail;
