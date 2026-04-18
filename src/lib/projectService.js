import { supabase } from './supabase';

/**
 * ProjectService - Supabase
 */

export const getProjects = async () => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*, profiles:client_id(username, first_name, last_name, avatar_url, role)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProjectService] Supabase error fetching projects:', error);
            return [];
        }

        return (data || []).map(mapFromDB);
    } catch (err) {
        console.error('[ProjectService] Critical error fetching projects:', err);
        return [];
    }
};

export const getProjectsByClient = async (clientId) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*, profiles:client_id(username, first_name, last_name, avatar_url, role)')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProjectService] Supabase error fetching projects by client:', error);
            return [];
        }

        return (data || []).map(mapFromDB);
    } catch (err) {
        console.error('[ProjectService] Critical error fetching projects by client:', err);
        return [];
    }
};

export const getProjectById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*, profiles:client_id(username, first_name, last_name, avatar_url, role, rating, reviews_count)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('[ProjectService] Error fetching project:', error);
            return null;
        }

        return data ? mapFromDB(data) : null;
    } catch (err) {
        console.error('[ProjectService] Critical error fetching project:', err);
        return null;
    }
};

export const createProject = async (projectData) => {
    try {
        const dbRow = mapToDB(projectData);
        const { data, error } = await supabase
            .from('projects')
            .insert(dbRow)
            .select('*')
            .single();

        if (error) {
            console.error('[ProjectService] Error creating project:', error);
            throw error;
        }

        return data ? mapFromDB(data) : null;
    } catch (err) {
        console.error('[ProjectService] Critical error creating project:', err);
        throw err;
    }
};

export const updateProject = async (id, projectData) => {
    try {
        const dbRow = mapToDB(projectData);
        const { data, error } = await supabase
            .from('projects')
            .update(dbRow)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('[ProjectService] Error updating project:', error);
            throw error;
        }

        return data ? mapFromDB(data) : null;
    } catch (err) {
        console.error('[ProjectService] Critical error updating project:', err);
        throw err;
    }
};

export const deleteProject = async (id) => {
    try {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[ProjectService] Error deleting project:', error);
            throw error;
        }
    } catch (err) {
        console.error('[ProjectService] Critical error deleting project:', err);
        throw err;
    }
};

// ── Helpers ───────────────────────────────────────────────────

function mapToDB(p) {
    return {
        title: p.title,
        description: p.description,
        category: p.category,
        subcategories: p.subcategories || [],
        specialties: p.specialties || [], // V29 Added
        budget_type: p.budgetType || 'fixed',
        budget: parseFloat(p.budget) || 0,
        deadline: p.deadline || null,
        image_url: p.imageUrl || null,
        video_url: p.videoUrl || null,
        client_id: p.clientId,
        vacancies: parseInt(p.vacancies) || 1,
        status: p.status || 'open',
        work_mode: p.workMode || '{remote}',
        country: p.country,
        province: p.province || [],
        city: p.city || [],
        location: p.location,
        payment_methods: p.paymentMethods || null,
        payment_frequency: p.paymentFrequency || 'fixed',
        contract_duration: p.contractDuration || null,
        images: p.images || [],
        videos: p.videos || [],
        faqs: p.faqs || null,
        questions: p.questions || null
    };
}

function mapFromDB(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        subcategories: row.subcategories,
        specialties: row.specialties || [], // V29 Added
        budgetType: row.budget_type,
        budget: row.budget,
        deadline: row.deadline,
        imageUrl: row.image_url,
        videoUrl: row.video_url,
        clientId: row.client_id,
        clientName: row.client_name || (row.profiles?.first_name ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim() : row.profiles?.username),
        clientUsername: row.profiles?.username,
        clientAvatar: row.client_avatar || row.profiles?.avatar_url,
        clientRole: row.client_role || row.profiles?.role,
        clientRating: row.profiles?.rating || 0,
        clientReviews: row.profiles?.reviews_count || 0,
        status: row.status,
        workMode: row.work_mode,
        country: row.country,
        province: row.province,
        city: row.city,
        location: row.location,
        paymentMethods: row.payment_methods,
        faqs: row.faqs || [],
        questions: row.questions || [],
        contractDuration: row.contract_duration, // V28 Added
        paymentFrequency: row.payment_frequency, // V28 Added
        images: row.images || [],
        videos: row.videos || [],
        vacancies: row.vacancies || 1,
        createdAt: row.created_at
    };
}
