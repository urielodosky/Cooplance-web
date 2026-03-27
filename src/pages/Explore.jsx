import React, { useState, useEffect } from 'react';
import { useServices } from '../features/services/context/ServiceContext';
import ServiceCard from '../features/services/components/ServiceCard';
import SidebarFilter from '../components/common/SidebarFilter';
import { searchAndFilterItems } from '../utils/searchUtils';
import { serviceCategories } from '../features/services/data/categories';
import { seedDatabase } from '../utils/seedData';
import '../styles/pages/Explore.scss';

const Explore = () => {
    const { services } = useServices();
    const [filteredServices, setFilteredServices] = useState([]);

    // Lifted State for Filters
    const [filters, setFilters] = useState({
        query: '',
        category: '',
        subcategory: '',
        specialties: [],
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: ''
    });

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        const results = searchAndFilterItems(services, newFilters);
        setFilteredServices(results);
    };

    // Initial load & Enrich data with Payment Methods
    useEffect(() => {
        const enrichedServices = services.map(service => {
            try {
                const allUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
                const freelancer = allUsers.find(u => u.id === service.freelancerId);
                return {
                    ...service,
                    // If service has specific methods, use them. Otherwise fallback to user's methods.
                    paymentMethods: service.paymentMethods || freelancer?.paymentMethods || {}
                };
            } catch (e) {
                console.error("Error enriching service data", e);
                return service;
            }
        });
        setFilteredServices(enrichedServices);
    }, [services]);

    return (
        <div className="container" style={{ paddingTop: '0.5rem' }}>
            <div className="explore-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 className="explore-title">Explorar Freelancers</h2>
                        <p className="explore-subtitle">Encuentra el talento ideal para tu proyecto.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('¿Estás seguro? Se borrarán los datos actuales y se cargarán los nuevos ejemplos.')) {
                                seedDatabase();
                                window.location.reload();
                            }
                        }}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        Recargar Datos de Prueba
                    </button>
                </div>
            </div>

            <SidebarFilter
                filters={filters}
                onFilterChange={handleFilterChange}
            />

            <div className="explore-content">

                {/* Duplicate SUBCATEGORY BAR Removed */}

                <div className="services-grid-explore">
                    {services.length === 0 ? (
                        <div className="no-results glass full-width-msg">
                            <h3>Aún no existen servicios registrados.</h3>
                            <p>¡Sé el primero en ofrecer tu talento!</p>
                            <button
                                className="btn-primary"
                                style={{ marginTop: '1rem' }}
                                onClick={() => {
                                    try {
                                        seedDatabase();
                                        alert("¡Datos generados exitosamente! La página se recargará ahora.");
                                        window.location.reload();
                                    } catch (error) {
                                        console.error("Error seeding:", error);
                                        alert("Error al cargar datos: " + error.message);
                                    }
                                }}
                            >
                                Cargar Datos de Prueba
                            </button>
                        </div>
                    ) : filteredServices.length > 0 ? (
                        filteredServices.map(service => (
                            <ServiceCard key={service.id} service={service} />
                        ))
                    ) : (
                        <div className="no-results glass">
                            <p>No se encontraron servicios con esos criterios.</p>
                            <button className="btn-secondary" onClick={() => handleFilterChange({ ...filters, subcategory: [], query: '' })}>
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Explore;
