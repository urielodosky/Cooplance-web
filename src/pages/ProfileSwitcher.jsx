import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { isUserBlocked } from '../services/safetyService';
import FreelancerDetail from './FreelancerDetail';
import ClientDetail from './ClientDetail';
import CompanyDetail from './CompanyDetail';

const ProfileSwitcher = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [role, setRole] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // 1. Check if blocked
                if (currentUser && currentUser.id !== id) {
                    const blocked = await isUserBlocked(currentUser.id, id);
                    if (blocked) {
                        setIsBlocked(true);
                        // We continue because we want to show the partial profile
                    }
                }

                // 2. Fetch role
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error('[ProfileSwitcher] Error fetching role:', error);
                    setRole('freelancer');
                } else {
                    setRole(data?.role || 'freelancer');
                }
            } catch (err) {
                console.error('[ProfileSwitcher] Exception:', err);
                setRole('freelancer');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProfileData();
    }, [id, currentUser]);

    if (loading) {
        return (
            <div className="container" style={{ 
                height: '80vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}>
                <div className="loader-spinner"></div>
                <span style={{ marginLeft: '1rem' }}>Cargando perfil...</span>
            </div>
        );
    }

    // Dynamic routing based on role, passing isBlocked prop
    if (role === 'company') {
        return <CompanyDetail isBlocked={isBlocked} />;
    } else if (role === 'buyer' || role === 'client') {
        return <ClientDetail isBlocked={isBlocked} />;
    } else {
        // Defaults to freelancer if role is freelancer or anything else
        return <FreelancerDetail isBlocked={isBlocked} />;
    }
};

export default ProfileSwitcher;
