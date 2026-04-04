import React, { useState, useEffect } from 'react';
import { useServices } from '../features/services/context/ServiceContext';
import ServiceCard from '../features/services/components/ServiceCard';
import SidebarFilter from '../components/common/SidebarFilter';
import { searchAndFilterItems } from '../utils/searchUtils';
import { serviceCategories } from '../features/services/data/categories';
import '../styles/pages/Explore.scss';

const Explore = () => {
    const { services, loading, fetchServices } = useServices();
    const [showManualRefresh, setShowManualRefresh] = useState(false);
    const [filters, setFilters] = useState({
        query: '', category: '', subcategory: '', specialties: [],
        priceMin: '', priceMax: '', rating: 0, workMode: [], level: '', location: ''
    });
    const [filteredServices, setFilteredServices] = useState([]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setFilteredServices(searchAndFilterItems(services, newFilters));
    };

    useEffect(() => {
        setFilteredServices(searchAndFilterItems(services, filters));
    }, [services, filters]);

    // PRE-RENDER LOGIC
    let content;
    if (loading && services.length === 0) {
        content = (
            <>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="glass" style={{ height: '350px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                        <div className="skeleton-pulse" style={{ height: '180px', background: 'rgba(255,255,255,0.03)' }}></div>
                        <div style={{ padding: '1.5rem' }}>
                            <div className="skeleton-pulse" style={{ height: '20px', width: '80%', background: 'rgba(255,255,255,0.05)', marginBottom: '12px', borderRadius: '4px' }}></div>
                            <div className="skeleton-pulse" style={{ height: '14px', width: '100%', background: 'rgba(255,255,255,0.03)', marginBottom: '8px', borderRadius: '4px' }}></div>
                            <div className="skeleton-pulse" style={{ height: '14px', width: '60%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                ))}
                <style>{`
                    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
                    .skeleton-pulse { animation: pulse 2s infinite ease-in-out; }
                `}</style>
            </>
        );
    } else if (services.length === 0) {
        content = (
            <div className="no-results glass full-width-msg" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <h3>Aún no existen servicios registrados.</h3>
                <p>La base de datos está conectada pero vacía. Crea el primer servicio para verlo aquí.</p>
                <div style={{ marginTop: '2rem' }}>
                    <button className="btn-primary" onClick={() => fetchServices()}>
                        🔄 Reintentar Sincronización
                    </button>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '1rem' }}>
                        Si ves esto y sabes que hay datos, por favor reinicia tu servidor Vite.
                    </p>
                </div>
            </div>
        );
    } else if (filteredServices.length === 0) {
        content = (
            <div className="no-results glass">
                <p>No se encontraron resultados con esos filtros.</p>
                <button className="btn-secondary" onClick={() => handleFilterChange({
                    query: '', category: '', subcategory: '', specialties: [],
                    priceMin: '', priceMax: '', rating: 0, workMode: [], level: '', location: ''
                })}>
                    Limpiar Filtros
                </button>
            </div>
        );
    } else {
        content = filteredServices.map(service => (
            <ServiceCard key={service.id} service={service} />
        ));
    }

    return (
        <div className="container" style={{ paddingTop: '0.5rem' }}>
            <div className="explore-header">
                <div>
                    <h2 className="explore-title">Explorar Freelancers</h2>
                    <p className="explore-subtitle">Encuentra el talento ideal para tu proyecto.</p>
                </div>
                {showManualRefresh && (
                    <button className="btn-outline" onClick={fetchServices}>Forzar Actualización</button>
                )}
            </div>

            <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />

            <div className="explore-content">
                <div className="services-grid-explore">
                    {content}
                </div>
            </div>
        </div>
    );
};

export default Explore;
