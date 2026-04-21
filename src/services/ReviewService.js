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

        // 2. XP Penalty Logic (Universally applied to all levels, both Clients and Freelancers)
        if (review.rating <= 3) {
            let userToPenalize = null;

            if (review.job_id) {
                // Determine who is being reviewed based on the job
                const { data: job } = await supabase
                    .from('jobs')
                    .select('client_id, provider_id')
                    .eq('id', review.job_id)
                    .single();

                if (job) {
                    if (job.client_id === review.reviewer_id) {
                        // Client is reviewing the freelancer. The freelancer is penalized.
                        userToPenalize = job.provider_id;
                    } else if (job.provider_id === review.reviewer_id) {
                        // Freelancer is reviewing the client. The client is penalized.
                        userToPenalize = job.client_id;
                    }
                }
            } 
            
            // Fallback for older workflow or reviews without job_id
            if (!userToPenalize && review.service_id) {
                const { data: service } = await supabase
                    .from('services')
                    .select('owner_id')
                    .eq('id', review.service_id)
                    .single();
                
                if (service && service.owner_id !== review.reviewer_id) {
                    userToPenalize = service.owner_id;
                }
            }

            if (userToPenalize) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('xp')
                    .eq('id', userToPenalize)
                    .single();

                if (profile) {
                    // Penalty applies to ALL levels without exception
                    const penalty = review.rating <= 2 ? 100 : 20;
                    const newXP = Math.max(0, (profile.xp || 0) - penalty);
                    
                    await supabase
                        .from('profiles')
                        .update({ xp: newXP })
                        .eq('id', userToPenalize);
                    
                    console.log(`[ReviewService] Quality Penalty applied to ${userToPenalize}: -${penalty} XP`);
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
