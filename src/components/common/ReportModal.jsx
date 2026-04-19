import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/context/AuthContext';

const ReportModal = ({ isOpen, onClose, itemId, itemType, itemName }) => {
    const { user } = useAuth();
    const [reason, setReason] = useState('Contenido inapropiado');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Debes iniciar sesión para enviar un reporte.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: submitError } = await supabase
                .from('reports')
                .insert({
                    reporter_id: user.id,
                    reported_item_id: itemId,
                    reported_item_type: itemType,
                    reason: reason,
                    details: details,
                    status: 'pending'
                });

            if (submitError) throw submitError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDetails('');
            }, 2000);
        } catch (err) {
            console.error('Error enviando reporte:', err);
            setError('No se pudo enviar el reporte. Inténtalo de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="media-modal-overlay" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div 
                className="glass" 
                style={{ 
                    width: '90%', 
                    maxWidth: '500px', 
                    padding: '2.5rem', 
                    borderRadius: '24px', 
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    position: 'relative'
                }} 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    style={{ 
                        position: 'absolute', top: '1.25rem', right: '1.25rem',
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: '0.5rem'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ 
                            width: '64px', height: '64px', background: 'rgba(34, 197, 94, 0.1)', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', margin: '0 auto 1.5rem', color: '#22c55e'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Reporte Enviado</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Gracias por ayudarnos a mantener la comunidad segura. Lo revisaremos pronto.</p>
                    </div>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.75rem' }}>Reportar Contenido</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                            Estás reportando: <strong style={{ color: 'var(--text-primary)' }}>{itemName || itemType}</strong>
                        </p>

                        {error && (
                            <div style={{ 
                                padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>Motivo del reporte</label>
                                <select 
                                    value={reason} 
                                    onChange={(e) => setReason(e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '0.875rem', borderRadius: '12px',
                                        background: 'var(--bg-body)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '1rem', cursor: 'pointer'
                                    }}
                                >
                                    <option value="Contenido inapropiado">Contenido inapropiado</option>
                                    <option value="Estafa/Fraude">Estafa/Fraude</option>
                                    <option value="Spam">Spam</option>
                                    <option value="Menor en riesgo">Menor en riesgo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem' }}>Detalles adicionales (opcional)</label>
                                <textarea 
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Describe brevemente el problema..."
                                    style={{ 
                                        width: '100%', padding: '0.875rem', borderRadius: '12px',
                                        background: 'var(--bg-body)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '1rem', minHeight: '120px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                    style={{ flex: 2, padding: '1rem', borderRadius: '14px', position: 'relative' }}
                                >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ReportModal;
