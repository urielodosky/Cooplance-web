import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileTestModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [path, setPath] = useState(null); // 'sell' or 'buy'
    const [result, setResult] = useState(null);

    if (!isOpen) return null;

    const handleAnswerStep1 = (chosenPath) => {
        setPath(chosenPath);
        setStep(2);
    };

    const handleAnswerStep2 = (finalResult) => {
        setResult(finalResult);
    };

    const resetTest = () => {
        setStep(1);
        setPath(null);
        setResult(null);
    };

    const handleNavigate = () => {
        onClose();
        navigate('/register');
    };

    const renderRolesInfo = () => {
        switch (result) {
            case 'freelancer':
                return {
                    title: '¡Tu cuenta ideal es Freelancer!',
                    desc: 'Como profesional independiente o equipo pequeño, esta cuenta te permite ofrecer tus servicios, formar Coops (agencias de hasta 5 miembros), ganar XP y conseguir clientes de todo el mundo.',
                    icon: '🚀',
                    color: '#8b5cf6'
                };
            case 'company_seller':
                return {
                    title: '¡Tu cuenta ideal es Empresa Vendedora!',
                    desc: 'Al ser una agencia o consultora constituida, esta cuenta te permitirá vender servicios a gran escala, gestionar equipos más grandes (Coops de hasta 10 miembros) y acceder a herramientas avanzadas para organizar tu talento.',
                    icon: '💼',
                    color: '#10b981'
                };
            case 'buyer':
                return {
                    title: '¡Tu cuenta ideal es Cliente!',
                    desc: 'Perfecto para cuando necesitas algo puntual y rápido. Explorá nuestro catálogo para contratar servicios para tu hogar, recibir asesorías o resolver proyectos personales sin complicaciones.',
                    icon: '👤',
                    color: '#f59e0b'
                };
            case 'company_buyer':
                return {
                    title: '¡Tu cuenta ideal es Empresa Compradora!',
                    desc: 'Si buscas talento a largo plazo o para tu negocio, esta cuenta te permitirá publicar ofertas de trabajo corporativo, gestionar contratos fijos y armar equipos dedicados para escalar tu empresa.',
                    icon: '🏢',
                    color: '#06b6d4'
                };
            default:
                return null;
        }
    };

    const resultData = renderRolesInfo();

    const OptionCard = ({ icon, title, onClick }) => (
        <div 
            onClick={onClick}
            style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(139, 92, 246, 0.2), 0 4px 6px -2px rgba(139, 92, 246, 0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
        >
            <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '500', color: '#fff', lineHeight: '1.4' }}>{title}</span>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            padding: '1rem'
        }}>
            <div className="glass" style={{
                maxWidth: '750px',
                width: '100%',
                padding: '3.5rem 3rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.2)',
                borderRadius: '24px',
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '20px',
                    right: '25px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    ✕
                </button>

                {!result ? (
                    <div style={{ animation: 'fadeInScale 0.4s ease-out forwards' }}>
                        <h2 style={{ fontSize: '2.4rem', marginBottom: '0.8rem', color: '#fff', fontWeight: '800', letterSpacing: '-0.5px' }}>
                            Descubre tu perfil ideal
                        </h2>

                        {step === 1 && (
                            <div style={{ animation: 'slideInRight 0.3s ease-out forwards' }}>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', fontWeight: '400' }}>
                                    ¿Cuál es tu objetivo principal hoy en Cooplance?
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <OptionCard 
                                        icon="💼" 
                                        title="Quiero ofrecer servicios y ganar dinero" 
                                        onClick={() => handleAnswerStep1('sell')} 
                                    />
                                    <OptionCard 
                                        icon="🛍️" 
                                        title="Quiero contratar talento para un proyecto" 
                                        onClick={() => handleAnswerStep1('buy')} 
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && path === 'sell' && (
                            <div style={{ animation: 'slideInRight 0.3s ease-out forwards' }}>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', fontWeight: '400' }}>
                                    Excelente. ¿Cómo trabajas actualmente?
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <OptionCard 
                                        icon="💻" 
                                        title="Soy profesional independiente o tengo un equipo pequeño" 
                                        onClick={() => handleAnswerStep2('freelancer')} 
                                    />
                                    <OptionCard 
                                        icon="🏢" 
                                        title="Somos una agencia, consultora o empresa constituida" 
                                        onClick={() => handleAnswerStep2('company_seller')} 
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && path === 'buy' && (
                            <div style={{ animation: 'slideInRight 0.3s ease-out forwards' }}>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', fontWeight: '400' }}>
                                    Perfecto. ¿Qué escala base necesitas?
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <OptionCard 
                                        icon="🏠" 
                                        title="Algo puntual y rápido para mí" 
                                        onClick={() => handleAnswerStep2('buyer')} 
                                    />
                                    <OptionCard 
                                        icon="📈" 
                                        title="Busco talento a largo plazo o para mi negocio" 
                                        onClick={() => handleAnswerStep2('company_buyer')} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Progress Indicators */}
                        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
                            <div style={{ width: step === 1 ? '24px' : '10px', height: '10px', borderRadius: '5px', background: step === 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
                            <div style={{ width: step === 2 ? '24px' : '10px', height: '10px', borderRadius: '5px', background: step === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
                        </div>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeInScale 0.4s ease-out forwards' }}>
                        <div style={{ 
                            fontSize: '4.5rem', 
                            marginBottom: '1.5rem', 
                            display: 'inline-block',
                            padding: '1.5rem',
                            background: `rgba(${resultData.color === '#8b5cf6' ? '139, 92, 246' : resultData.color === '#10b981' ? '16, 185, 129' : resultData.color === '#06b6d4' ? '6, 182, 212' : '245, 158, 11'}, 0.1)`,
                            borderRadius: '50%',
                            boxShadow: `0 0 30px rgba(${resultData.color === '#8b5cf6' ? '139, 92, 246' : resultData.color === '#10b981' ? '16, 185, 129' : resultData.color === '#06b6d4' ? '6, 182, 212' : '245, 158, 11'}, 0.2)`
                        }}>
                            {resultData.icon}
                        </div>
                        <h2 style={{ fontSize: '2.2rem', marginBottom: '1.2rem', color: resultData.color, fontWeight: '800' }}>
                            {resultData.title}
                        </h2>
                        <p style={{ color: 'var(--text-primary)', fontSize: '1.15rem', lineHeight: '1.7', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto 2.5rem' }}>
                            {resultData.desc}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                className="btn-secondary" 
                                style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '50px', fontWeight: '600' }} 
                                onClick={resetTest}
                            >
                                Volver a intentar
                            </button>
                            <button 
                                className="btn-primary" 
                                style={{ 
                                    padding: '1rem 2.5rem', 
                                    fontSize: '1.1rem', 
                                    borderRadius: '50px', 
                                    fontWeight: '700',
                                    background: resultData.color,
                                    borderColor: resultData.color,
                                    boxShadow: `0 4px 15px ${resultData.color}40`
                                }} 
                                onClick={handleNavigate}
                            >
                                Comenzar ahora
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default ProfileTestModal;
