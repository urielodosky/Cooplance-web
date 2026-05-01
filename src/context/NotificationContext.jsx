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
    const [toasts, setToasts] = useState([]); // Real-time visual alerts

    const loadNotifications = useCallback(async () => {
        if (!user?.id) {
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
    }, [user?.id]);

    // Real-time subscription
    useEffect(() => {
        if (!user?.id) return;

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

                    // Add to visual toast queue
                    const toastId = Date.now();
                    setToasts(prev => [...prev, { ...newNotif, toastId }]);

                    // Auto-remove toast after 5 seconds
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.toastId !== toastId));
                    }, 5000);
                } else {
                    loadNotifications();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, loadNotifications]);

    // Load on mount or user change
    useEffect(() => {
        loadNotifications();
        
        // Polling fallback every 60 seconds
        const interval = setInterval(() => {
            loadNotifications();
        }, 60000);

        return () => clearInterval(interval);
    }, [loadNotifications]);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            const updated = await NotificationService.markNotificationAsRead(notificationId);
            if (updated) {
                setNotifications(prev => prev.map(n => n.id === notificationId ? updated : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('[NotificationContext] Error marking as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return;
        try {
            const success = await NotificationService.markAllAsRead(user.id);
            if (success) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('[NotificationContext] Error marking all as read:', err);
        }
    }, [user?.id]);

    const deleteNotification = useCallback(async (notificationId) => {
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
    }, [notifications]);

    const unreadMessagesCount = React.useMemo(() => 
        notifications.filter(n => n.type === 'new_message' && !n.read).length, 
    [notifications]);

    const value = React.useMemo(() => ({
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: loadNotifications,
        unreadMessagesCount
    }), [
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadNotifications,
        unreadMessagesCount
    ]);

    return (
        <NotificationContext.Provider value={value}>
            {children}

            {/* REAL-TIME TOAST UI */}
            <div className="notifications-toast-container" style={{
                position: 'fixed',
                top: '2rem',
                right: '2rem',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => (
                    <div 
                        key={toast.toastId} 
                        className="notification-toast glass-strong"
                        onClick={() => {
                            if (toast.link) window.location.href = toast.link;
                            setToasts(prev => prev.filter(t => t.toastId !== toast.toastId));
                        }}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--primary-soft)',
                            borderRadius: '16px',
                            padding: '1rem 1.5rem',
                            minWidth: '280px',
                            maxWidth: '350px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                            animation: 'toastSlideIn 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards',
                            borderLeft: '5px solid var(--primary)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {toast.type === 'new_message' ? 'Mensaje Nuevo' : 'Notificación'}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(t => t.toastId !== toast.toastId)); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                            >
                                &times;
                            </button>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>{toast.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{toast.message}</p>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification-toast {
                    transition: all 0.3s ease;
                }
                .notification-toast:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 15px 40px rgba(0,0,0,0.6), 0 0 30px rgba(139, 92, 246, 0.3);
                }
            `}</style>
        </NotificationContext.Provider>
    );
};
