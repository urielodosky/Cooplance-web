import React, { useState } from 'react';
import { useAuth, CURRENT_LEGAL_VERSION } from '../../features/auth/context/AuthContext';
import { Link } from 'react-router-dom';

const LegalModal = () => {
    const { user, updateUser } = useAuth();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    // If no user is logged in, or if they already accepted the current (or newer) version, don't show the modal
    if (!user || user.accepted_legal_version >= CURRENT_LEGAL_VERSION) {
        return null;
    }

    const handleAccept = async () => {
        if (!accepted) return;
        setLoading(true);
        try {
            // ONLY send the field we want to update to avoid RLS/Schema errors with joined fields
            await updateUser({ accepted_legal_version: CURRENT_LEGAL_VERSION });
            // App unblocks automatically because user.accepted_legal_version >= CURRENT_LEGAL_VERSION will be true
        } catch (error) {
            console.error('Error updating legal version:', error);
            alert('Hubo un error al guardar tu aceptación. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(15px)',
            zIndex: 999999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '15px'
        }}>
            <div className="glass" style={{
                background: 'var(--bg-card)',
                borderRadius: '28px',
                padding: '2.5rem 2rem',
                maxWidth: '550px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                textAlign: 'center',
                scrollbarWidth: 'none', // Hide scrollbar for cleaner look
                msOverflowStyle: 'none'
            }}>
                <style>{`
                    .glass::-webkit-scrollbar { display: none; }
                `}</style>
                
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto',
                    boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>

                <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '1rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    Actualización Legal
                </h2>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                    Hemos actualizado nuestros <strong>Términos y Condiciones</strong> y <strong>Políticas de Privacidad</strong> para mejorar tu seguridad en la plataforma.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: window.innerWidth < 480 ? 'column' : 'row',
                    gap: '0.8rem',
                    justifyContent: 'center',
                    marginBottom: '2rem'
                }}>
                    <Link to="/help?tab=terms" target="_blank" className="btn-secondary" style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', flex: 1 }}>
                        Leer Términos
                    </Link>
                    <Link to="/help?tab=privacy" target="_blank" className="btn-secondary" style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', flex: 1 }}>
                        Ver Privacidad
                    </Link>
                </div>

                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1.2rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'left',
                    marginBottom: '2.5rem'
                }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer'
                    }}>
                        <input 
                            type="checkbox" 
                            checked={accepted} 
                            onChange={(e) => setAccepted(e.target.checked)}
                            style={{
                                width: '22px',
                                height: '22px',
                                marginTop: '3px',
                                accentColor: 'var(--primary)',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: '500' }}>
                            Confirmo que he leído y acepto la nueva versión de los acuerdos legales de Cooplance.
                        </span>
                    </label>
                </div>

                <button 
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '1.1rem',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        borderRadius: '16px',
                        transition: 'all 0.3s',
                        transform: (accepted && !loading) ? 'scale(1)' : 'scale(0.98)',
                        opacity: (!accepted || loading) ? 0.5 : 1,
                        cursor: (!accepted || loading) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Procesando...' : 'Aceptar y Continuar'}
                </button>
            </div>
        </div>
    );
};

export default LegalModal;
