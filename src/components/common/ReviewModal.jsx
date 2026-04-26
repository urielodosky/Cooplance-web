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
    subtitle = "Tu opinión ayuda a mejorar la comunidad" 
}) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

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

    return (
        <div className="review-modal-overlay">
            <div className="review-modal-card glass-morphism">
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <div className="icon-badge">
                        <Star className="fill-current text-yellow-500" size={24} />
                    </div>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Stars Selection */}
                    <div className="stars-container">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className={`star-btn ${star <= (hover || rating) ? 'active' : ''}`}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                            >
                                <Star 
                                    size={36} 
                                    fill={star <= (hover || rating) ? "currentColor" : "none"} 
                                    stroke="currentColor" 
                                />
                            </button>
                        ))}
                    </div>

                    <div className="rating-label">
                        {rating === 1 && "Muy Insatisfecho"}
                        {rating === 2 && "Insatisfecho"}
                        {rating === 3 && "Neutral"}
                        {rating === 4 && "Satisfecho"}
                        {rating === 5 && "Excelente"}
                    </div>

                    {/* Comment Area */}
                    <div className="comment-area">
                        <div className="textarea-wrapper">
                            <MessageSquare className="textarea-icon" size={18} />
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
                                "Finalizar y Calificar"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
