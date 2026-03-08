import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import confetti from 'canvas-confetti';

const BadgeNotificationContext = createContext();

export const useBadgeNotification = () => useContext(BadgeNotificationContext);

export const BadgeNotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [currentNotification, setCurrentNotification] = useState(null);

    // Evaluate badges to find new ones
    const checkBadgeUnlocks = useCallback(() => {
        if (!user) return;

        const isClient = user.role === 'buyer' || user.role === 'company';
        const allJobs = JSON.parse(localStorage.getItem('cooplance_db_jobs') || '[]');
        const myOrders = allJobs.filter(j => j.buyerId === user.id);
        const mySales = allJobs.filter(j => j.freelancerId === user.id);
        const myServices = JSON.parse(localStorage.getItem('cooplance_db_services') || '[]').filter(s => s.freelancerId === user.id);
        const myProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]').filter(p => p.clientId === user.id);

        const buyerFrequency = {};
        mySales.forEach(sale => {
            buyerFrequency[sale.buyerId] = (buyerFrequency[sale.buyerId] || 0) + 1;
        });
        const maxLoyalty = Object.values(buyerFrequency).length > 0 ? Math.max(...Object.values(buyerFrequency)) : 0;
        const uniqueFreelancersHired = new Set(myOrders.map(o => o.freelancerId)).size;

        const Icons = {
            Rocket: '🚀',
            Coin: '💰',
            Flame: '🔥',
            Star: '⭐',
            Lightning: '⚡',
            Trophy: '🏆',
            Crown: '👑',
            Hand: '👋',
            Handshake: '🤝',
            Check: '✅',
            Diamond: '💎',
            Eye: '👁️',
            Heart: '❤️'
        };

        const freelancerFamilies = [
            {
                familyId: 'sales', badges: [
                    { id: 'f_sales_1', title: 'Primera Venta', required: 1, icon: Icons.Coin },
                    { id: 'f_sales_10', title: '10 Ventas', required: 10, icon: Icons.Coin },
                    { id: 'f_sales_100', title: '100 Ventas', required: 100, icon: Icons.Coin },
                    { id: 'f_sales_1000', title: '1,000 Ventas', required: 1000, icon: Icons.Coin },
                    { id: 'f_sales_10000', title: '10,000 Ventas', required: 10000, icon: Icons.Coin },
                ], currentProgress: mySales.length
            },
            {
                familyId: 'levels', badges: [
                    { id: 'f_lvl_2', title: 'Aspirante', required: 2, icon: Icons.Flame },
                    { id: 'f_lvl_6', title: 'Profesional', required: 6, icon: Icons.Flame },
                    { id: 'f_lvl_8', title: 'Experto', required: 8, icon: Icons.Flame },
                    { id: 'f_lvl_9', title: 'Maestro', required: 9, icon: Icons.Flame },
                    { id: 'f_lvl_10', title: 'Leyenda Viva', required: 10, icon: Icons.Flame },
                ], currentProgress: user.level || 1
            },
            {
                familyId: 'services', badges: [
                    { id: 'f_srv_1', title: 'El Pionero', required: 1, icon: Icons.Rocket },
                    { id: 'f_srv_3', title: 'Emprendedor', required: 3, icon: Icons.Rocket },
                    { id: 'f_srv_5', title: 'Agencia', required: 5, icon: Icons.Rocket },
                ], currentProgress: myServices.length
            },
            {
                familyId: 'loyalty', badges: [
                    { id: 'f_loy_2', title: 'Cliente Frecuente', required: 2, icon: Icons.Heart },
                    { id: 'f_loy_5', title: 'Lealtad Pura', required: 5, icon: Icons.Heart },
                    { id: 'f_loy_10', title: 'Amigos Por Siempre', required: 10, icon: Icons.Heart },
                ], currentProgress: maxLoyalty
            },
            {
                familyId: 'speed', badges: [
                    { id: 'f_spd_1', title: 'Acelerador', required: 1, icon: Icons.Lightning },
                    { id: 'f_spd_5', title: 'Turbo', required: 5, icon: Icons.Lightning },
                    { id: 'f_spd_10', title: 'Rayo', required: 10, icon: Icons.Lightning },
                    { id: 'f_spd_100', title: 'Viajero en el Tiempo', required: 100, icon: Icons.Lightning },
                ], currentProgress: Math.floor(mySales.length / 3)
            },
            {
                familyId: 'reviews', badges: [
                    { id: 'f_rev_1', title: 'Buen Comienzo', required: 1, icon: Icons.Star },
                    { id: 'f_rev_5', title: 'Aprobado', required: 5, icon: Icons.Star },
                    { id: 'f_rev_10', title: 'Famoso', required: 10, icon: Icons.Star },
                    { id: 'f_rev_100', title: 'Ídolo de Masas', required: 100, icon: Icons.Star },
                ], currentProgress: user.reviewsCount || 0
            }
        ];

        const clientFamilies = [
            {
                familyId: 'purchases', badges: [
                    { id: 'c_pur_1', title: 'Primer Paso', required: 1, icon: Icons.Diamond },
                    { id: 'c_pur_10', title: 'Inversor', required: 10, icon: Icons.Diamond },
                    { id: 'c_pur_100', title: 'Magnate', required: 100, icon: Icons.Diamond },
                ], currentProgress: myOrders.length
            },
            {
                familyId: 'talent', badges: [
                    { id: 'c_tal_2', title: 'Ojo Crítico', required: 2, icon: Icons.Handshake },
                    { id: 'c_tal_5', title: 'Director de Casting', required: 5, icon: Icons.Handshake },
                    { id: 'c_tal_10', title: 'Red Global', required: 10, icon: Icons.Handshake },
                ], currentProgress: uniqueFreelancersHired
            },
            {
                familyId: 'projects', badges: [
                    { id: 'c_prj_1', title: 'Primera Idea', required: 1, icon: Icons.Eye },
                    { id: 'c_prj_3', title: 'Arquitecto', required: 3, icon: Icons.Eye },
                    { id: 'c_prj_5', title: 'Visionario', required: 5, icon: Icons.Eye },
                ], currentProgress: myProjects.length
            }
        ];

        const displayFamilies = isClient ? clientFamilies : freelancerFamilies;
        let currentlyUnlocked = [];

        displayFamilies.forEach(family => {
            family.badges.forEach((badge, index) => {
                if (family.currentProgress >= badge.required) {
                    const mappedIndex = Math.floor((index / Math.max(1, family.badges.length - 1)) * 4);
                    const tierColors = ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#b9f2ff'];

                    currentlyUnlocked.push({
                        ...badge,
                        tierColor: tierColors[Math.min(mappedIndex, 4)]
                    });
                }
            });
        });

        const cachedIdsStr = localStorage.getItem(`cooplance_badges_unlocked_${user.id}`);
        const cachedIds = cachedIdsStr ? JSON.parse(cachedIdsStr) : [];

        const newlyUnlocked = currentlyUnlocked.filter(b => !cachedIds.includes(b.id));

        if (newlyUnlocked.length > 0) {
            // Save new state
            const allIds = currentlyUnlocked.map(b => b.id);
            localStorage.setItem(`cooplance_badges_unlocked_${user.id}`, JSON.stringify(allIds));

            // Queue notifications
            setQueue(prev => [...prev, ...newlyUnlocked]);
        }
    }, [user]);

    // Check periodically
    useEffect(() => {
        checkBadgeUnlocks();
        const interval = setInterval(checkBadgeUnlocks, 3000);
        return () => clearInterval(interval);
    }, [checkBadgeUnlocks]);

    // Process Queue
    useEffect(() => {
        if (queue.length > 0 && !currentNotification) {
            const next = queue[0];
            setCurrentNotification(next);
            setQueue(prev => prev.slice(1));

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: [next.tierColor, '#ffffff', '#8b5cf6']
            });

            // Dismiss after 4 seconds
            setTimeout(() => {
                setCurrentNotification(null);
            }, 4500);
        }
    }, [queue, currentNotification]);

    return (
        <BadgeNotificationContext.Provider value={{}}>
            {children}
            {/* Notification UI */}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                pointerEvents: 'none'
            }}>
                {currentNotification && (
                    <div className="badge-notification-anim" style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${currentNotification.tierColor}`,
                        boxShadow: `0 10px 40px ${currentNotification.tierColor}40, 0 0 0 1px rgba(255,255,255,0.1) inset`,
                        padding: '1.2rem 1.5rem',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        animation: 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        maxWidth: '350px',
                        pointerEvents: 'auto',
                        cursor: 'default'
                    }}>
                        <div style={{
                            background: `linear-gradient(135deg, ${currentNotification.tierColor}, rgba(255,255,255,0.2))`,
                            padding: '1rem',
                            borderRadius: '50%',
                            fontSize: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 15px ${currentNotification.tierColor}60`
                        }}>
                            {currentNotification.icon}
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: currentNotification.tierColor }}>
                                ¡Insignia Desbloqueada!
                            </span>
                            <h4 style={{ margin: '0.2rem 0', fontSize: '1.2rem', color: '#fff' }}>{currentNotification.title}</h4>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .badge-notification-anim {
                    animation-fill-mode: forwards;
                }
            `}</style>
        </BadgeNotificationContext.Provider>
    );
};
