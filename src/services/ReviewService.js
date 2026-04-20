import { supabase } from '../lib/supabase';

/**
 * ReviewService - Supabase
 * Handles fetching and creating reviews for services.
 */

export const getServiceReviews = async (serviceId) => {
    try {
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
            console.error('[ReviewService] Supabase error fetching reviews:', error);
            return [];
        }

        return (data || []).map(mapFromDB);
    } catch (err) {
        console.error('[ReviewService] Critical error fetching reviews:', err);
        return [];
    }
};

export const createReview = async (reviewData) => {
    try {
        // 1. Insert Review
        const { data: review, error: reviewError } = await supabase
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

        if (reviewError) {
            console.error('[ReviewService] Error creating review:', reviewError);
            throw reviewError;
        }

        // 2. XP Penalty Logic (V39)
        // Only apply if rating <= 3 and freelancer is Level 6+
        if (review.rating <= 3) {
            // Get service owner
            const { data: service } = await supabase
                .from('services')
                .select('owner_id')
                .eq('id', review.service_id)
                .single();
            
            if (service?.owner_id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('level, xp')
                    .eq('id', service.owner_id)
                    .single();

                if (profile && profile.level >= 6) {
                    const penalty = review.rating <= 2 ? 100 : 20;
                    const newXP = Math.max(0, (profile.xp || 0) - penalty);
                    
                    // Update profile XP
                    await supabase
                        .from('profiles')
                        .update({ xp: newXP })
                        .eq('id', service.owner_id);
                    
                    console.log(`[ReviewService] Quality Penalty applied to ${service.owner_id}: -${penalty} XP`);
                }
            }
        }

        return review ? mapFromDB(review) : null;
    } catch (err) {
        console.error('[ReviewService] Critical error creating review:', err);
        throw err;
    }
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
