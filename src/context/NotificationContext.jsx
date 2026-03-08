import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import * as NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const userNotifs = NotificationService.getUserNotifications(user.id);
        setNotifications(userNotifs);
        setUnreadCount(userNotifs.filter(n => !n.read).length);
    }, [user]);

    // Load on mount or user change
    useEffect(() => {
        loadNotifications();

        // Simulating realtime updates by polling or listening to a custom event
        const handleStorageChange = (e) => {
            if (e.key === 'cooplance_db_notifications') {
                loadNotifications();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadNotifications]);

    // Expose method to mark as read
    const markAsRead = (notificationId) => {
        const updated = NotificationService.markNotificationAsRead(notificationId);
        if (updated) {
            setNotifications(prev => prev.map(n => n.id === notificationId ? updated : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = () => {
        const didUpdate = NotificationService.markAllAsRead(user.id);
        if (didUpdate) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        }
    };

    const deleteNotification = (notificationId) => {
        NotificationService.deleteNotification(notificationId);
        loadNotifications(); // Reload to recalculate state easily
    };

    // System hook for adding notification from anywhere if needed (though usually we call service directly)
    const addNotification = (userId, data) => {
        const newNotif = NotificationService.createNotification(userId, data);
        // If it's for the current user, update local state immediately
        if (user && userId === user.id) {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            addNotification,
            refresh: loadNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
