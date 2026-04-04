import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { BADGE_FAMILIES, CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';
import {
    CreditCard as Coin,
    Zap as Flame,
    Rocket,
    Heart,
    Zap as Lightning,
    Star,
    Diamond,
    Users as Handshake,
    Eye
} from 'lucide-react';

const BadgeNotificationContext = createContext();

export const useBadgeNotification = () => useContext(BadgeNotificationContext);

const Icons = { Coin, Flame, Rocket, Heart, Lightning, Star, Diamond, Handshake, Eye };

export const BadgeNotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [currentNotification, setCurrentNotification] = useState(null);

    // Evaluate badges to find new ones
    const checkBadgeUnlocks = useCallback(() => {
        if (!user) return;

        const isClient = user.role === 'buyer' || user.role === 'company';

        // MIGRATION NOTE: Stats should eventually be fetched from Supabase via a dedicated hook.
        // For now, we skip localStorage and use the user profile level and basic counts.
        const userLevel = user.level || 1;
        
        const getProgressForFamily = (familyId) => {
            switch (familyId) {
                case 'levels': return userLevel;
                case 'reviews': return user.reviews_count || 0;
                // Other families (sales, loyalty, etc.) will stay at 0 until 
                // we implement the global stats aggregator.
                default: return 0;
            }
        };

        const getIconForFamily = (familyId) => {
            switch (familyId) {
                case 'sales': return Icons.Coin;
                case 'levels': return Icons.Flame;
                case 'services': return Icons.Rocket;
                case 'loyalty': return Icons.Heart;
                case 'speed': return Icons.Lightning;
                case 'reviews': return Icons.Star;
                case 'purchases': return Icons.Diamond;
                case 'talent': return Icons.Handshake;
                case 'projects': return Icons.Eye;
                default: return Icons.Star;
            }
        };

        const displayFamilies = isClient ? CLIENT_BADGE_FAMILIES : BADGE_FAMILIES;
        let currentlyUnlocked = [];

        displayFamilies.forEach(family => {
            const familyProgress = getProgressForFamily(family.familyId);
            family.badges.forEach((badge, index) => {
                if (familyProgress >= badge.required) {
                    const mappedIndex = Math.floor((index / Math.max(1, family.badges.length - 1)) * 4);
                    const tierColors = ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#b9f2ff'];

                    currentlyUnlocked.push({
                        ...badge,
                        icon: getIconForFamily(family.familyId),
                        tierColor: tierColors[Math.min(mappedIndex, 4)]
                    });
                }
            });
        });

        const cachedIdsStr = localStorage.getItem(`cooplance_badges_unlocked_${user.id}`);
        const cachedIds = cachedIdsStr ? JSON.parse(cachedIdsStr) : [];

        const newlyUnlocked = currentlyUnlocked.filter(b => !cachedIds.includes(b.id));

        if (newlyUnlocked.length > 0) {
            // Save new state: MERGE with existing to ensure permanence even if progress decays
            const updatedAllIds = Array.from(new Set([...cachedIds, ...currentlyUnlocked.map(b => b.id)]));
            localStorage.setItem(`cooplance_badges_unlocked_${user.id}`, JSON.stringify(updatedAllIds));

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

            // Trigger notification (Confetti disabled as requested)

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
                bottom: '3rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
                width: '100%',
                maxWidth: '400px',
                padding: '0 1.5rem'
            }}>
                {currentNotification && (
                    <div className="badge-notification-anim" style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${currentNotification.tierColor}60`,
                        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 20px ${currentNotification.tierColor}30`,
                        padding: '1.5rem 2rem',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        animation: 'slideUp 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards',
                        pointerEvents: 'auto',
                        cursor: 'default',
                        width: 'auto',
                        minWidth: '280px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            background: `linear-gradient(135deg, ${currentNotification.tierColor}, ${currentNotification.tierColor}88)`,
                            padding: '1.2rem',
                            borderRadius: '50%',
                            fontSize: '2.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 8px 25px ${currentNotification.tierColor}80`,
                            color: '#fff'
                        }}>
                            {React.createElement(currentNotification.icon, { size: 40, strokeWidth: 2.2 })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '3px',
                                color: currentNotification.tierColor,
                                textShadow: `0 0 10px ${currentNotification.tierColor}60`
                            }}>
                                ¡Insignia Desbloqueada!
                            </span>
                            <h4 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', fontWeight: '700' }}>
                                {currentNotification.title}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                {currentNotification.description || '¡Excelente trabajo!'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(120%) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .badge-notification-anim {
                    transition: all 0.3s ease;
                }
                .badge-notification-anim:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1) inset;
                }
            `}</style>
        </BadgeNotificationContext.Provider>
    );
};
