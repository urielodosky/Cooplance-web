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

            let userToNotify = null;
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

            // 3. Determine who is being reviewed
            if (review.job_id) {
                const { data: job } = await supabase
                    .from('jobs')
                    .select('client_id, provider_id')
                    .eq('id', review.job_id)
                    .single();

                if (job) {
                    userToNotify = (job.client_id === review.reviewer_id) ? job.provider_id : job.client_id;
                }
            } else if (review.service_id) {
                const { data: service } = await supabase
                    .from('services')
                    .select('owner_id')
                    .eq('id', review.service_id)
                    .single();
                if (service && service.owner_id !== review.reviewer_id) {
                    userToNotify = service.owner_id;
                }
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
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('xp')
                        .eq('id', userToNotify)
                        .single();

                    if (profile) {
                        const penalty = review.rating <= 2 ? 100 : 20;
                        const newXP = Math.max(0, (profile.xp || 0) - penalty);
                        await supabase.from('profiles').update({ xp: newXP }).eq('id', userToNotify);
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
