// Internal Database Helpers for Notifications
const DB_KEYS = {
    NOTIFICATIONS: 'cooplance_db_notifications'
};

const getDB = (key) => JSON.parse(localStorage.getItem(key)) || [];
const saveDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));

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
 * Retrieves all notifications for a specific user, sorted by date (newest first).
 */
export const getUserNotifications = (userId) => {
    const notifications = getDB(DB_KEYS.NOTIFICATIONS) || [];
    return notifications
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Adds a new notification to the system for the target user.
 * @param {string} userId - Target user ID
 * @param {object} notificationData - { type, title, message, link? }
 */
export const createNotification = (userId, notificationData) => {
    const notifications = getDB(DB_KEYS.NOTIFICATIONS) || [];

    const newNotification = {
        id: crypto.randomUUID(),
        userId,
        type: notificationData.type || NOTIFICATION_TYPES.SYSTEM,
        title: notificationData.title,
        message: notificationData.message,
        link: notificationData.link || null,
        read: false,
        timestamp: new Date().toISOString()
    };

    notifications.push(newNotification);
    saveDB(DB_KEYS.NOTIFICATIONS, notifications);
    return newNotification;
};

/**
 * Marks a specific notification as read.
 */
export const markNotificationAsRead = (notificationId) => {
    const notifications = getDB(DB_KEYS.NOTIFICATIONS) || [];
    const index = notifications.findIndex(n => n.id === notificationId);

    if (index !== -1) {
        notifications[index].read = true;
        saveDB(DB_KEYS.NOTIFICATIONS, notifications);
        return notifications[index];
    }
    return null;
};

/**
 * Marks all notifications as read for a specific user.
 */
export const markAllAsRead = (userId) => {
    const notifications = getDB(DB_KEYS.NOTIFICATIONS) || [];
    let updated = false;

    const updatedNotifications = notifications.map(n => {
        if (n.userId === userId && !n.read) {
            updated = true;
            return { ...n, read: true };
        }
        return n;
    });

    if (updated) {
        saveDB(DB_KEYS.NOTIFICATIONS, updatedNotifications);
    }
    return updated;
};

/**
 * Deletes a specific notification.
 */
export const deleteNotification = (notificationId) => {
    let notifications = getDB(DB_KEYS.NOTIFICATIONS) || [];
    notifications = notifications.filter(n => n.id !== notificationId);
    saveDB(DB_KEYS.NOTIFICATIONS, notifications);
};
