import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { getProfilePicture } from '../../utils/avatarUtils';
import { useTheme } from '../../context/ThemeContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import '../../styles/components/Navbar.scss';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showExploreMenu, setShowExploreMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const exploreDropdownRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
            if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target)) {
                setShowExploreMenu(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.mobile-menu-btn')) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const handleOptionClick = (path, action) => {
        setShowProfileMenu(false);
        setShowExploreMenu(false);
        setIsMobileMenuOpen(false);
        if (action === 'logout') {
            logout();
        } else if (path) {
            navigate(path);
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <nav className="glass navbar">
            <div className="brand-container">
                <Link to="/" className="brand-link">
                    <div className="brand-text">
                        COOPLANCE
                    </div>
                </Link>
            </div>

            {/* DESKTOP LINKS */}
            <div className="nav-links desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="nav-profile-menu-container" ref={exploreDropdownRef}>
                    <button
                        onClick={() => setShowExploreMenu(!showExploreMenu)}
                        className={`nav-link ${showExploreMenu ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', padding: 0, color: 'inherit' }}
                    >
                        Explorar Servicios
                        <span className={`dropdown-chevron ${showExploreMenu ? 'up' : ''}`} style={{ fontSize: '0.8rem' }}>▼</span>
                    </button>
                    {showExploreMenu && (
                        <div className="nav-profile-dropdown glass" style={{ left: 0, right: 'auto', minWidth: '180px' }}>
                            {(!user || user.role === 'freelancer') && (
                                <button onClick={() => handleOptionClick('/explore-clients')} className="dropdown-item">
                                    Clientes
                                </button>
                            )}
                            <button onClick={() => handleOptionClick('/explore')} className="dropdown-item">
                                Freelancers
                            </button>
                            <button onClick={() => handleOptionClick('/companies')} className="dropdown-item">
                                Empresas
                            </button>
                            <button onClick={() => handleOptionClick('/my-coops')} className="dropdown-item">
                                Coops
                            </button>
                        </div>
                    )}
                </div>

                <Link to="/community" className="nav-link">Comunidad</Link>
                <Link to="/events" className="nav-link" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Eventos</Link>
            </div>

            {/* DESKTOP ACTIONS */}
            <div className="nav-actions desktop-only">
                <button
                    onClick={toggleTheme}
                    className="theme-toggle"
                    title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                >
                    {theme === 'dark' ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    )}
                </button>

                {user && (user.role === 'buyer' || user.role === 'company') && (
                    <Link to="/create-project" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', marginRight: '1rem', display: 'inline-flex', alignItems: 'center', height: 'fit-content' }}>
                        {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Pedido'}
                    </Link>
                )}

                {user ? (
                    <div className="nav-actions-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <NotificationDropdown />
                        <div className="nav-profile-menu-container" ref={dropdownRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className={`nav-profile-btn ${showProfileMenu ? 'active' : ''}`}
                            >
                                <img
                                    src={getProfilePicture(user)}
                                    alt="Profile"
                                    className="nav-profile-avatar-small"
                                />
                                Perfil
                                <span className={`dropdown-chevron ${showProfileMenu ? 'up' : ''}`}>▼</span>
                            </button>

                            {showProfileMenu && (
                                <div className="nav-profile-dropdown glass">
                                    <button onClick={() => handleOptionClick('/settings')} className="dropdown-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        Configuración
                                    </button>
                                    {((user.role === 'freelancer') || ((user.role === 'buyer' || user.role === 'company') && (user.level || 1) >= 6)) && (
                                        <button onClick={() => handleOptionClick('/my-coops')} className="dropdown-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                            Mis Coops
                                        </button>
                                    )}
                                    <button onClick={() => handleOptionClick('/wallet')} className="dropdown-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                                        Billetera
                                    </button>
                                    <button onClick={() => handleOptionClick('/chat')} className="dropdown-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        Mensajes
                                    </button>
                                    <button onClick={() => handleOptionClick('/dashboard')} className="dropdown-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                                        Mis Servicios
                                    </button>
                                    <button onClick={() => handleOptionClick('/help')} className="dropdown-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        Ayuda
                                    </button>
                                    <div className="dropdown-divider"></div>
                                    <button onClick={() => handleOptionClick(null, 'logout')} className="dropdown-item logout">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="nav-actions-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={() => navigate('/login')} className="btn-login">Iniciar sesión</button>
                        <button onClick={() => navigate('/register')} className="btn-primary">Registrarse</button>
                    </div>
                )}
            </div>

            {/* MOBILE CONTROLS */}
            <div className="mobile-controls">
                <button onClick={toggleTheme} className="theme-toggle mobile-theme-toggle">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isMobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                    </svg>
                </button>
            </div>

            {/* MOBILE MENU PORTAL */}
            {createPortal(
                <>
                    <div className={`mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className={`mobile-menu glass ${isMobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
                        <div className="mobile-menu-header">
                            <span className="mobile-brand-text">COOPLANCE</span>
                            <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="mobile-nav-links">
                            {(!user || user.role === 'freelancer') && (
                                <Link to="/explore-clients" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Explorar Clientes</Link>
                            )}
                            <Link to="/explore" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Explorar Freelancers</Link>
                            <Link to="/companies" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Explorar Empresas</Link>
                            <Link to="/my-coops" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Explorar Coops</Link>

                            <Link to="/community" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Comunidad</Link>
                            <Link to="/events" className="mobile-nav-link text-accent" onClick={() => setIsMobileMenuOpen(false)}>Eventos</Link>

                            {user && (user.role === 'buyer' || user.role === 'company') && (
                                <Link to="/create-project" className="btn-primary mobile-create-btn" onClick={() => setIsMobileMenuOpen(false)}>
                                    {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Pedido'}
                                </Link>
                            )}
                        </div>

                        <div className="mobile-nav-actions">
                            {user ? (
                                <>
                                    <div className="mobile-user-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img src={getProfilePicture(user)} alt="Profile" className="nav-profile-avatar-small" />
                                            <span>{user.username || user.firstName}</span>
                                        </div>
                                        <NotificationDropdown />
                                    </div>
                                    {((user.role === 'freelancer') || ((user.role === 'buyer' || user.role === 'company') && (user.level || 1) >= 6)) && (
                                        <button onClick={() => handleOptionClick('/my-coops')} className="mobile-action-btn">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                            Mis Coops
                                        </button>
                                    )}
                                    <button onClick={() => handleOptionClick('/dashboard')} className="mobile-action-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                                        Mis Servicios / Dashboard
                                    </button>
                                    <button onClick={() => handleOptionClick('/settings')} className="mobile-action-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        Configuración
                                    </button>
                                    <button onClick={() => handleOptionClick('/wallet')} className="mobile-action-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                                        Billetera
                                    </button>
                                    <button onClick={() => handleOptionClick('/chat')} className="mobile-action-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        Mensajes
                                    </button>
                                    <button onClick={() => handleOptionClick('/help')} className="mobile-action-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        Ayuda
                                    </button>
                                    <button onClick={() => handleOptionClick(null, 'logout')} className="mobile-action-btn logout">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="item-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        Cerrar Sesión
                                    </button>
                                </>
                            ) : (
                                <div className="mobile-auth-buttons">
                                    <button onClick={() => navigate('/login')} className="btn-login mobile-btn">Iniciar sesión</button>
                                    <button onClick={() => navigate('/register')} className="btn-primary mobile-btn">Registrarse</button>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </nav>
    );
};

export default Navbar;
