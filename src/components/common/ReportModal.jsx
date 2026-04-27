import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { submitReport } from '../../services/safetyService';

const REPORT_OPTIONS = [
    { id: 'physical_safety', label: 'Seguridad Física o Acoso en persona', description: 'Amenazas físicas, acoso fuera de la app o peligro inmediato. (Prioridad Alta)' },
    { id: 'fraud', label: 'Estafa o cobros por fuera', description: 'Cobros por fuera de la plataforma o intentos de fraude.' },
    { id: 'no_show', label: 'Ausencia / No se presentó', description: 'El usuario no asistió al lugar o cita acordada.' },
    { id: 'harassment', label: 'Acoso verbal o insultos', description: 'Insultos, amenazas o comportamiento abusivo por chat.' },
    { id: 'fake_profile', label: 'Perfil falso / Suplantación', description: 'Identidad suplantada o información de perfil engañosa.' },
    { id: 'spam', label: 'Spam o publicidad', description: 'Publicidad no deseada o mensajes repetitivos.' },
    { id: 'other', label: 'Otro motivo', description: 'Cualquier otra razón (Vuelve obligatorio el campo de descripción).' },
];

const ReportModal = ({ isOpen, onClose, reportedId, referenceType, referenceId, itemName }) => {
    const { user } = useAuth();
    const [reason, setReason] = useState('physical_safety');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const isDescriptionRequired = reason === 'other';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Debes iniciar sesión para enviar un reporte.');
            return;
        }

        if (!reportedId) {
            setError('No se pudo identificar al usuario reportado. Inténtalo de nuevo.');
            return;
        }

        if (isDescriptionRequired && !description.trim()) {
            setError('Por favor, describe el motivo del reporte.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await submitReport({
                reporter_id: user.id,
                reported_id: reportedId,
                reason: reason,
                description: description,
                reference_type: referenceType || 'profile',
                reference_id: referenceId
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDescription('');
                setReason('physical_safety');
            }, 3000);
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
                    width: '95%', 
                    maxWidth: '550px', 
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2.5rem', 
                    borderRadius: '28px', 
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    position: 'relative',
                    boxShadow: 'var(--shadow-lg)'
                }} 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    style={{ 
                        position: 'absolute', top: '1.5rem', right: '1.5rem',
                        background: 'rgba(120, 120, 120, 0.1)', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: '0.6rem', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                        <div style={{ 
                            width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.1)', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', margin: '0 auto 1.5rem', color: '#22c55e'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Reporte y Bloqueo Exitoso</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                            Hemos recibido tu reporte y el usuario ha sido bloqueado automáticamente. Ya no podrá contactarte ni ver tu perfil.
                        </p>
                    </div>
                ) : (
                    <>
                        <h2 style={{ marginBottom: '0.75rem', fontSize: '2rem', fontWeight: '800' }}>Reportar Usuario</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
                            Ayúdanos a proteger la comunidad. Este reporte será revisado por nuestro equipo de seguridad.
                        </p>

                        {error && (
                            <div style={{ 
                                padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', 
                                color: '#ef4444', borderRadius: '14px', marginBottom: '1.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.95rem',
                                display: 'flex', alignItems: 'center', gap: '0.75rem'
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    ¿Cuál es el motivo?
                                </label>
                                <select 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '1.1rem', borderRadius: '16px',
                                        background: 'var(--bg-body)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '1rem',
                                        outline: 'none', appearance: 'none', cursor: 'pointer',
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 1.25rem center',
                                        backgroundSize: '1.25rem'
                                    }}
                                >
                                    {REPORT_OPTIONS.map((opt) => (
                                        <option key={opt.id} value={opt.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {reason && (
                                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '0.5rem', lineHeight: '1.4' }}>
                                        {REPORT_OPTIONS.find(o => o.id === reason)?.description}
                                    </p>
                                )}
                            </div>

                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    Detalles adicionales {isDescriptionRequired ? <span style={{ color: '#ef4444' }}>*</span> : '(Opcional)'}
                                </label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={isDescriptionRequired ? "Por favor explica el motivo detalladamente..." : "Añade cualquier información extra que nos ayude a investigar..."}
                                    required={isDescriptionRequired}
                                    style={{ 
                                        width: '100%', padding: '1rem', borderRadius: '16px',
                                        background: 'var(--bg-body)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '1rem', minHeight: '120px',
                                        resize: 'vertical', transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                />
                            </div>

                            <div style={{ 
                                background: 'rgba(239, 68, 68, 0.05)', 
                                padding: '1.25rem', 
                                borderRadius: '18px', 
                                marginBottom: '2.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem'
                            }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '700' }}>
                                        Al reportar, este usuario será bloqueado automáticamente.
                                    </span>
                                </div>
                                <div style={{ paddingLeft: '2rem', borderTop: '1px solid rgba(239, 68, 68, 0.1)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#ef4444', opacity: 0.8, fontStyle: 'italic' }}>
                                        Importante: Cualquier reporte falso con intenciones malignas será sancionado.
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.25rem' }}>
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="btn-outline"
                                    style={{ 
                                        flex: 1, padding: '1.1rem', borderRadius: '16px', fontWeight: '700',
                                        background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                    style={{ flex: 2, padding: '1.1rem', borderRadius: '16px', fontWeight: '700', fontSize: '1rem' }}
                                >
                                    {isSubmitting ? 'Procesando...' : 'Reportar y Bloquear'}
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
