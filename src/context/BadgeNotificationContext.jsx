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
import { supabase } from '../lib/supabase';

const BadgeNotificationContext = createContext();

export const useBadgeNotification = () => useContext(BadgeNotificationContext);

const Icons = { Coin, Flame, Rocket, Heart, Lightning, Star, Diamond, Handshake, Eye };

export const BadgeNotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [currentNotification, setCurrentNotification] = useState(null);

    // Evaluate badges to find new ones
    const checkBadgeUnlocks = useCallback(async () => {
        if (!user || user.sync_error) return;

        console.log("[BadgeNotificationContext] Checking for new unlocks...");

        const isClient = user.role === 'buyer' || user.role === 'company';
        
        // 1. Fetch relevant data for precise metric calculation
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('client_id, provider_id, status')
            .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

        if (jobsError) {
            console.warn("[BadgeNotificationContext] Failed to fetch jobs for badge calculation:", jobsError);
            return;
        }

        const completedJobs = jobs.filter(j => j.status === 'completed');
        const mySales = completedJobs.filter(j => j.provider_id === user.id);
        const myOrders = completedJobs.filter(j => j.client_id === user.id);

        // 2. Calculate Loyalty (Symmetrical)
        // Frequency of hiring/being hired by the same person
        const interactions = {};
        completedJobs.forEach(job => {
            const targetId = job.client_id === user.id ? job.provider_id : job.client_id;
            interactions[targetId] = (interactions[targetId] || 0) + 1;
        });
        const maxLoyalty = Object.values(interactions).length > 0 ? Math.max(...Object.values(interactions)) : 0;

        // 3. Unique target count (Talent/Clients handled)
        const uniquePartners = new Set(interactions).size;

        const getProgressForFamily = (familyId) => {
            switch (familyId) {
                case 'sales': return mySales.length;
                case 'purchases': return myOrders.length;
                case 'levels': return user.level || 1;
                case 'reviews': return user.reviewsCount || 0; // Assuming this comes from profile
                case 'loyalty': return maxLoyalty;
                case 'services': return 0; // Requires separate services fetch if needed
                case 'talent': return uniquePartners;
                case 'projects': return 0; // Requires separate projects fetch if needed
                default: return 0;
            }
        };

        const getIconForFamily = (familyId) => {
            const map = { sales: Icons.Coin, purchases: Icons.Coin, levels: Icons.Flame, services: Icons.Rocket, loyalty: Icons.Heart, speed: Icons.Lightning, reviews: Icons.Star, talent: Icons.Handshake, projects: Icons.Eye };
            return map[familyId] || Icons.Star;
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

        // 4. Persistence Check (DB Source of Truth)
        const gamification = user.gamification || { badges: [], vacation: { active: false, credits: 4 } };
        const dbBadgeIds = gamification.badges || [];
        
        // newlyUnlocked are those we merit NOW but aren't in the DB IDs list
        const newlyUnlocked = currentlyUnlocked.filter(b => !dbBadgeIds.includes(b.id));

        if (newlyUnlocked.length > 0) {
            console.log(`[BadgeNotificationContext] ${newlyUnlocked.length} NEW badges found! Syncing to DB...`);
            
            // Update User Profile gamification (DB Persistence)
            const updatedBadges = Array.from(new Set([...dbBadgeIds, ...currentlyUnlocked.map(b => b.id)]));
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ gamification: { ...gamification, badges: updatedBadges } })
                .eq('id', user.id);

            if (updateError) {
                console.error("[BadgeNotificationContext] Failed to sync badges to DB:", updateError);
                return;
            }

            // Queue notifications
            setQueue(prev => [...prev, ...newlyUnlocked]);
        }
    }, [user]);

    // Migration Effect: Silently move localStorage badges to DB if DB is empty but LS has data
    useEffect(() => {
        if (!user || user.sync_error) return;
        
        const migrateLegacyBadges = async () => {
            const lsKey = `cooplance_badges_unlocked_${user.id}`;
            const lsData = localStorage.getItem(lsKey);
            if (!lsData) return;

            const lsIds = JSON.parse(lsData);
            const dbIds = user.gamification?.badges || [];
            
            // If LS has something DB doesn't, MERGE
            const needsMigration = lsIds.some(id => !dbIds.includes(id));
            if (needsMigration) {
                console.log("[BadgeNotificationContext] Migrating legacy badges from LocalStorage to DB...");
                const mergedIds = Array.from(new Set([...dbIds, ...lsIds]));
                const gamification = user.gamification || { badges: [], vacation: { active: false, credits: 4 } };
                
                await supabase.from('profiles').update({ 
                    gamification: { ...gamification, badges: mergedIds } 
                }).eq('id', user.id);
                
                // Clear LS once migrated
                localStorage.removeItem(lsKey);
            }
        };
        
        migrateLegacyBadges();
    }, [user?.id, user?.gamification?.badges]);

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
