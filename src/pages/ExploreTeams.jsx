import React, { useState, useEffect } from 'react';
import { useTeams } from '../context/TeamContext';
import SidebarFilter from '../components/common/SidebarFilter';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import '../styles/pages/Explore.scss'; // Reuse explore styles

const ExploreTeams = () => {
    const { teams, loading } = useTeams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [filters, setFilters] = useState({
        query: '',
        category: '',
        memberCountMin: '',
        memberCountMax: '',
        workMode: [],
        paymentFrequency: [],
        priceMin: '',
        priceMax: '',
        commissionMin: '',
        commissionMax: '',
        commissionFrequency: '',
        durationMin: '',
        durationMax: '',
        durationUnit: 'months',
        paymentMethods: []
    });

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    useEffect(() => {
        let results = [...teams];

        // 1. Search Query
        if (filters.query) {
            const q = filters.query.toLowerCase();
            results = results.filter(t => 
                t.name.toLowerCase().includes(q) || 
                t.description.toLowerCase().includes(q) ||
                (t.categories || []).some(cat => cat.name?.toLowerCase().includes(q))
            );
        }

        // 2. Category
        if (filters.category) {
            results = results.filter(t => 
                (t.categories || []).some(cat => cat.name === filters.category)
            );
        }

        // 3. Member Count
        if (filters.memberCountMin) {
            results = results.filter(t => (t.members?.length || 0) >= Number(filters.memberCountMin));
        }
        if (filters.memberCountMax) {
            results = results.filter(t => (t.members?.length || 0) <= Number(filters.memberCountMax));
        }

        // 4. Modalidad (Work Mode)
        if (filters.workMode && filters.workMode.length > 0) {
            results = results.filter(t => {
                // If team has work_mode property or check services
                const teamMode = t.work_mode || 'remote'; 
                return filters.workMode.includes(teamMode);
            });
        }

        // 5. Payment Frequency
        if (filters.paymentFrequency && filters.paymentFrequency.length > 0) {
            results = results.filter(t => {
                const teamFreqs = t.payment_frequencies || [];
                return filters.paymentFrequency.some(f => teamFreqs.includes(f));
            });
        }

        // 6. Price / Commission Range
        const isCommission = filters.paymentFrequency?.includes('commission');
        if (isCommission) {
            if (filters.commissionMin) {
                results = results.filter(t => (t.commission_rate || 0) >= Number(filters.commissionMin));
            }
            if (filters.commissionMax) {
                results = results.filter(t => (t.commission_rate || 0) <= Number(filters.commissionMax));
            }
        } else {
            if (filters.priceMin) {
                results = results.filter(t => (t.min_budget || 0) >= Number(filters.priceMin));
            }
            if (filters.priceMax) {
                results = results.filter(t => (t.min_budget || 0) <= Number(filters.priceMax));
            }
        }

        // 7. Duration
        if (filters.durationMin || filters.durationMax) {
            const factor = filters.durationUnit === 'days' ? 1 : 
                           filters.durationUnit === 'weeks' ? 7 : 
                           filters.durationUnit === 'months' ? 30 : 365;
            
            if (filters.durationMin) {
                const minDays = Number(filters.durationMin) * factor;
                results = results.filter(t => (t.est_duration_days || 0) >= minDays);
            }
            if (filters.durationMax) {
                const maxDays = Number(filters.durationMax) * factor;
                results = results.filter(t => (t.est_duration_days || 0) <= maxDays);
            }
        }

        // 8. Payment Methods
        if (filters.paymentMethods && filters.paymentMethods.length > 0) {
            results = results.filter(t => {
                const teamMethods = t.payment_methods || [];
                return filters.paymentMethods.some(m => teamMethods.includes(m));
            });
        }

        setFilteredTeams(results);
    }, [teams, filters]);

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="container" style={{ paddingTop: '0.5rem' }}>
            <div className="explore-header">
                <div>
                    <h2 className="explore-title">Coops</h2>
                    <p className="explore-subtitle">Descubre equipos de alto rendimiento para tus proyectos más ambiciosos.</p>
                </div>
            </div>

            <SidebarFilter 
                variant="team" 
                filters={filters} 
                onFilterChange={handleFilterChange} 
            />

            <div className="explore-content" style={{ marginTop: '2rem' }}>
                {filteredTeams.length === 0 ? (
                    <div className="no-results glass">
                        <p>No se encontraron Coops con estos criterios.</p>
                    </div>
                ) : (
                    <div className="services-grid-explore" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {filteredTeams.map(team => (
                            <div key={team.id} className="glass team-card-explore animate-in" style={{
                                padding: '1.5rem',
                                borderRadius: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                transition: 'transform 0.3s ease',
                                cursor: 'pointer'
                            }} onClick={() => navigate(`/coop/${team.id}/public`)}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    {team.avatar_url ? (
                                        <img src={team.avatar_url} alt={team.name} style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                            {team.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                            {team.members?.length || 0} Miembros
                                        </div>
                                    </div>
                                </div>

                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', height: '2.7rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {team.description}
                                </p>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {(team.categories || []).slice(0, 3).map((cat, i) => (
                                        <span key={i} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {cat.name}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {team.services?.length || 0} servicios activos
                                    </span>
                                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                        {user?.role === 'freelancer' ? 'Postularse' : 'Ver Perfil'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .team-card-explore:hover {
                    transform: translateY(-5px);
                    border-color: var(--primary) !important;
                    background: rgba(255, 255, 255, 0.05) !important;
                }
            `}</style>
        </div>
    );
};

export default ExploreTeams;
