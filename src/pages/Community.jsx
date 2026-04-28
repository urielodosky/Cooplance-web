import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { Star, MoreVertical } from 'lucide-react';
import { useActionModal } from '../context/ActionModalContext';
import ReportModal from '../components/common/ReportModal';

// Helper for Role Translation
const translateRole = (role) => {
    const roles = {
        'freelancer': 'Freelancer',
        'client': 'Cliente',
        'buyer': 'Cliente',
        'company': 'Empresa',
        'coop': 'Cooperativa'
    };
    return roles[role.toLowerCase()] || role.toUpperCase();
};

// Reusable User Card
const UserCard = ({ profile, teams = [], navigate }) => {
    const { user: currentUser } = useAuth();
    const { showActionModal } = useActionModal();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [hasBlocked, setHasBlocked] = useState(false);

    useEffect(() => {
        const checkBlock = async () => {
            if (currentUser && currentUser.id !== profile.id) {
                const { data } = await supabase
                    .from('user_blocks')
                    .select('id')
                    .eq('blocker_id', currentUser.id)
                    .eq('blocked_id', profile.id)
                    .single();
                setHasBlocked(!!data);
            }
        };
        checkBlock();
    }, [currentUser, profile.id]);

    const checkOnlineStatus = () => {
        if (!profile) return false;
        
        // El propio usuario siempre está en línea para sí mismo
        if (currentUser && String(currentUser.id) === String(profile.id)) return true;
        
        if (!profile.last_seen) return false;
        
        try {
            const lastSeen = new Date(profile.last_seen);
            const now = new Date();
            // Diferencia absoluta para manejar desfases de reloj entre cliente y servidor
            const diffInMinutes = Math.abs(now - lastSeen) / (1000 * 60);
            
            // Si estuvo activo hace menos de 5 min
            return diffInMinutes < 5;
        } catch (e) {
            return false;
        }
    };

    const isOnline = checkOnlineStatus();
    const isOwnProfile = currentUser?.id === profile.id;

    return (
        <div className="glass card-hover" style={{
            padding: '1.5rem',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <div 
                        onClick={() => navigate(profile.role === 'client' ? `/client/${profile.id}` : `/profile/${profile.id}`)}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            background: 'var(--bg-card-hover)',
                            border: '2px solid var(--border)',
                            cursor: 'pointer'
                        }}
                    >
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                                {profile.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {isOnline && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '3px solid var(--bg-card)',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                        }}></div>
                    )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.username}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>@{profile.username}</span>
                </div>
                
                <div style={{ position: 'relative' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
                    >
                        <MoreVertical size={20} />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10 }} />
                            <div className="glass" style={{
                                position: 'absolute', top: '100%', right: 0, zIndex: 11,
                                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
                                minWidth: '150px', padding: '5px', boxShadow: 'var(--shadow-lg)'
                            }}>
                                {!isOwnProfile ? (
                                    <>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                                if (!currentUser) return;
                                                const { blockUser, unblockUser } = await import('../services/safetyService');
                                                if (hasBlocked) {
                                                    await unblockUser(currentUser.id, profile.id);
                                                    setHasBlocked(false);
                                                    showActionModal({ title: 'Desbloqueado', message: 'Usuario desbloqueado.', severity: 'success' });
                                                } else {
                                                    await blockUser(currentUser.id, profile.id);
                                                    setHasBlocked(true);
                                                    showActionModal({ title: 'Bloqueado', message: 'Usuario bloqueado.', severity: 'success' });
                                                }
                                            }}
                                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: hasBlocked ? 'var(--primary)' : '#ef4444', fontWeight: '600', cursor: 'pointer', borderRadius: '8px' }}
                                        >
                                            {hasBlocked ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsReportModalOpen(true); }}
                                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer', borderRadius: '8px' }}
                                        >
                                            Reportar
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => navigate('/settings')}
                                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer', borderRadius: '8px' }}
                                    >
                                        Configuración
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportedId={profile.id}
                reportedName={profile.username}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    textTransform: 'uppercase'
                }}>{translateRole(profile.role || 'freelancer')}</span>
                
                {profile.level && (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        textTransform: 'uppercase'
                    }}>Nivel {profile.level}</span>
                )}
            </div>

            <p style={{ 
                margin: 0, 
                fontSize: '0.9rem', 
                color: 'var(--text-secondary)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.5',
                minHeight: '2.7rem'
            }}>
                {profile.bio || "Explorando nuevas fronteras en la economía colaborativa de Cooplance."}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: '800' }}>★ {Number(profile.rating || 0).toFixed(1)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({profile.reviews_count || 0})</span>
                </div>
                <button 
                    onClick={() => navigate(profile.role === 'client' ? `/client/${profile.id}` : `/profile/${profile.id}`)}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.85rem' }}
                >
                    Ver Perfil
                </button>
            </div>

            {/* Team/Coop Link Badge */}
            {teams.length > 0 && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
                    borderRadius: '12px',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                }} onClick={() => navigate(`/coop/${teams[0].id}`)}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {teams[0].name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d97706' }}>Miembro de {teams[0].name}</span>
                </div>
            )}
        </div>
    );
};

// Reusable Team Card (Coop)
const TeamCard = ({ team, navigate }) => {
    return (
        <div className="glass card-hover" style={{
            padding: '1.5rem',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            background: 'linear-gradient(135deg, var(--bg-card), rgba(251, 191, 36, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%'
        }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div 
                    onClick={() => navigate(`/coop/${team.id}`)}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                    }}
                >
                    {team.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{team.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '700' }}>Cooperativa (Coop)</span>
                </div>
            </div>

            <p style={{ 
                margin: 0, 
                fontSize: '0.9rem', 
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                minHeight: '2.7rem'
            }}>
                {team.description || "Unidos por el talento y la colaboración mutua en Cooplance."}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {team.members_count || 0} Miembros activos
                </span>
                <button 
                    onClick={() => navigate(`/coop/${team.id}`)}
                    className="btn-primary"
                    style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem',
                        background: '#fbbf24',
                        border: 'none'
                    }}
                >
                    Ver Coop
                </button>
            </div>
        </div>
    );
};

const Community = () => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamMemberships, setTeamMemberships] = useState({});
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState(0);
    const [levelFilter, setLevelFilter] = useState(0);

    // Custom Select State
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const roles = [
        { value: 'all', label: 'Todos los Roles' },
        { value: 'freelancer', label: 'Freelancer' },
        { value: 'client', label: 'Cliente' },
        { value: 'company', label: 'Empresa' },
        { value: 'coop', label: 'Cooperativa (Coop)' }
    ];

    useEffect(() => {
        const fetchCommunityData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Profiles with ratings and counts
                let query = supabase.from('profiles').select(`
                    *,
                    reviews:service_reviews!target_id(rating)
                `);

                if (searchTerm) {
                    query = query.ilike('username', `%${searchTerm}%`);
                }

                if (roleFilter !== 'all' && roleFilter !== 'coop') {
                    query = query.eq('role', roleFilter);
                }

                if (levelFilter > 0) {
                    query = query.eq('level', levelFilter);
                }

                const { data: rawProfiles, error: profilesError } = await query.limit(50);
                if (profilesError) throw profilesError;

                // Process ratings and counts in JS to ensure accuracy
                let profilesData = (rawProfiles || []).map(p => {
                    const ratings = p.reviews?.map(r => r.rating) || [];
                    const count = ratings.length;
                    const avg = count > 0 ? (ratings.reduce((a, b) => a + b, 0) / count).toFixed(1) : "0.0";
                    return {
                        ...p,
                        reviews_count: count,
                        rating: parseFloat(avg)
                    };
                });

                // Apply Rating Filter client-side for precision
                if (ratingFilter > 0) {
                    profilesData = profilesData.filter(p => p.rating >= ratingFilter);
                }

                // 2. Fetch Teams
                let teamsQuery = supabase.from('coops').select('*');
                if (searchTerm) {
                    teamsQuery = teamsQuery.ilike('name', `%${searchTerm}%`);
                }
                const { data: teamsData, error: teamsError } = await teamsQuery.limit(20);
                if (teamsError) throw teamsError;

                // 3. Fetch Team Memberships
                const profileIds = profilesData.map(p => p.id);
                if (profileIds.length > 0) {
                    const { data: membershipData } = await supabase
                        .from('coop_members')
                        .select('coop_id, user_id, coops(id, name)')
                        .in('user_id', profileIds);

                    const membershipMap = {};
                    membershipData?.forEach(m => {
                        if (!membershipMap[m.user_id]) membershipMap[m.user_id] = [];
                        membershipMap[m.user_id].push(m.coops);
                    });
                    setTeamMemberships(membershipMap);

                    if (searchTerm && profilesData.length > 0) {
                        const extraTeamIds = membershipData?.map(m => m.coop_id) || [];
                        if (extraTeamIds.length > 0) {
                            const { data: extraTeams } = await supabase.from('coops').select('*').in('id', extraTeamIds);
                            const mergedTeams = [...(teamsData || []), ...(extraTeams || [])];
                            const uniqueTeams = Array.from(new Set(mergedTeams.map(t => t.id))).map(id => mergedTeams.find(t => t.id === id));
                            setTeams(uniqueTeams);
                        } else {
                            setTeams(teamsData || []);
                        }
                    } else {
                        setTeams(teamsData || []);
                    }
                } else {
                    setTeams(teamsData || []);
                }

                setProfiles(profilesData || []);
            } catch (err) {
                console.error('[Community] Critical fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchCommunityData, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, roleFilter, ratingFilter, levelFilter]);

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-1.5px' }}>
                    Comunidad <span style={{ color: 'var(--primary)' }}>Cooplance</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                    Encuentra talento, conecta con cooperativas y descubre nuevas oportunidades de colaboración.
                </p>
            </div>

            {/* Search & Filter Section */}
            <div style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
                <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    background: 'var(--bg-card)', 
                    padding: '0.75rem', 
                    borderRadius: '24px', 
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    alignItems: 'center'
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <svg style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        <input 
                            type="text"
                            placeholder="Buscar por @usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3.5rem',
                                borderRadius: '16px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '16px',
                            background: showFilters ? 'var(--primary)' : 'var(--bg-card-hover)',
                            color: showFilters ? 'white' : 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 12h6"/></svg>
                        Filtros
                    </button>
                </div>

                {showFilters && (
                    <div className="glass" style={{
                        marginTop: '1rem',
                        padding: '2rem',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '2rem',
                        animation: 'slideDown 0.3s ease-out',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        {/* Custom Role Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rol</label>
                            <div 
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                style={{
                                    padding: '0.85rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card-hover)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                {roles.find(r => r.value === roleFilter)?.label}
                                <svg style={{ transform: showRoleMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                            
                            {showRoleMenu && (
                                <div className="glass" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '0.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    boxShadow: 'var(--shadow-lg)',
                                    overflow: 'hidden',
                                    zIndex: 20
                                }}>
                                    {roles.map(r => (
                                        <div 
                                            key={r.value}
                                            onClick={() => {
                                                setRoleFilter(r.value);
                                                setShowRoleMenu(false);
                                            }}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                background: roleFilter === r.value ? 'var(--primary)' : 'transparent',
                                                color: roleFilter === r.value ? 'white' : 'var(--text-primary)',
                                                fontWeight: '600',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { if(roleFilter !== r.value) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                                            onMouseLeave={(e) => { if(roleFilter !== r.value) e.currentTarget.style.background = 'transparent' }}
                                        >
                                            {r.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Calificación</label>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <div 
                                        key={star}
                                        onClick={() => setRatingFilter(ratingFilter === star ? 0 : star)}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill={ratingFilter >= star ? "#fbbf24" : "none"} stroke={ratingFilter >= star ? "#fbbf24" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nivel ({levelFilter === 0 ? 'Cualquiera' : levelFilter})</label>
                            <div style={{ padding: '0' }}>
                                <input 
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(parseInt(e.target.value))}
                                    className="premium-slider"
                                    style={{ 
                                        width: '100%', 
                                        cursor: 'pointer', 
                                        appearance: 'none',
                                        height: '6px',
                                        borderRadius: '10px',
                                        background: `linear-gradient(to right, var(--primary) ${(levelFilter / 10) * 100}%, var(--border) ${(levelFilter / 10) * 100}%)`,
                                        outline: 'none',
                                        margin: 0,
                                        padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .premium-slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #fff;
                    border: 3px solid var(--primary);
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    transition: transform 0.1s ease;
                }
                .premium-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.15);
                }
                .premium-slider::-moz-range-thumb {
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: #fff;
                    border: 3px solid var(--primary);
                    cursor: pointer;
                    border: none;
                }
            `}</style>

            {/* Results Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="glass skeleton-anim" style={{ height: '320px', borderRadius: '24px' }}></div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {(roleFilter === 'all' || roleFilter === 'coop') && teams.map(team => (
                        <TeamCard key={team.id} team={team} navigate={navigate} />
                    ))}

                    {roleFilter !== 'coop' && profiles.map(profile => (
                        <UserCard 
                            key={profile.id} 
                            profile={profile} 
                            teams={teamMemberships[profile.id] || []}
                            navigate={navigate} 
                        />
                    ))}

                    {profiles.length === 0 && teams.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔎</div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>No encontramos resultados</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Intenta ajustar tus filtros o buscar con otro término.</p>
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setRoleFilter('all');
                                    setRatingFilter(0);
                                    setLevelFilter(0);
                                }}
                                className="btn-primary" 
                                style={{ marginTop: '2rem', padding: '1rem 2rem', borderRadius: '16px' }}
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Community;
