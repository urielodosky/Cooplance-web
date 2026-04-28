import React, { useState } from 'react';
import '../../../styles/main.scss';

const CoopRulesAcceptance = ({ coop, onAccept }) => {
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (!agreed) return;
        setLoading(true);
        try {
            await onAccept();
        } catch (error) {
            alert("Error al aceptar las reglas. Intenta nuevamente.");
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '700px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass animate-in" style={{ padding: '3rem', borderRadius: '32px', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(255,255,255,0.1)' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>Bienvenido a {coop.name}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Antes de unirte al equipo, debes leer y firmar el estatuto interno.</p>
                </div>

                <div className="rules-box" style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    padding: '2rem', 
                    borderRadius: '20px', 
                    maxHeight: '350px', 
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '2rem',
                    lineHeight: '1.7',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap'
                }}>
                    <h4 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>Estatuto de la Coop</h4>
                    {coop.internal_rules || "Esta Coop no ha definido reglas específicas aún."}
                </div>

                <div style={{ 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    padding: '1.2rem', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    marginBottom: '2rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ fontSize: '1.2rem' }}>⚖️</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Al firmar, declaras que has leído los términos de esta Coop y te comprometes a respetarlos, reconociendo que Cooplance actúa únicamente como plataforma mediadora.
                    </p>
                </div>

                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    cursor: 'pointer', 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    background: agreed ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                    border: agreed ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s',
                    marginBottom: '2.5rem'
                }}>
                    <input 
                        type="checkbox" 
                        checked={agreed} 
                        onChange={(e) => setAgreed(e.target.checked)} 
                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: agreed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        He leído y acepto el estatuto interno de la Coop.
                    </span>
                </label>

                <button 
                    className="btn-primary" 
                    disabled={!agreed || loading} 
                    onClick={handleAccept}
                    style={{ 
                        width: '100%', 
                        padding: '1.2rem', 
                        fontSize: '1.1rem', 
                        fontWeight: '800',
                        borderRadius: '16px',
                        boxShadow: agreed ? '0 10px 25px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                >
                    {loading ? 'Firmando...' : 'Firmar y Unirme'}
                </button>
            </div>
        </div>
    );
};

export default CoopRulesAcceptance;
