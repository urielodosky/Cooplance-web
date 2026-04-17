import { supabase } from '../lib/supabase';

// Standardized Notification Types
export const NOTIFICATION_TYPES = {
    HIRED: 'job_hired',
    ACCEPTED: 'job_accepted',
    MESSAGE: 'message',
    INVITE: 'coop_invite',
    ROLE_CHANGE: 'role_change',
    LEVEL_UP: 'level_up',
    BADGE: 'badge_earned',
    SYSTEM: 'system'
};

/**
 * Retrieves all notifications for a specific user from Supabase.
 */
export const getUserNotifications = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[NotificationService] Supabase Error fetching notifications:', error);
            return [];
        }

        return (data || []).map(mapFromDB);
    } catch (err) {
        console.error('[NotificationService] Critical error fetching notifications:', err);
        return [];
    }
};

/**
 * Adds a new notification to Supabase.
 */
export const createNotification = async (userId, notificationData) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: notificationData.type || NOTIFICATION_TYPES.SYSTEM,
                title: notificationData.title,
                content: notificationData.message || notificationData.content,
                link: notificationData.link || null,
                is_read: false
            })
            .select('*')
            .single();

        if (error) {
            console.error('[NotificationService] Error creating notification:', error);
            return null;
        }

        return data ? mapFromDB(data) : null;
    } catch (err) {
        console.error('[NotificationService] Critical error creating notification:', err);
        return null;
    }
};

/**
 * Marks a specific notification as read in Supabase.
 */
export const markNotificationAsRead = async (notificationId) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select('*')
            .single();

        if (error) {
            console.error('[NotificationService] Error marking notification as read:', error);
            return null;
        }

        return data ? mapFromDB(data) : null;
    } catch (err) {
        console.error('[NotificationService] Critical error marking as read:', err);
        return null;
    }
};

/**
 * Marks all notifications as read for a specific user in Supabase.
 */
export const markAllAsRead = async (userId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId);

        if (error) {
            console.error('[NotificationService] Error marking all as read:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[NotificationService] Critical error marking all as read:', err);
        return false;
    }
};

/**
 * Deletes a specific notification from Supabase.
 */
export const deleteNotification = async (notificationId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) {
            console.error('[NotificationService] Error deleting notification:', error);
        }
    } catch (err) {
        console.error('[NotificationService] Critical error deleting notification:', err);
    }
};

// ── Helpers ───────────────────────────────────────────────────

function mapFromDB(row) {
    return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        message: row.content,
        link: row.link,
        read: row.is_read,
        timestamp: row.created_at
    };
}
