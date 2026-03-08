import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import SidebarFilter from '../components/common/SidebarFilter';
import { searchAndFilterItems } from '../utils/searchUtils';
import '../styles/pages/Explore.scss';

const Companies = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        subcategory: [],
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: '',
        paymentFrequency: [],
        durationValue: '',
        durationUnit: 'months'
    });

    // Helper to parse duration string to days
    const parseDurationToDays = (str) => {
        if (!str) return 9999; // Assume long if unknown
        const s = str.toLowerCase();
        const num = parseInt(s.match(/\d+/) || ['0'])[0];

        if (s.includes('mes') || s.includes('month')) return num * 30;
        if (s.includes('semana') || s.includes('week')) return num * 7;
        if (s.includes('dia') || s.includes('día') || s.includes('day')) return num;
        if (s.includes('año') || s.includes('year')) return num * 365;
        return 9999;
    };

    useEffect(() => {
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');

        const companyUsers = storedUsers.filter(u => u.role === 'company' && !u.isDeleted).map(c => {
            // Loose comparison for ID to handle string/number differences
            const activeProjects = storedProjects.filter(p => p.clientId == c.id && (!p.status || p.status === 'open'));
            const activeVacancies = activeProjects.length;

            // Calculate Budget Range
            const budgets = activeProjects.map(p => p.budget).filter(b => b > 0);
            const minBudget = budgets.length ? Math.min(...budgets) : 0;
            const maxBudget = budgets.length ? Math.max(...budgets) : 0;
            const budgetDisplay = activeVacancies > 0
                ? (minBudget === maxBudget ? `$${maxBudget}` : `$${minBudget} - $${maxBudget}`)
                : 'Sin ofertas';

            // Calculate Filters Data
            const paymentFrequencies = [...new Set(activeProjects.map(p => p.paymentFrequency).filter(Boolean))]; // e.g. ['fixed', 'hourly']
            const projectBudgets = activeProjects.map(p => Number(p.budget) || 0);

            // Calculate Duration Summary (simplistic)
            const durations = activeProjects.map(p => p.executionTime || p.contractDuration).filter(Boolean);
            const durationDisplay = durations.length > 0
                ? (durations.length === 1 ? durations[0] : 'Variable')
                : 'No especificada';

            // Duration in days for filtering
            const projectDurationDays = durations.map(d => parseDurationToDays(d));

            return {
                ...c,
                companyName: c.companyName || c.name,
                vacancies: activeVacancies,
                budgetDisplay,
                durationDisplay,
                paymentFrequencies, // For filtering
                projectBudgets,     // For filtering
                projectDurationDays, // For filtering
                // Normalize for searchUtils
                title: c.companyName || c.name,
                tags: [c.industry, ...(c.tags || [])],
                price: 0
            };
        }).filter(c => c.vacancies > 0); // FILTER: Only show companies with at least 1 vacancy

        setCompanies(companyUsers);
        setFilteredCompanies(companyUsers);
    }, []);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        // 1. Standard Filters
        // Exclude priceMin/Max from standard searchUtils because companies have price: 0
        // We handle price filtering manually below based on project budgets.
        const { priceMin, priceMax, ...searchFilters } = newFilters;
        let results = searchAndFilterItems(companies, searchFilters);

        // 2. Custom Company Filters
        if (newFilters.paymentFrequency && newFilters.paymentFrequency.length > 0) {
            results = results.filter(c => c.paymentFrequencies.some(f => newFilters.paymentFrequency.includes(f)));
        }

        if (newFilters.priceMin && newFilters.priceMin.trim() !== '') {
            const minVal = Number(newFilters.priceMin);
            // Show companies that have AT LEAST ONE project with budget >= minVal
            results = results.filter(c => c.projectBudgets.some(b => b >= minVal));
        }

        if (newFilters.durationValue) {
            const val = Number(newFilters.durationValue);
            let limitDays = 9999;
            if (newFilters.durationUnit === 'days') limitDays = val;
            if (newFilters.durationUnit === 'weeks') limitDays = val * 7;
            if (newFilters.durationUnit === 'months') limitDays = val * 30;

            // Show companies that have AT LEAST ONE project with duration <= limitDays
            results = results.filter(c => c.projectDurationDays.some(d => d <= limitDays));
        }

        setFilteredCompanies(results);
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div className="explore-header">
                <h2 className="explore-title">Explorar Empresas y Agencias</h2>
                <p className="explore-subtitle">
                    Encuentra las mejores organizaciones para colaborar a largo plazo.
                </p>
            </div>

            <SidebarFilter filters={filters} onFilterChange={handleFilterChange} variant="company" />

            <div className="explore-content">
                <div className="services-grid-explore">
                    {companies.length === 0 ? (
                        <div className="no-results glass full-width-msg">
                            <h3>Aún no existen empresas con vacantes activas.</h3>
                        </div>
                    ) : filteredCompanies.length > 0 ? (
                        filteredCompanies.map(company => (
                            <div
                                key={company.id}
                                className="glass service-card clickable"
                                style={{ padding: '1.5rem', cursor: 'pointer' }}
                                onClick={() => navigate(`/company/${company.id}`)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <img
                                            src={getProfilePicture({ role: 'company', companyName: company.companyName })}
                                            alt={company.companyName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{company.companyName}</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: company.workMode === 'remote' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                color: company.workMode === 'remote' ? 'var(--secondary)' : '#8b5cf6',
                                                border: company.workMode === 'remote' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)'
                                            }}>
                                                {company.workMode === 'remote' ? 'Remoto' : (company.location || 'Presencial')}
                                            </span>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                            }}>
                                                {company.vacancies} Vacantes
                                            </span>

                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                {company.industry || company.category || 'Empresa'}
                                            </span>

                                            {company.tags && company.tags.length > 0 && (
                                                <div className="help-icon-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                        +{company.tags.length}
                                                    </span>
                                                    <div className="help-tooltip" style={{ width: 'auto', minWidth: '120px', bottom: '100%', marginBottom: '5px', left: '50%', transform: 'translateX(-50%)' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Especialidades</div>
                                                        <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.8rem', textAlign: 'left', listStyleType: 'disc' }}>
                                                            {company.tags.map((tag, i) => (
                                                                <li key={i}>{tag}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    margin: '0 0 1rem 0',
                                    minHeight: '2.5rem',
                                    lineHeight: '1.4'
                                }}>
                                    {company.bio}
                                </p>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '8px',
                                    padding: '0.6rem',
                                    marginBottom: '1rem',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '0.4rem'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Pago Est.</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.budgetDisplay}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Duración</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.durationDisplay}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Vacantes</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>{company.vacancies} Personas</span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {company.industry || company.category || 'Empresa'}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <span style={{ color: '#fbbf24' }}>★</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{company.rating || 'Nuevo'}</span>
                                    </div>
                                </div>

                                <button
                                    className="btn-hero-secondary"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/company/${company.id}`);
                                    }}
                                >
                                    Ver Perfil
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="no-results glass">
                            <h3>No se encontraron empresas con esos criterios.</h3>
                            <button className="btn-secondary" onClick={() => handleFilterChange({ ...filters, query: '', category: '' })}>
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Companies;
