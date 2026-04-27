import { supabase } from '../lib/supabase';
import * as NotificationService from './NotificationService';

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
                reviewer_id,
                reviewer:reviewer_id(username, first_name, last_name, avatar_url),
                job:job_id(status, delivery_result)
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
            .upsert({
                service_id: reviewData.serviceId,
                reviewer_id: reviewData.reviewerId,
                target_id: reviewData.targetId,
                rating: reviewData.rating,
                comment: reviewData.comment,
                job_id: reviewData.jobId
            }, { 
                onConflict: 'job_id, reviewer_id' 
            })
            .select('*')
            .single();

        if (reviewError) {
            console.error('[ReviewService] Error creating review:', reviewError);
            throw reviewError;
        }

            let userToNotify = reviewData.targetId;
            let reviewerName = 'Alguien';

            // 2. Fetch Reviewer Name
            const { data: reviewerProfile } = await supabase
                .from('profiles')
                .select('first_name, username')
                .eq('id', review.reviewer_id)
                .single();
            if (reviewerProfile) {
                reviewerName = reviewerProfile.first_name || reviewerProfile.username;
            }

            if (userToNotify) {
                // Send Notification
                await NotificationService.createNotification(userToNotify, {
                    type: 'new_review',
                    title: 'Nueva reseña',
                    message: `¡Nueva reseña! ⭐ ${reviewerName} calificó tu trabajo.`,
                    link: '/profile'
                });

                // XP Penalty Logic (Universally applied)
                if (review.rating <= 3) {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('xp')
                            .eq('id', userToNotify)
                            .single();

                        if (profile) {
                            const penalty = review.rating <= 2 ? 100 : 20;
                            const newXP = Math.max(0, (profile.xp || 0) - penalty);
                            // This might fail due to RLS if reviewer is not target, which is fine
                            await supabase.from('profiles').update({ xp: newXP }).eq('id', userToNotify);
                        }
                    } catch (xpErr) {
                        console.warn('[ReviewService] Could not update XP (likely RLS):', xpErr);
                    }
                }
            }

        return review ? mapFromDB(review) : null;
    } catch (err) {
        console.error('[ReviewService] Critical error creating review:', err);
        throw err;
    }
};

export const hasUserReviewedJob = async (jobId, reviewerId) => {
    try {
        const { data, error } = await supabase
            .from('service_reviews')
            .select('id')
            .eq('job_id', jobId)
            .eq('reviewer_id', reviewerId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            console.error('[ReviewService] Error checking existing review:', error);
            return false;
        }

        return !!data;
    } catch (err) {
        console.error('[ReviewService] Critical error checking review:', err);
        return false;
    }
};

// ── Helpers ───────────────────────────────────────────────────

function mapFromDB(row) {
    // Detect canceled: either status is 'canceled' OR delivery_result contains cancellation text
    const isCanceled = row.job?.status === 'canceled' || 
        (row.job?.delivery_result && (
            row.job.delivery_result.toLowerCase().includes('cancelado') || 
            row.job.delivery_result.toLowerCase().includes('cancelación')
        ));
    
    return {
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        reviewer_id: row.reviewer_id,
        reviewerName: row.reviewer?.first_name 
            ? `${row.reviewer.first_name} ${row.reviewer.last_name || ''}`.trim()
            : (row.reviewer?.username || 'Usuario'),
        reviewerAvatar: row.reviewer?.avatar_url,
        reviewerUsername: row.reviewer?.username,
        jobStatus: isCanceled ? 'canceled' : (row.job?.status || 'completed')
    };
}
