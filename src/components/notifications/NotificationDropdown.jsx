import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import '../../styles/components/NotificationDropdown.scss';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();
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

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    };

    const formatRelativeTime = (timestamp) => {
        const diff = new Date() - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="notification-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''} ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Bell size={22} strokeWidth={2.5} />
                {unreadCount > 0 && (
                    <span className="notification-badge" style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: '#ef4444', color: 'white',
                        borderRadius: '50%', width: '18px', height: '18px',
                        fontSize: '0.65rem', fontWeight: '800',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                        border: '2px solid var(--bg-card)'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown-menu glass-strong" style={{
                    position: 'absolute', top: '100%', right: 0,
                    width: '340px', maxHeight: '480px', overflowY: 'hidden',
                    zIndex: 1000, borderRadius: '20px', marginTop: '12px',
                    border: '1px solid var(--border)', boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                    background: 'var(--bg-card)', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Notificaciones</h4>
                        {unreadCount > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-soft)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Check size={14} /> Marcar todo
                            </button>
                        )}
                    </div>

                    <div className="notification-list custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Bell size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>No tienes notificaciones aún</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                    style={{
                                        padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                        background: n.read ? 'transparent' : 'rgba(139, 92, 246, 0.05)',
                                        position: 'relative', display: 'flex', gap: '1rem'
                                    }}
                                >
                                    {!n.read && <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: 'var(--primary)' }}></div>}
                                    
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: n.read ? '600' : '800', color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                                {n.title}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                {formatRelativeTime(n.timestamp)}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {n.message}
                                        </p>
                                        {n.link && (
                                            <div style={{ marginTop: '6px', fontSize: '0.7rem', color: 'var(--primary-soft)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                                                <ExternalLink size={10} /> Ver detalle
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', opacity: 0.3, transition: 'opacity 0.2s' }}
                                        className="delete-notif-btn"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={{ padding: '0.8rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                            <button 
                                onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Ver todas las notificaciones
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
