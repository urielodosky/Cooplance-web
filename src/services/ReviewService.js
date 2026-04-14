import { supabase } from '../lib/supabase';

/**
 * ReviewService - Supabase
 * Handles fetching and creating reviews for services.
 */

export const getServiceReviews = async (serviceId) => {
    const { data, error } = await supabase
        .from('service_reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer:reviewer_id(username, first_name, last_name, avatar_url)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ReviewService] Error fetching reviews:', error);
        return [];
    }

    return (data || []).map(mapFromDB);
};

export const createReview = async (reviewData) => {
    const { data, error } = await supabase
        .from('service_reviews')
        .insert({
            service_id: reviewData.serviceId,
            reviewer_id: reviewData.reviewerId,
            rating: reviewData.rating,
            comment: reviewData.comment,
            job_id: reviewData.jobId
        })
        .select('*')
        .single();

    if (error) {
        console.error('[ReviewService] Error creating review:', error);
        throw error;
    }

    return mapFromDB(data);
};

// ── Helpers ───────────────────────────────────────────────────

function mapFromDB(row) {
    return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        reviewerName: row.reviewer?.first_name 
            ? `${row.reviewer.first_name} ${row.reviewer.last_name || ''}`.trim()
            : (row.reviewer?.username || 'Usuario'),
        reviewerAvatar: row.reviewer?.avatar_url,
        reviewerUsername: row.reviewer?.username
    };
}
