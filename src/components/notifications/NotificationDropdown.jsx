import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import '../../styles/components/NotificationDropdown.scss';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Refresh notifications when opening dropdown just in case
    useEffect(() => {
        if (isOpen) refresh();
    }, [isOpen, refresh]);

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
        navigate('/notifications', { state: { selectedNotificationId: notification.id } });
        setIsOpen(false);
    };

    const toggleDropdown = () => setIsOpen(!isOpen);

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

    const getIcon = (type) => {
        switch (type) {
            case 'job_hired': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
            );
            case 'job_accepted': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#10b981' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            );
            case 'message': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#6366f1' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            );
            case 'coop_invite': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#f59e0b' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            );
            case 'role_change': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            );
            case 'level_up': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#eab308' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            );
            case 'badge_earned': return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: '#ef4444' }}>
                    <circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
            );
            default: return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            );
        }
    };

    const displayNotifications = notifications.slice(0, 2); // Show max 2 in dropdown

    return (
        <div className="notification-dropdown-container" ref={dropdownRef}>
            <button
                className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''} ${isOpen ? 'active' : ''}`}
                onClick={() => navigate('/notifications')}
                title="Notificaciones"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown-menu glass">
                    <div className="notification-header">
                        <h4>Notificaciones</h4>
                        {unreadCount > 0 && (
                            <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <div className="notification-list custom-scrollbar">
                        {displayNotifications.length === 0 ? (
                            <div className="empty-notifications">
                                <span className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px' }}>
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                </span>
                                <p>No tienes notificaciones nuevas</p>
                            </div>
                        ) : (
                            displayNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-title">{notification.title}</p>
                                        <p className="notification-message">{notification.message}</p>
                                        <span className="notification-time">{formatRelativeTime(notification.timestamp)}</span>
                                    </div>
                                    {!notification.read && <div className="unread-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="notification-dropdown-footer">
                        <button
                            className="view-all-btn"
                            onClick={() => {
                                navigate('/notifications');
                                setIsOpen(false);
                            }}
                        >
                            Ver todas las notificaciones
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
