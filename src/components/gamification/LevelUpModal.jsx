import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../features/auth/context/AuthContext';
import { getBenefitsForRole } from '../../data/levelBenefits';

const LevelUpModal = ({ isOpen, onClose, level }) => {
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            // Optimized Confetti: Short burst to save performance
            const count = 200;
            const defaults = {
                origin: { y: 0.7 }
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }

            fire(0.25, {
                spread: 26,
                startVelocity: 55,
            });
            fire(0.2, {
                spread: 60,
            });
            fire(0.35, {
                spread: 100,
                decay: 0.91,
                scalar: 0.8
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 25,
                decay: 0.92,
                scalar: 1.2
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 45,
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const benefitsMap = user ? getBenefitsForRole(user.role) : {};
    const levelData = benefitsMap[level] || { name: `Nivel ${level}`, description: '¡Sigue creciendo!', benefits: [] };

    // "Next Level with Benefits" Logic
    // Scan ahead to find the first level that has benefits
    let nextBeneficialLevel = null;
    for (let i = parseInt(level) + 1; i <= 10; i++) { // Assuming max level is 10, adjust as needed
        const nextData = benefitsMap[i];
        if (nextData && nextData.benefits && nextData.benefits.length > 0) {
            nextBeneficialLevel = i;
            break;
        }
    }

    // Determine if this level introduces NEW benefits (Tier Change)
    // Level 1 is always "new"
    let isNewTier = true;
    if (level > 1) {
        const prevLevelData = benefitsMap[level - 1];
        // Simple comparison of stringified benefits arrays
        if (prevLevelData && JSON.stringify(prevLevelData.benefits) === JSON.stringify(levelData.benefits)) {
            isNewTier = false;
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            padding: '1rem'
        }}>
            <div className="glass" style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 50px rgba(99, 102, 241, 0.25)',
                animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                borderRadius: '1.5rem',
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)'
            }}>
                <h2 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    color: '#ffffff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
                    marginBottom: '0.5rem',
                    marginTop: '1rem',
                    lineHeight: 1.1
                }}>
                    ¡Nivel {level}!
                </h2>

                <h3 style={{
                    color: '#FFD700',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)'
                }}>
                    {levelData.name}
                </h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
                    {levelData.description}
                </p>

                <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    textAlign: 'left'
                }}>
                    <h4 style={{
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{ width: '20px', height: '1px', background: 'var(--text-muted)' }}></span>
                        {isNewTier ? 'Beneficios Desbloqueados' : 'Tus características actuales'}
                    </h4>

                    {levelData.benefits && levelData.benefits.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {levelData.benefits.map((benefit, index) => (
                                <li key={index} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'start', lineHeight: 1.4 }}>
                                    <div style={{
                                        minWidth: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '1rem',
                                        fontSize: '0.8rem'
                                    }}>✓</div>
                                    <span style={{ color: '#f1f5f9' }}>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                            <p style={{ marginBottom: '0.5rem' }}>Continúa tu progreso.</p>
                        </div>
                    )}

                    {nextBeneficialLevel && (
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                Próxima recompensa
                            </p>
                            <p style={{ fontSize: '1rem', color: '#FFD700', fontWeight: 'bold' }}>
                                Se desbloquea en Nivel {nextBeneficialLevel}
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 30px -10px var(--primary)'
                    }}
                >
                    ¡Continuar!
                </button>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                
                /* Custom Scrollbar for Modal */
                .glass::-webkit-scrollbar {
                  width: 6px;
                }
                .glass::-webkit-scrollbar-track {
                  background: transparent;
                }
                .glass::-webkit-scrollbar-thumb {
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 3px;
                }
                .glass::-webkit-scrollbar-thumb:hover {
                  background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};

export default LevelUpModal;
