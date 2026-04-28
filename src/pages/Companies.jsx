import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfilePicture } from '../utils/avatarUtils';
import SidebarFilter from '../components/common/SidebarFilter';
import { searchAndFilterItems } from '../utils/searchUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateAge } from '../utils/ageUtils';
import { getProjects } from '../lib/projectService';
import '../styles/pages/Explore.scss';

const Companies = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [offers, setOffers] = useState([]);
    const [filteredOffers, setFilteredOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    // V23: Strict access control for U18 Freelancers
    const isU18Freelancer = user?.role === 'freelancer' && user.dob && calculateAge(user.dob) < 18;

    useEffect(() => {
        if (isU18Freelancer) {
            navigate('/dashboard');
        }
    }, [isU18Freelancer, navigate]);

    if (isU18Freelancer) return null;

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        subcategory: '',
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: '',
        paymentFrequency: [],
        durationMin: '',
        durationMax: '',
        durationUnit: 'months',
    });

    useEffect(() => {
        const fetchOffers = async () => {
            setLoading(true);
            try {
                const data = await getProjects();
                
                // Filter only company offers
                const companyOffers = data.filter(p => p.clientRole === 'company');
                
                // Map/Normalize fields for filtering
                const normalized = companyOffers.map(o => ({
                    ...o,
                    price: o.budget,
                    tags: [o.category, ...(o.subcategories || [])]
                }));

                setOffers(normalized);
                setFilteredOffers(normalized);
            } catch (err) {
                console.error("Error fetching company offers:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOffers();
    }, []);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        const results = searchAndFilterItems(offers, newFilters);
        setFilteredOffers(results);
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div className="explore-header">
                <h2 className="explore-title">Ofertas Laborales de Empresas</h2>
                <p className="explore-subtitle">
                    Encuentra oportunidades profesionales publicadas por empresas y agencias.
                </p>
            </div>

            <SidebarFilter filters={filters} onFilterChange={handleFilterChange} variant="company" />

            <div className="explore-content">
                <div className="services-grid-explore">
                    {loading ? (
                        <div className="loading-spinner glass full-width-msg">
                            <h3>Cargando ofertas...</h3>
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="no-results glass full-width-msg">
                            <h3>Aún no existen vacantes de empresas activas.</h3>
                        </div>
                    ) : filteredOffers.length > 0 ? (
                        filteredOffers.map(offer => (
                            <div
                                key={offer.id}
                                className="glass service-card clickable"
                                style={{ padding: '1.5rem', cursor: 'pointer' }}
                                onClick={() => navigate(`/project/${offer.id}`)}
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
                                            src={getProfilePicture({ role: 'company', avatar: offer.clientAvatar })}
                                            alt={offer.clientName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{offer.title}</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                            <span 
                                                className="clickable"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/company/${offer.clientId}`);
                                                }}
                                                style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: '600' }}
                                            >
                                                {offer.clientName}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                Empresa
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    margin: '0 0 1rem 0',
                                    minHeight: '3rem',
                                    lineHeight: '1.4',
                                    display: '-webkit-box',
                                    WebkitLineClamp: '2',
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {offer.description}
                                </p>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '8px',
                                    padding: '0.8rem',
                                    marginBottom: '1rem',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Pago Est.</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>
                                            ${offer.budget?.toLocaleString() || 'A convenir'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Duración</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {offer.contractDuration || 'Flexible'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Frecuencia</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {offer.paymentFrequency || 'Único'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                            {offer.category}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <span style={{ color: '#fbbf24' }}>★</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{offer.clientRating || 'Nuevo'}</span>
                                    </div>
                                </div>

                                <button
                                    className="btn-hero-secondary"
                                    style={{ width: '100%', marginTop: '1.2rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/project/${offer.id}`);
                                    }}
                                >
                                    Ver Oferta
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="no-results glass full-width-msg">
                            <h3>No se encontraron vacantes con esos criterios.</h3>
                            <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => handleFilterChange({ ...filters, query: '', category: '' })}>
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
