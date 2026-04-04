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
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[NotificationService] Error fetching notifications:', error);
        return [];
    }

    return data.map(mapFromDB);
};

/**
 * Adds a new notification to Supabase.
 */
export const createNotification = async (userId, notificationData) => {
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

    return mapFromDB(data);
};

/**
 * Marks a specific notification as read in Supabase.
 */
export const markNotificationAsRead = async (notificationId) => {
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

    return mapFromDB(data);
};

/**
 * Marks all notifications as read for a specific user in Supabase.
 */
export const markAllAsRead = async (userId) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

    if (error) {
        console.error('[NotificationService] Error marking all as read:', error);
        return false;
    }

    return true;
};

/**
 * Deletes a specific notification from Supabase.
 */
export const deleteNotification = async (notificationId) => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

    if (error) {
        console.error('[NotificationService] Error deleting notification:', error);
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
