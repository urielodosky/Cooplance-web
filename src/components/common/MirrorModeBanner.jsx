import React from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';

const MirrorModeBanner = () => {
    const { isTutorView, supervisedUser, exitMirrorMode } = useAuth();

    if (!isTutorView || !supervisedUser) return null;

    return (
        <div style={{
            width: '100%',
            backgroundColor: '#f59e0b',
            color: '#000',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            fontWeight: '600',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            borderBottom: '2px solid rgba(0,0,0,0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                <span>
                    MODO ESPEJO: Estás supervisando la cuenta de <strong>{supervisedUser.first_name} {supervisedUser.last_name}</strong> (@{supervisedUser.username})
                </span>
            </div>
            
            <span style={{ 
                fontSize: '0.75rem', 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                Sólo Lectura
            </span>

            <button 
                onClick={exitMirrorMode}
                style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    border: 'none',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'transform 0.2s',
                    fontWeight: '700'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
                Salir del Modo Espejo
            </button>
        </div>
    );
};

export default MirrorModeBanner;
