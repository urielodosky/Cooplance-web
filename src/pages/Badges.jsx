import React from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useNavigate } from 'react-router-dom';

import { BADGE_FAMILIES, CLIENT_BADGE_FAMILIES } from '../data/badgeDefinitions';

const Badges = () => {
    const { user } = useAuth();
    const { jobs } = useJobs();
    const navigate = useNavigate();

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

    const getProgressForFamily = (familyId) => {
        switch(familyId) {
            case 'sales': return mySales.length;
            case 'purchases': return myOrders.length;
            case 'levels': return user.level || 1;
            case 'loyalty': return maxLoyalty;
            case 'reviews': return user.reviewsCount || 0;
            case 'talent': return uniquePartners;
            case 'services': return 0; // Handled dynamically in Dashboard
            case 'projects': return 0; // Handled dynamically in Dashboard
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
