import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';
import { registerActivity } from '../../../utils/gamification';

const ServiceContext = createContext();

export const useServices = () => useContext(ServiceContext);

// ── Mappers: Supabase row ↔ Frontend object ─────────────────

const mapFromDB = (row) => {
    const config = row.config || {};
    const location = config.location || {};
    const credentials = config.credentials || {};

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        subcategory: row.subcategory,
        specialties: config.specialties || row.specialties || [],
        price: row.price,
        deliveryTime: row.delivery_time,
        revisions: row.revisions,
        image: row.image_url,
        imageUrl: row.image_url,
        video: row.video_url,
        videoUrl: row.video_url,
        tags: config.tags || row.tags || [],
        workMode: config.work_mode || row.work_mode || ['remote'],
        active: row.active,
        bookingConfig: config.booking_config || row.booking_config,
        packages: config.packages || row.packages,
        faqs: config.faqs || row.faqs,
        images: row.images || [],
        videos: row.videos || [],
        location: row.location,
        country: location.country || row.country,
        province: location.province || row.province || [],
        city: location.city || row.city || [],
        paymentMethods: row.payment_methods,
        hasPackages: row.has_packages || false,
        isSessionBased: row.is_session_based || false,
        portfolioUrl: row.portfolio_url,
        professionalLicense: credentials.license || row.professional_license,
        professionalBody: credentials.body || row.professional_body,
        mediaType: config.media_type || row.media_type,
        freelancerId: row.owner_id,
        freelancerName: row.profiles
            ? (row.profiles.first_name
                ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim()
                : (row.profiles.username || 'Usuario'))
            : 'Usuario',
        freelancerAvatar: row.profiles?.avatar_url || null,
        level: row.profiles?.level || 1,
        date: row.created_at,
        createdAt: row.created_at,
        // Preserve raw config for any edge cases
        config: row.config
    };
};

const mapToDB = (service) => {
    // Structure JSONB config object
    const config = {
        packages: service.packages || null,
        faqs: service.faqs || null,
        booking_config: service.bookingConfig || null,
        media_type: service.mediaType || null,
        work_mode: service.workMode || ['remote'],
        specialties: service.specialties || [],
        tags: service.tags || [],
        location: {
            province: service.province || [],
            city: service.city || [],
            country: service.country || 'Argentina'
        },
        credentials: {
            license: service.professionalLicense || null,
            body: service.professionalBody || null
        }
    };

    return {
        title: service.title,
        description: service.description,
        category: service.category,
        subcategory: service.subcategory,
        price: parseFloat(service.price) || 0,
        delivery_time: parseInt(service.deliveryTime) || null,
        revisions: parseInt(service.revisions) || null,
        image_url: service.image || service.imageUrl || null,
        video_url: service.video || service.videoUrl || null,
        images: service.images || [],
        videos: service.videos || [],
        active: service.active !== undefined ? service.active : true,
        has_packages: service.hasPackages || false,
        is_session_based: service.isSessionBased || false,
        portfolio_url: service.portfolioUrl || null,
        owner_id: service.freelancerId,
        payment_methods: service.paymentMethods || null,
        location: service.location || 'Remoto',
        // Group everything else into JSONB
        config: config
    };
};



// ── Provider ─────────────────────────────────────────────────

export const ServiceProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const fetchServices = useCallback(async () => {
        let isComplete = false;
        
        // Watchdog: If Supabase takes > 45s, unlock the UI (V19)
        const watchdog = setTimeout(() => {
            if (!isComplete && isMounted.current) {
                console.warn('[ServiceContext v1.6] WATCHDOG TIMEOUT (45s). Unblocking UI. Check Supabase connection.');
                setLoading(false);
            }
        }, 45000);

        try {
            console.log('[ServiceContext v1.6] fetchServices START');
            const { data, error } = await supabase
                .from('services')
                .select('*, profiles!owner_id(username, first_name, last_name, level, avatar_url, gender)')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ServiceContext v1.6] DATABASE ERROR:', error);
                throw error;
            }
            
            console.info(`[ServiceContext v1.6] SUCCESS. Rows: ${data?.length || 0}`);
            if (isMounted.current) {
                setServices((data || []).map(mapFromDB));
            }
        } catch (err) {
            console.error('[ServiceContext v1.6] FETCH EXCEPTION:', err);
        } finally {
            isComplete = true;
            clearTimeout(watchdog);
            if (isMounted.current) {
                console.log('[ServiceContext v1.6] fetchServices FINISHED. setLoading(false)');
                setLoading(false);
            }
        }
    }, [isMounted]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const addService = async (service) => {
        try {
            const dbRow = mapToDB(service);
            const { data, error } = await supabase
                .from('services')
                .insert(dbRow)
                .select('*, profiles!owner_id(username, first_name, last_name, level, avatar_url, gender)')
                .single();

            if (error) throw error;
            const mapped = mapFromDB(data);
            setServices(prev => [mapped, ...prev]);

            if (user) {
                const updated = registerActivity(user);
                updateUser(updated);
            }
            return mapped;
        } catch (err) {
            console.error('[ServiceContext] Error adding service:', err);
            throw err;
        }
    };

    const updateService = async (updatedService) => {
        try {
            const { data: { user: sessionUser } } = await supabase.auth.getUser();
            const dbRow = mapToDB(updatedService);
            
            // SECURITY V10: Force current user as owner to prevent ownership mismatch errors
            if (sessionUser) dbRow.owner_id = sessionUser.id;

            console.log("[ServiceContext] --- V10 EMERGENCY FIX ---");
            console.log("[ServiceContext] Updating ID:", updatedService.id);
            console.log("[ServiceContext] Enforced Owner:", dbRow.owner_id);

            const { data, error } = await supabase
                .from('services')
                .update(dbRow)
                .eq('id', updatedService.id)
                .select('*, profiles!owner_id(username, first_name, last_name, level, avatar_url, gender)')
                .maybeSingle();

            if (error) throw error;
            
            // If update fails to find the row, it's likely an RLS or ID mapping issue
            if (!data) {
                console.error("[ServiceContext] Update matched 0 rows. Attempting recovery...");
                throw new Error('No se pudo encontrar el servicio. Por favor, asegúrate de ser el dueño del servicio.');
            }

            const mapped = mapFromDB(data);
            setServices(prev => prev.map(s => s.id === mapped.id ? mapped : s));
            return mapped;
        } catch (err) {
            console.error('[ServiceContext] Error updating service:', err);
            throw err;
        }
    };

    const deleteService = async (serviceId) => {
        try {
            console.log(`[ServiceContext] Attempting to delete service: ${serviceId}`);
            const { error, count } = await supabase
                .from('services')
                .delete({ count: 'exact' }) // V16: Request exact count to verify deletion
                .eq('id', serviceId);

            if (error) throw error;
            
            if (count === 0) {
                console.warn("[ServiceContext] Delete matched 0 rows. Likely RLS policy mismatch.");
                throw new Error("No tienes permiso para borrar este servicio o el servicio no existe.");
            }

            console.log("[ServiceContext] Service deleted successfully from DB.");
            setServices(prev => prev.filter(s => s.id !== serviceId));
            return true;
        } catch (err) {
            console.error('[ServiceContext] Error deleting service:', err);
            throw err;
        }
    };

    return (
        <ServiceContext.Provider value={{ services, loading, addService, updateService, deleteService, fetchServices }}>
            {children}
        </ServiceContext.Provider>
    );
};
