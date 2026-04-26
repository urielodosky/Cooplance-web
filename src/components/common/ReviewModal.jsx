import React, { useState } from 'react';
import { Star, X, MessageSquare } from 'lucide-react';
import '../../styles/components/common/ReviewModal.scss';

/**
 * ReviewModal - Component for giving a star rating and comment
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when closing the modal
 * @param {function} onConfirm - Function to call when confirming the review ({ rating, comment })
 * @param {string} title - Title of the modal
 * @param {string} subtitle - Subtitle or description
 */
const ReviewModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Califica la experiencia", 
    subtitle = "Tu opinión ayuda a mejorar la comunidad",
    targetName = ""
}) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const displayRating = hover || rating;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Por favor, selecciona al menos una estrella.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm({ rating, comment });
            setRating(0);
            setComment("");
        } catch (err) {
            console.error("Error submitting review:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStar = (index) => {
        const isFull = displayRating >= index;
        const isHalf = displayRating >= index - 0.5 && displayRating < index;
        
        return (
            <div key={index} className="star-wrapper">
                {/* Hit Zones */}
                <div 
                    className="hit-zone left" 
                    onMouseEnter={() => setHover(index - 0.5)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(index - 0.5)}
                />
                <div 
                    className="hit-zone right" 
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(index)}
                />
                
                {/* Visual Star */}
                <div className={`star-icon ${isFull || isHalf ? 'active' : ''}`}>
                    {isHalf ? (
                        <div className="half-star-visual">
                             <Star size={32} className="star-base" />
                             <div className="star-overlay">
                                 <Star size={32} fill="currentColor" />
                             </div>
                        </div>
                    ) : (
                        <Star 
                            size={32} 
                            fill={isFull ? "currentColor" : "none"} 
                            stroke="currentColor" 
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="review-modal-overlay">
            <div className="review-modal-card glass-morphism">
                <button className="close-btn" onClick={onClose}>
                    <X size={18} />
                </button>

                <div className="modal-header">
                    <div className="icon-badge">
                        <Star className="fill-current text-yellow-500" size={20} />
                    </div>
                    <h2>{targetName ? `${title} ${targetName}` : title}</h2>
                    <p>{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="stars-container">
                        {[1, 2, 3, 4, 5].map(renderStar)}
                    </div>

                    <div className="rating-label">
                        {displayRating > 0 && (
                            <span className="rating-number">{displayRating.toFixed(1)}</span>
                        )}
                        {displayRating === 0 && "Selecciona una calificación"}
                        {displayRating > 0 && displayRating <= 1.5 && "Insatisfecho"}
                        {displayRating > 1.5 && displayRating <= 2.5 && "Regular"}
                        {displayRating > 2.5 && displayRating <= 3.5 && "Bueno"}
                        {displayRating > 3.5 && displayRating <= 4.5 && "Excelente"}
                        {displayRating === 5 && "¡Perfecto!"}
                    </div>

                    <div className="comment-area">
                        <div className="textarea-wrapper">
                            <MessageSquare className="textarea-icon" size={16} />
                            <textarea
                                placeholder="Escribe tu reseña (opcional)..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value.substring(0, 200))}
                                maxLength={200}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="char-count">
                            {comment.length} / 200
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary" 
                            disabled={rating === 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="loader-mini"></div>
                            ) : (
                                "Calificar Ahora"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
