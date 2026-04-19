import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    CreditCard as Coin, 
    Zap as Flame, 
    Rocket, 
    Heart, 
    Zap as Lightning, 
    Star, 
    Diamond, 
    Users as Handshake, 
    Eye,
    Lock
} from 'lucide-react';

import { BADGE_FAMILIES, CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';

const Badges = () => {
    const { user } = useAuth();
    const { jobs } = useJobs();
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ services: 0, projects: 0 });
    const [loadingCounts, setLoadingCounts] = useState(true);

    // Fetch dynamic metrics not in contexts
    useEffect(() => {
        if (!user) return;
        const fetchMetrics = async () => {
            try {
                const [servicesRes, projectsRes] = await Promise.all([
                    supabase.from('services').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
                    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('client_id', user.id)
                ]);
                setCounts({
                    services: servicesRes.count || 0,
                    projects: projectsRes.count || 0
                });
            } catch (err) {
                console.error("Error fetching badge metrics:", err);
            } finally {
                setLoadingCounts(false);
            }
        };
        fetchMetrics();
    }, [user?.id]);

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando insignias...</div>;
    }

    const isClient = user.role === 'buyer' || user.role === 'company';
    
    // Use jobs from context instead of localStorage
    const completedJobs = (jobs || []).filter(j => j.status === 'completed');
    const mySales = completedJobs.filter(j => j.freelancerId === user.id);
    const myOrders = completedJobs.filter(j => j.buyerId === user.id);

    // DB Source of Truth for unlocked badges
    const savedUnlockedIds = user.gamification?.badges || [];

    // Calculate loyalty (max purchases by a single buyer or from a single talent)
    const interactions = {};
    completedJobs.forEach(job => {
        const targetId = job.buyerId === user.id ? job.freelancerId : job.buyerId;
        interactions[targetId] = (interactions[targetId] || 0) + 1;
    });
    const maxLoyalty = Object.values(interactions).length > 0 ? Math.max(...Object.values(interactions)) : 0;

    // Calculate unique partners (Talents hired / Clients served)
    const uniquePartners = new Set(Object.keys(interactions)).size;

    const Icons = {
        Sales: <Coin size={24} />,
        Level: <Flame size={24} />,
        Service: <Rocket size={24} />,
        Loyalty: <Heart size={24} />,
        Speed: <Lightning size={24} />,
        Review: <Star size={24} />,
        Handshake: <Handshake size={24} />,
        Eye: <Eye size={24} />,
        Lock: <Lock size={18} />
    };

    const getProgressForFamily = (familyId) => {
        switch(familyId) {
            case 'sales': return mySales.length;
            case 'purchases': return myOrders.length;
            case 'levels': return user.level || 1;
            case 'loyalty': return maxLoyalty;
            case 'reviews': return user.reviewsCount || 0;
            case 'talent': return uniquePartners;
            case 'services': return counts.services;
            case 'projects': return counts.projects;
            default: return 0;
        }
    };

    const getIconForFamily = (familyId) => {
        switch(familyId) {
            case 'sales': return Icons.Sales;
            case 'purchases': return Icons.Sales;
            case 'levels': return Icons.Level;
            case 'services': return Icons.Service;
            case 'loyalty': return Icons.Loyalty;
            case 'speed': return Icons.Speed;
            case 'reviews': return Icons.Review;
            case 'talent': return Icons.Handshake;
            case 'projects': return Icons.Eye;
            default: return Icons.Review;
        }
    };

    const displayFamiliesRaw = isClient ? CLIENT_BADGE_FAMILIES : BADGE_FAMILIES;
    const displayFamilies = displayFamiliesRaw.map(family => ({
        ...family,
        icon: getIconForFamily(family.familyId),
        currentProgress: getProgressForFamily(family.familyId)
    }));

    // Tier colors for progression (Bronze, Silver, Gold, Platinum, Diamond)
    const tierStyles = [
        { color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' }, // Tier 0 (Bronze)
        { color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.5)' }, // Tier 1 (Silver)
        { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)' },   // Tier 2 (Gold)
        { color: '#e5e4e2', glow: 'rgba(229, 228, 226, 0.8)' }, // Tier 3 (Platinum)
        { color: '#b9f2ff', glow: 'rgba(185, 242, 255, 1)' }    // Tier 4 (Diamond)
    ];

    const getTierStyle = (index, maxTiers) => {
        const mappedIndex = Math.floor((index / Math.max(1, maxTiers - 1)) * 4);
        return tierStyles[Math.min(mappedIndex, 4)];
    };

    let totalUnlocked = 0;
    let totalBadges = 0;

    displayFamilies.forEach(family => {
        family.badges.forEach(badge => {
            totalBadges++;
            const isAchieved = (family.currentProgress >= badge.required) || savedUnlockedIds.includes(badge.id);
            if (isAchieved) totalUnlocked++;
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
                            <div style={{ color: 'var(--primary)', background: 'rgba(139, 92, 246, 0.1)', padding: '0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {family.icon}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>{family.title}</h2>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{family.description} • (Progreso: {family.currentProgress}) {loadingCounts && (family.familyId === 'services' || family.familyId === 'projects') && <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}> - Sincronizando...</span>}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                            {family.badges.map((badge, bIndex) => {
                                const isAchieved = (family.currentProgress >= badge.required) || savedUnlockedIds.includes(badge.id);
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

