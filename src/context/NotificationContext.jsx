import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import * as NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        try {
            const userNotifs = await NotificationService.getUserNotifications(user.id);
            setNotifications(userNotifs || []);
            setUnreadCount((userNotifs || []).filter(n => !n.read).length);
        } catch (err) {
            console.error('[NotificationContext] Error in loadNotifications:', err);
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`public:notifications:user_id=eq.${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                console.log('[NotificationContext] Real-time update:', payload);
                loadNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, loadNotifications]);

    // Load on mount
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Expose method to mark as read
    const markAsRead = async (notificationId) => {
        try {
            const updated = await NotificationService.markNotificationAsRead(notificationId);
            if (updated) {
                setNotifications(prev => prev.map(n => n.id === notificationId ? updated : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('[NotificationContext] Error marking as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const didUpdate = await NotificationService.markAllAsRead(user.id);
            if (didUpdate) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('[NotificationContext] Error marking all as read:', err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await NotificationService.deleteNotification(notificationId);
            await loadNotifications();
        } catch (err) {
            console.error('[NotificationContext] Error deleting notification:', err);
        }
    };

    // System hook for adding notification from anywhere if needed
    const addNotification = async (userId, data) => {
        try {
            const newNotif = await NotificationService.createNotification(userId, data);
            if (user && userId === user.id && newNotif) {
                setNotifications(prev => {
                    if (prev.some(n => n.id === newNotif.id)) return prev;
                    return [newNotif, ...prev];
                });
                setUnreadCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('[NotificationContext] Error adding notification:', err);
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
