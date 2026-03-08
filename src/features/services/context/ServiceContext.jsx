import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { registerActivity } from '../../../utils/gamification';

const ServiceContext = createContext();

export const useServices = () => useContext(ServiceContext);

export const ServiceProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [services, setServices] = useState(() => {
        const stored = localStorage.getItem('cooplance_db_services');
        console.log("[ServiceContext] Loading from localStorage:", stored ? `${JSON.parse(stored).length} items` : "EMPTY/NULL");
        let parsed = stored ? JSON.parse(stored) : [];

        // MIGRATION/PATCH: Ensure subcategories exist for demo services if missing
        parsed = parsed.map(s => {
            if (!s.subcategory && !s.subcategories) {
                // Map of default subcategories for known IDs or categories
                if (s.id === 1001) return { ...s, subcategories: ['Logo', 'Identidad Visual'] };
                if (s.id === 1002) return { ...s, subcategories: ['Web Design', 'Landing Page'] };
                if (s.id === 1003) return { ...s, subcategories: ['Corporativa', 'Retrato'] };
                if (s.id === 1004) return { ...s, subcategories: ['Mantenimiento', 'Reparación'] }; // Mario
                // Generic fallback based on tags if available
                if (s.tags && s.tags.length > 0) return { ...s, subcategories: s.tags.slice(0, 2) };
            }
            return s;
        });

        return parsed;
    });

    // Initial Load Log
    React.useEffect(() => {
        console.log("[ServiceContext] Services in state:", services.length);
    }, [services.length]);

    React.useEffect(() => {
        localStorage.setItem('cooplance_db_services', JSON.stringify(services));
    }, [services]);

    const addService = (service) => {
        setServices([...services, { ...service, id: Date.now() }]);
        if (user) {
            const updated = registerActivity(user);
            updateUser(updated);
        }
    };

    const updateService = (updatedService) => {
        setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
    };

    return (
        <ServiceContext.Provider value={{ services, addService, updateService }}>
            {children}
        </ServiceContext.Provider>
    );
};
