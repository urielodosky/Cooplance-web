import { supabase } from './supabase';

/**
 * JobService - Supabase
 */

export const getJobsByUserId = async (userId, role = 'provider') => {
    const column = role === 'provider' ? 'provider_id' : 'client_id';
    
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            service:service_id(*),
            project:project_id(*),
            client:client_id(username, first_name, last_name, avatar_url),
            provider:provider_id(username, first_name, last_name, avatar_url)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[JobService] Error fetching jobs:', error);
        return [];
    }

    return data;
};

export const getJobById = async (id) => {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            service:service_id(*),
            project:project_id(*),
            client:client_id(username, first_name, last_name, avatar_url),
            provider:provider_id(username, first_name, last_name, avatar_url)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('[JobService] Error fetching job:', error);
        return null;
    }

    return data;
};

export const createJob = async (jobData) => {
    const { data, error } = await supabase
        .from('jobs')
        .insert({
            client_id: jobData.clientId,
            provider_id: jobData.providerId,
            service_id: jobData.serviceId || null,
            project_id: jobData.projectId || null,
            amount: jobData.amount,
            currency: jobData.currency || 'ARS',
            status: jobData.status || 'active',
            service_title: jobData.serviceTitle || jobData.title,
            deadline: jobData.deadline || null
        })
        .select('*')
        .single();

    if (error) {
        console.error('[JobService] Error creating job:', error);
        throw error;
    }

    return data;
};

export const updateJobStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[JobService] Error updating job status:', error);
        throw error;
    }

    return data;
};

export const getActiveJobsCount = async (userId) => {
    const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', userId)
        .eq('status', 'active');

    if (error) {
        console.error('[JobService] Error getting active jobs count:', error);
        return 0;
    }

    return count || 0;
};
