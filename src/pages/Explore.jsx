import React, { useState, useEffect } from 'react';
import { useServices } from '../features/services/context/ServiceContext';
import ServiceCard from '../features/services/components/ServiceCard';
import SidebarFilter from '../components/common/SidebarFilter';
import { searchAndFilterItems } from '../utils/searchUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateAge } from '../utils/ageUtils';
import ServiceSkeleton from '../features/services/components/ServiceSkeleton';
import '../styles/pages/Explore.scss';

const Explore = () => {
    const { services, loading, fetchServices } = useServices();
    const { user } = useAuth();
    const [showManualRefresh, setShowManualRefresh] = useState(false);
    
    // V23: Age-based filtering for buyers
    const getVisibleServices = () => {
        let list = [...services];
        if (user && user.role === 'buyer' && user.dob && calculateAge(user.dob) < 18) {
            // Only allow digital/remote services
            list = list.filter(s => {
                const workMode = s.workMode || [];
                const isPresential = Array.isArray(workMode) ? workMode.includes('presential') : false;
                const isRestrictedCategory = ['Profesionales Matriculados', 'Servicios Físicos y Locales'].includes(s.category);
                return !isPresential && !isRestrictedCategory;
            });
        }
        return list;
    };

    const [filters, setFilters] = useState({
        query: '', category: '', subcategory: '', specialties: [],
        priceMin: '', priceMax: '', rating: 0, workMode: [], level: '', location: ''
    });
    const [filteredServices, setFilteredServices] = useState([]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setFilteredServices(searchAndFilterItems(getVisibleServices(), newFilters));
    };

    useEffect(() => {
        const filtered = searchAndFilterItems(getVisibleServices(), filters);
        // V39: Sort paused services to the end
        const sorted = [...filtered].sort((a, b) => {
            const aPaused = a.gamification?.pause_mode?.active || a.gamification?.vacation?.active;
            const bPaused = b.gamification?.pause_mode?.active || b.gamification?.vacation?.active;
            if (aPaused && !bPaused) return 1;
            if (!aPaused && bPaused) return -1;
            return 0;
        });
        setFilteredServices(sorted);
    }, [services, filters, user]);

    // PRE-RENDER LOGIC
    let content;
    if (loading && services.length === 0) {
        content = (
            <>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <ServiceSkeleton key={i} />
                ))}
            </>
        );
    } else if (services.length === 0) {
        content = (
            <div className="no-results glass full-width-msg" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <h3>Aún no existen servicios registrados.</h3>
                <p>Vuelve más tarde para descubrir nuevos freelancers.</p>
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
