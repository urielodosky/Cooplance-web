import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../styles/pages/NotificationsPage.scss';

const NotificationsPage = () => {
    const { user } = useAuth();
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const [selectedNotification, setSelectedNotification] = useState(null);

    // Auto-select the first unread or the first notification if none selected
    useEffect(() => {
        if (!selectedNotification && notifications.length > 0) {
            const firstUnread = notifications.find(n => !n.read);
            setSelectedNotification(firstUnread || notifications[0]);
        }
    }, [notifications, selectedNotification]);

    useEffect(() => {
        if (selectedNotification && !selectedNotification.read) {
            markAsRead(selectedNotification.id);
        }
    }, [selectedNotification, markAsRead]);

    if (!user) {
        return <div className="container" style={{ padding: '4rem' }}>Inicia sesión para ver tus notificaciones.</div>;
    }

    const formatFullDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatRelativeTime = (timestamp) => {
        const diff = new Date() - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days} d`;
    };

    const getIcon = (type, large = false) => {
        const size = large ? '32px' : '20px';
        switch (type) {
            case 'job_hired': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
            );
            case 'job_accepted': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#10b981' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            );
            case 'message': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#6366f1' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            );
            case 'coop_invite': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#f59e0b' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            );
            case 'role_change': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#8b5cf6' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            );
            case 'level_up': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#eab308' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            );
            case 'badge_earned': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, color: '#ef4444' }}>
                    <circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
            );
            default: return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            );
        }
    };

    return (
        <div className="container notifications-container">
            <div className="notifications-layout">

                {/* Sidebar List */}
                <div className="notifications-sidebar">
                    <div className="sidebar-header">
                        <h3 className="sidebar-title">Notificaciones</h3>
                        {notifications.length > 0 && notifications.some(n => !n.read) && (
                            <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', marginRight: '4px' }}>
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Marcar leídas
                            </button>
                        )}
                    </div>

                    <div className="notifications-list custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                </svg>
                                <p>No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-list-item ${selectedNotification?.id === notification.id ? 'active' : ''} ${!notification.read ? 'unread' : ''}`}
                                    onClick={() => setSelectedNotification(notification)}
                                >
                                    <div className="item-icon-wrapper">
                                        {getIcon(notification.type)}
                                        {!notification.read && <div className="unread-dot"></div>}
                                    </div>
                                    <div className="item-content">
                                        <h4 className="item-title">{notification.title}</h4>
                                        <p className="item-preview">{notification.message}</p>
                                        <span className="item-time">{formatRelativeTime(notification.timestamp)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main View Area */}
                <div className="notifications-main">
                    {selectedNotification ? (
                        <div className="notification-detail-view">
                            <div className="detail-header">
                                <div className="detail-icon-large">
                                    {getIcon(selectedNotification.type, true)}
                                </div>
                                <h2 className="detail-title">{selectedNotification.title}</h2>
                                <span className="detail-date">{formatFullDate(selectedNotification.timestamp)}</span>
                            </div>

                            <div className="detail-body">
                                <div className="message-box">
                                    <p className="detail-message">{selectedNotification.message}</p>
                                </div>
                            </div>

                            <div className="detail-footer">
                                {selectedNotification.link && (
                                    <button
                                        className="btn-primary action-btn"
                                        onClick={() => navigate(selectedNotification.link)}
                                    >
                                        Ver Detalles Completos
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="no-selection-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="no-selection-icon">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            <p>Selecciona una notificación para ver los detalles.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default NotificationsPage;
