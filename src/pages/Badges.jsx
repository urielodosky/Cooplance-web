import React from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Badges = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando insignias...</div>;
    }

    const isClient = user.role === 'buyer' || user.role === 'company';
    const allJobs = JSON.parse(localStorage.getItem('cooplance_db_jobs') || '[]');
    const myOrders = allJobs.filter(j => j.buyerId === user.id);
    const mySales = allJobs.filter(j => j.freelancerId === user.id);
    const myServices = JSON.parse(localStorage.getItem('cooplance_db_services') || '[]').filter(s => s.freelancerId === user.id);
    const myProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]').filter(p => p.clientId === user.id);

    // Calculate loyalty (max purchases by a single buyer)
    const buyerFrequency = {};
    mySales.forEach(sale => {
        buyerFrequency[sale.buyerId] = (buyerFrequency[sale.buyerId] || 0) + 1;
    });
    const maxLoyalty = Object.values(buyerFrequency).length > 0 ? Math.max(...Object.values(buyerFrequency)) : 0;

    // Calculate unique freelancers hired
    const uniqueFreelancersHired = new Set(myOrders.map(o => o.freelancerId)).size;

    const Icons = {
        Sales: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>,
        Level: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>,
        Service: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
        Loyalty: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>,
        Speed: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
        Review: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
        Handshake: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 11-4-7" /><path d="M17 11v3" /><path d="m15 10-5 5" /><path d="M7 11l4-7" /><path d="M7 11v3" /><path d="m9 10 5 5" /><path d="M16 21H8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2z" /></svg>,
        Eye: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
        Lock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    };

    // Tier colors for progression (Bronze, Silver, Gold, Platinum, Diamond)
    const tierStyles = [
        { color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' }, // Tier 0 (Bronze)
        { color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.5)' }, // Tier 1 (Silver)
        { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)' },   // Tier 2 (Gold)
        { color: '#e5e4e2', glow: 'rgba(229, 228, 226, 0.8)' }, // Tier 3 (Platinum)
        { color: '#b9f2ff', glow: 'rgba(185, 242, 255, 1)' }    // Tier 4 (Diamond)
    ];

    const getTierStyle = (index, maxTiers) => {
        // Map index to a 0-4 range based on maxTiers to pick the right color
        const mappedIndex = Math.floor((index / Math.max(1, maxTiers - 1)) * 4);
        return tierStyles[Math.min(mappedIndex, 4)];
    };

    const freelancerFamilies = [
        {
            familyId: 'sales',
            title: 'Imperio de Ventas',
            description: 'Vende tus servicios y completa proyectos.',
            icon: Icons.Sales,
            badges: [
                { title: 'Primera Venta', desc: '¡Rompiste el hielo!', required: 1 },
                { title: '10 Ventas', desc: 'Negocio en marcha.', required: 10 },
                { title: '100 Ventas', desc: 'Vendedor consolidado.', required: 100 },
                { title: '1,000 Ventas', desc: 'Una verdadera máquina.', required: 1000 },
                { title: '10,000 Ventas', desc: 'Líder del mercado global.', required: 10000 },
            ],
            currentProgress: mySales.length
        },
        {
            familyId: 'levels',
            title: 'Ascenso de Poder',
            description: 'Sube de nivel ganando experiencia (XP).',
            icon: Icons.Level,
            badges: [
                { title: 'Aspirante', desc: 'Alcanza el Nivel 2.', required: 2 },
                { title: 'Profesional', desc: 'Alcanza el Nivel 6.', required: 6 },
                { title: 'Experto', desc: 'Alcanza el Nivel 8.', required: 8 },
                { title: 'Maestro', desc: 'Alcanza el Nivel 9.', required: 9 },
                { title: 'Leyenda Viva', desc: 'Alcanza el máximo Nivel 10.', required: 10 },
            ],
            currentProgress: user.level || 1
        },
        {
            familyId: 'services',
            title: 'Expansión de Ofertas',
            description: 'Crea nuevos servicios para tus clientes.',
            icon: Icons.Service,
            badges: [
                { title: 'El Pionero', desc: 'Crea tu primer servicio.', required: 1 },
                { title: 'Emprendedor', desc: 'Crea 3 servicios distintos.', required: 3 },
                { title: 'Agencia', desc: 'Ofrece 5 servicios increíbles.', required: 5 },
            ],
            currentProgress: myServices.length
        },
        {
            familyId: 'loyalty',
            title: 'Vínculos Eternos',
            description: 'Logra que el mismo cliente vuelva por más.',
            icon: Icons.Loyalty,
            badges: [
                { title: 'Cliente Frecuente', desc: 'Un cliente te compró por 2da vez.', required: 2 },
                { title: 'Lealtad Pura', desc: 'El mismo cliente volvió 5 veces.', required: 5 },
                { title: 'Amigos Por Siempre', desc: 'Hiciste 10 trabajos al mismo cliente.', required: 10 },
            ],
            currentProgress: maxLoyalty
        },
        {
            familyId: 'speed',
            title: 'Flash Digital',
            description: 'Entrega trabajos antes de la fecha límite.',
            icon: Icons.Speed,
            badges: [
                { title: 'Acelerador', desc: '1 entrega anticipada.', required: 1 },
                { title: 'Turbo', desc: '5 entregas veloces.', required: 5 },
                { title: 'Rayo', desc: '10 entregas relámpago.', required: 10 },
                { title: 'Viajero en el Tiempo', desc: '100 entregas antes de tiempo.', required: 100 },
            ],
            currentProgress: Math.floor(mySales.length / 3) // Mock calculation for demo
        },
        {
            familyId: 'reviews',
            title: 'Aclamación Pública',
            description: 'Obtén valoraciones positivas (5 estrellas).',
            icon: Icons.Review,
            badges: [
                { title: 'Buen Comienzo', desc: 'Tu primera reseña positiva.', required: 1 },
                { title: 'Aprobado', desc: '5 reseñas de cinco estrellas.', required: 5 },
                { title: 'Famoso', desc: '10 valoraciones perfectas.', required: 10 },
                { title: 'Ídolo de Masas', desc: '100 reseñas estelares.', required: 100 },
            ],
            currentProgress: user.reviewsCount || 0
        }
    ];

    const clientFamilies = [
        {
            familyId: 'purchases',
            title: 'Motor de la Economía',
            description: 'Invierte en proyectos y servicios.',
            icon: Icons.Sales,
            badges: [
                { title: 'Primer Paso', desc: 'Realiza tu primera compra.', required: 1 },
                { title: 'Inversor', desc: '10 compras realizadas.', required: 10 },
                { title: 'Magnate', desc: '100 compras impulsando talento.', required: 100 },
            ],
            currentProgress: myOrders.length
        },
        {
            familyId: 'talent',
            title: 'Cazatalentos',
            description: 'Contrata a diferentes freelancers.',
            icon: Icons.Handshake,
            badges: [
                { title: 'Ojo Crítico', desc: 'Trabaja con 2 freelancers distintos.', required: 2 },
                { title: 'Director de Casting', desc: 'Contrata a 5 expertos diferentes.', required: 5 },
                { title: 'Red Global', desc: 'Trabaja con 10 talentos únicos.', required: 10 },
            ],
            currentProgress: uniqueFreelancersHired
        },
        {
            familyId: 'projects',
            title: 'Mente Visionaria',
            description: 'Publica proyectos personalizados.',
            icon: Icons.Eye,
            badges: [
                { title: 'Primera Idea', desc: 'Publica 1 proyecto.', required: 1 },
                { title: 'Arquitecto', desc: 'Crea 3 proyectos.', required: 3 },
                { title: 'Visionario', desc: 'Da vida a 5 proyectos distintos.', required: 5 },
            ],
            currentProgress: myProjects.length
        }
    ];

    const displayFamilies = isClient ? clientFamilies : freelancerFamilies;

    // Calculate total unlocked badges
    let totalUnlocked = 0;
    let totalBadges = 0;

    displayFamilies.forEach(family => {
        family.badges.forEach(badge => {
            totalBadges++;
            if (family.currentProgress >= badge.required) {
                totalUnlocked++;
            }
        });
    });

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button className="btn-icon-soft" onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.8rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            Familias de Insignias
                        </h1>
                        <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)' }}>Progresa en cada categoría para desbloquear variantes más brillantes.</p>
                    </div>
                </div>

                {/* Global Stats Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)', padding: '0.8rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Total Desbloqueadas</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{totalUnlocked}</span>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {totalBadges}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                {displayFamilies.map((family, fIndex) => (
                    <section key={family.familyId}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div style={{ color: 'var(--primary)', background: 'rgba(139, 92, 246, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                                {family.icon}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>{family.title}</h2>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{family.description} • (Progreso: {family.currentProgress})</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                            {family.badges.map((badge, bIndex) => {
                                const isAchieved = family.currentProgress >= badge.required;
                                const tierStyle = getTierStyle(bIndex, family.badges.length);

                                return (
                                    <div key={bIndex} className="glass" style={{
                                        padding: '1.5rem 1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        borderRadius: '16px',
                                        background: isAchieved ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                                        border: isAchieved ? `1px solid ${tierStyle.color}` : '1px dashed var(--border)',
                                        boxShadow: isAchieved ? `0 4px 20px ${tierStyle.glow}` : 'none',
                                        textAlign: 'center',
                                        opacity: isAchieved ? 1 : 0.5,
                                        filter: isAchieved ? 'none' : 'grayscale(100%)',
                                        position: 'relative',
                                        transition: 'all 0.3s ease',
                                        transform: isAchieved ? 'scale(1)' : 'scale(0.95)'
                                    }} onMouseOver={e => {
                                        if (isAchieved) {
                                            e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = `0 8px 30px ${tierStyle.glow}`;
                                        }
                                    }} onMouseOut={e => {
                                        if (isAchieved) {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = `0 4px 20px ${tierStyle.glow}`;
                                        }
                                    }}>
                                        {!isAchieved && (
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--text-muted)' }}>
                                                {Icons.Lock}
                                            </div>
                                        )}
                                        <div style={{
                                            color: isAchieved ? '#111' : 'var(--text-muted)',
                                            background: isAchieved ? tierStyle.color : 'var(--bg-dark)',
                                            padding: '1rem',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isAchieved ? `0 0 15px ${tierStyle.glow}` : 'none',
                                            border: isAchieved ? 'none' : '2px solid var(--border)'
                                        }}>
                                            {family.icon}
                                        </div>
                                        <div>
                                            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', color: isAchieved ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 'bold' }}>{badge.title}</h5>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{badge.desc}</p>
                                        </div>
                                        <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: isAchieved ? tierStyle.color : 'var(--text-muted)', fontWeight: 'bold', paddingTop: '0.5rem' }}>
                                            Requiere: {badge.required}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default Badges;
