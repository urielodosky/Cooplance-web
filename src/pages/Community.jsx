import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';

// Reusable User Card
const UserCard = ({ profile, teams = [], navigate }) => {
    const isOnline = Math.random() > 0.5; // Mock for now

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
                <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.username}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>@{profile.username}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    textTransform: 'uppercase'
                }}>{profile.role || 'Freelancer'}</span>
                
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
                    <span style={{ color: '#fbbf24', fontWeight: '800' }}>★ {profile.rating?.toFixed(1) || '0.0'}</span>
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
                }} onClick={() => navigate(`/team/${teams[0].id}`)}>
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
                    onClick={() => navigate(`/team/${team.id}`)}
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
                    onClick={() => navigate(`/team/${team.id}`)}
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
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState(0);
    const [levelFilter, setLevelFilter] = useState(0);

    useEffect(() => {
        const fetchCommunityData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Profiles with filters
                let query = supabase.from('profiles').select('*');

                if (searchTerm) {
                    query = query.ilike('username', `%${searchTerm}%`);
                }

                if (roleFilter !== 'all' && roleFilter !== 'coop') {
                    query = query.eq('role', roleFilter);
                }

                if (ratingFilter > 0) {
                    query = query.gte('rating', ratingFilter);
                }

                if (levelFilter > 0) {
                    query = query.eq('level', levelFilter);
                }

                const { data: profilesData, error: profilesError } = await query.limit(40);
                if (profilesError) throw profilesError;

                // 2. Fetch Teams (if search or coop filter)
                let teamsQuery = supabase.from('teams').select('*');
                if (searchTerm) {
                    teamsQuery = teamsQuery.ilike('name', `%${searchTerm}%`);
                }
                const { data: teamsData, error: teamsError } = await teamsQuery.limit(20);
                if (teamsError) throw teamsError;

                // 3. Fetch Team Memberships for linked display
                const profileIds = profilesData.map(p => p.id);
                if (profileIds.length > 0) {
                    const { data: membershipData } = await supabase
                        .from('team_members')
                        .select('team_id, user_id, teams(id, name)')
                        .in('user_id', profileIds);

                    const membershipMap = {};
                    membershipData?.forEach(m => {
                        if (!membershipMap[m.user_id]) membershipMap[m.user_id] = [];
                        membershipMap[m.user_id].push(m.teams);
                    });
                    setTeamMemberships(membershipMap);

                    // If searching for a specific user, we might want to also include the teams they belong to even if they don't match the search term
                    if (searchTerm && profilesData.length > 0) {
                        const extraTeamIds = membershipData?.map(m => m.team_id) || [];
                        if (extraTeamIds.length > 0) {
                            const { data: extraTeams } = await supabase
                                .from('teams')
                                .select('*')
                                .in('id', extraTeamIds);
                            
                            // Merge and unique
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
                console.error('[Community] Error:', err);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchCommunityData, 300); // Debounce
        return () => clearTimeout(timeout);
    }, [searchTerm, roleFilter, ratingFilter, levelFilter]);

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-1px' }}>
                    Comunidad <span style={{ color: 'var(--primary)' }}>Cooplance</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Encuentra el talento ideal, conecta con cooperativas visionarias y descubre nuevas oportunidades de colaboración.
                </p>
            </div>

            {/* Search & Filters Section */}
            <div className="glass" style={{
                padding: '2rem',
                borderRadius: '32px',
                border: '1px solid var(--border)',
                marginBottom: '3rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                alignItems: 'end',
                background: 'var(--bg-card)'
            }}>
                {/* Search */}
                <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Buscador @usuario</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="text"
                            placeholder="Ej: jdoe, cooplance_dev..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '16px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card-hover)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                        <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    </div>
                </div>

                {/* Role Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Rol</label>
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card-hover)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todos los Roles</option>
                        <option value="freelancer">Freelancer</option>
                        <option value="client">Cliente</option>
                        <option value="company">Empresa</option>
                        <option value="coop">Cooperativa (Coop)</option>
                    </select>
                </div>

                {/* Rating Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Calificación (Mín)</label>
                    <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', background: 'var(--bg-card-hover)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <div 
                                key={star}
                                onClick={() => setRatingFilter(ratingFilter === star ? 0 : star)}
                                style={{ 
                                    cursor: 'pointer', 
                                    padding: '0.4rem', 
                                    borderRadius: '8px',
                                    background: ratingFilter >= star ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill={ratingFilter >= star ? "#fbbf24" : "none"} stroke={ratingFilter >= star ? "#fbbf24" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Level Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Nivel (1-10)</label>
                    <input 
                        type="range"
                        min="0"
                        max="10"
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(parseInt(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: '800', marginTop: '0.5rem' }}>
                        {levelFilter === 0 ? 'Cualquiera' : `Nivel ${levelFilter}`}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="glass skeleton-anim" style={{ height: '300px', borderRadius: '24px' }}></div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {/* Render Teams First if in Coop mode or searching */}
                    {(roleFilter === 'all' || roleFilter === 'coop') && teams.map(team => (
                        <TeamCard key={team.id} team={team} navigate={navigate} />
                    ))}

                    {/* Render Profiles */}
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
