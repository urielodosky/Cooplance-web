import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SVGIcons = {
    rocket: (color) => (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/>
            <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/>
        </svg>
    ),
    briefcase: (color) => (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
    ),
    user: (color) => (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    ),
    building: (color) => (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/>
        </svg>
    ),
    chart: (color) => (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 18 18"/><path d="M21 11V3h-8"/><path d="M7 12 3 20h21l-4-8-4 8-3-6-3 6Z"/>
        </svg>
    ),
    shopping: (color) => (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
    ),
    house: (color) => (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    ),
    monitor: (color) => (
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
    )
};

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
        // Contextual registration mapping
        let roleParam = 'freelancer'; // default
        if (result === 'company_seller' || result === 'company_buyer') roleParam = 'company';
        if (result === 'buyer') roleParam = 'buyer';
        if (result === 'freelancer') roleParam = 'freelancer';
        
        navigate(`/register?role=${roleParam}`);
    };

    const renderRolesInfo = () => {
        switch (result) {
            case 'freelancer':
                return {
                    title: '¡Tu cuenta ideal es Freelancer!',
                    desc: 'Como profesional independiente o equipo pequeño, esta cuenta te permite ofrecer tus servicios, formar Coops (agencias de hasta 5 miembros), ganar XP y conseguir clientes de todo el mundo.',
                    icon: SVGIcons.rocket('#8b5cf6'),
                    color: '#8b5cf6'
                };
            case 'company_seller':
                return {
                    title: '¡Tu cuenta ideal es Empresa!',
                    desc: 'Al ser una agencia o consultora constituida, esta cuenta te permitirá vender servicios a gran escala, gestionar equipos más grandes (Coops de hasta 10 miembros) y acceder a herramientas avanzadas para organizar tu talento.',
                    icon: SVGIcons.briefcase('#10b981'),
                    color: '#10b981'
                };
            case 'buyer':
                return {
                    title: '¡Tu cuenta ideal es Cliente!',
                    desc: 'Perfecto para cuando necesitas algo puntual y rápido. Explorá nuestro catálogo para contratar servicios para tu hogar, recibir asesorías o resolver proyectos personales sin complicaciones.',
                    icon: SVGIcons.user('#f59e0b'),
                    color: '#f59e0b'
                };
            case 'company_buyer':
                return {
                    title: '¡Tu cuenta ideal es Empresa!',
                    desc: 'Si buscas talento a largo plazo o para tu negocio, esta cuenta te permitirá publicar ofertas de trabajo corporativo, gestionar contratos fijos y armar equipos dedicados para escalar tu empresa.',
                    icon: SVGIcons.building('#06b6d4'),
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
                padding: '1.5rem',
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
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeof icon === 'string' ? <span style={{ fontSize: '2.5rem' }}>{icon}</span> : icon}
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#fff', lineHeight: '1.4' }}>{title}</span>
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
                                        icon={SVGIcons.briefcase('#8b5cf6')} 
                                        title="Quiero ofrecer servicios y ganar dinero" 
                                        onClick={() => handleAnswerStep1('sell')} 
                                    />
                                    <OptionCard 
                                        icon={SVGIcons.shopping('#06b6d4')} 
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
                                        icon={SVGIcons.monitor('#8b5cf6')} 
                                        title="Soy profesional independiente o tengo un equipo pequeño" 
                                        onClick={() => handleAnswerStep2('freelancer')} 
                                    />
                                    <OptionCard 
                                        icon={SVGIcons.building('#10b981')} 
                                        title="Somos una agencia, consultora o empresa constituida" 
                                        onClick={() => handleAnswerStep2('company_seller')} 
                                    />
                                </div>
                            </div>
                        )}

                        {step === 2 && path === 'buy' && (
                            <div style={{ animation: 'slideInRight 0.3s ease-out forwards' }}>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', fontWeight: '400' }}>
                                    Perfecto. ¿Qué escala necesitas?
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <OptionCard 
                                        icon={SVGIcons.house('#f59e0b')} 
                                        title="Algo puntual y rápido para mí" 
                                        onClick={() => handleAnswerStep2('buyer')} 
                                    />
                                    <OptionCard 
                                        icon={SVGIcons.chart('#06b6d4')} 
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
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                                style={{ 
                                    padding: '1rem 2rem', 
                                    fontSize: '1.1rem', 
                                    borderRadius: '50px', 
                                    fontWeight: '600',
                                    background: 'transparent',
                                    border: '2px solid #8b5cf6',
                                    color: '#8b5cf6',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }} 
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
                                    boxShadow: `0 4px 15px ${resultData.color}40`,
                                    border: 'none',
                                    cursor: 'pointer'
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
