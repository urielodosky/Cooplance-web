import React, { useState } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { Link } from 'react-router-dom';

export const CURRENT_LEGAL_VERSION = 1;

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
            await updateUser({ ...user, accepted_legal_version: CURRENT_LEGAL_VERSION });
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
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999, // Highest possible z-index
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <div className="glass" style={{
                background: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '3rem',
                maxWidth: '600px',
                width: '100%',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>

                <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '1rem', fontWeight: '800' }}>
                    Actualización Legal
                </h2>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                    Han cambiado nuestras Políticas de Privacidad y Términos y Condiciones. Para continuar usando Cooplance, es necesario que revises y aceptes las nuevas condiciones.
                </p>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    marginBottom: '2rem'
                }}>
                    <Link to="/help?tab=terms" target="_blank" className="btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                        Ver Términos y Condiciones
                    </Link>
                    <Link to="/help?tab=privacy" target="_blank" className="btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                        Ver Política de Privacidad
                    </Link>
                </div>

                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    textAlign: 'left',
                    marginBottom: '2rem'
                }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        cursor: 'pointer'
                    }}>
                        <input 
                            type="checkbox" 
                            checked={accepted} 
                            onChange={(e) => setAccepted(e.target.checked)}
                            style={{
                                width: '24px',
                                height: '24px',
                                marginTop: '2px',
                                accentColor: 'var(--primary)',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            He leído y acepto los nuevos Términos y Condiciones y la Política de Privacidad de Cooplance.
                        </span>
                    </label>
                </div>

                <button 
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.1rem',
                        opacity: (!accepted || loading) ? 0.5 : 1,
                        cursor: (!accepted || loading) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Guardando...' : 'Aceptar y Continuar'}
                </button>
            </div>
        </div>
    );
};

export default LegalModal;
