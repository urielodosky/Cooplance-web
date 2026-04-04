import { supabase } from './supabase';

/**
 * ProjectService - Supabase
 */

export const getProjects = async () => {
    const { data, error } = await supabase
        .from('projects')
        .select('*, profiles:client_id(username, first_name, last_name, avatar_url, role)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ProjectService] Error fetching projects:', error);
        return [];
    }

    return (data || []).map(mapFromDB);
};

export const getProjectById = async (id) => {
    const { data, error } = await supabase
        .from('projects')
        .select('*, profiles:client_id(username, first_name, last_name, avatar_url, role, rating, reviews_count)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('[ProjectService] Error fetching project:', error);
        return null;
    }

    return mapFromDB(data);
};

export const createProject = async (projectData) => {
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

    return mapFromDB(data);
};

export const updateProject = async (id, projectData) => {
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

    return mapFromDB(data);
};

export const deleteProject = async (id) => {
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[ProjectService] Error deleting project:', error);
        throw error;
    }
};

// ── Helpers ───────────────────────────────────────────────────

function mapToDB(p) {
    return {
        title: p.title,
        description: p.description,
        category: p.category,
        subcategories: p.subcategories || [],
        budget_type: p.budgetType || 'fixed',
        budget: parseFloat(p.budget) || 0,
        deadline: p.deadline || null,
        execution_time: parseInt(p.executionTime) || null,
        image_url: p.imageUrl || null,
        video_url: p.videoUrl || null,
        client_id: p.clientId,
        client_name: p.clientName,
        client_avatar: p.clientAvatar,
        client_role: p.clientRole,
        vacancies: parseInt(p.vacancies) || 1,
        status: p.status || 'open',
        work_mode: p.workMode || '{remote}',
        country: p.country,
        province: p.province || [],
        city: p.city || [],
        location: p.location,
        payment_methods: p.paymentMethods || null,
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
        budgetType: row.budget_type,
        budget: row.budget,
        deadline: row.deadline,
        executionTime: row.execution_time,
        imageUrl: row.image_url,
        videoUrl: row.video_url,
        clientId: row.client_id,
        clientName: row.client_name || (row.profiles?.first_name ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim() : row.profiles?.username),
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
        createdAt: row.created_at
    };
}
