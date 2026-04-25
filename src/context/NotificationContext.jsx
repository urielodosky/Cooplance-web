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
        }
    }, [user]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                console.log('[NotificationContext] Real-time update:', payload);
                if (payload.eventType === 'INSERT') {
                    const newNotif = {
                        id: payload.new.id,
                        userId: payload.new.user_id,
                        type: payload.new.type,
                        title: payload.new.title,
                        message: payload.new.message,
                        link: payload.new.link,
                        read: payload.new.is_read,
                        timestamp: payload.new.created_at
                    };
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                } else {
                    loadNotifications();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, loadNotifications]);

    // Load on mount or user change
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

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
        if (!user) return;
        try {
            const success = await NotificationService.markAllAsRead(user.id);
            if (success) {
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
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => {
                const wasUnread = notifications.find(n => n.id === notificationId && !n.read);
                return wasUnread ? Math.max(0, prev - 1) : prev;
            });
        } catch (err) {
            console.error('[NotificationContext] Error deleting notification:', err);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            refresh: loadNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
