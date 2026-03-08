import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../../../styles/pages/Login.scss';

const ResetPassword = () => {
    const [viewMode, setViewMode] = useState('reveal'); // 'reveal' or 'change'
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Check verification and load current password
    useEffect(() => {
        if (!location.state?.email || !location.state?.verified) {
            navigate('/forgot-password');
            return;
        }

        const email = location.state.email;
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const foundUser = storedUsers.find(u => u.email === email);

        if (foundUser) {
            setCurrentPassword(foundUser.password);
        } else {
            alert('Error: Usuario no encontrado.');
            navigate('/login');
        }
    }, [location, navigate]);

    if (!location.state?.email || !location.state?.verified) return null;
    const email = location.state.email;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        try {
            const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            const userIndex = storedUsers.findIndex(u => u.email === email);

            if (userIndex !== -1) {
                storedUsers[userIndex].password = password;
                localStorage.setItem('cooplance_db_users', JSON.stringify(storedUsers));
                setIsSubmitted(true);

                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err) {
            console.error(err);
            alert('Error al guardar.');
        }
    };

    return (
        <div className="login-container">
            <div className="glass login-card">

                {/* MODE 1: REVEAL PASSWORD */}
                {viewMode === 'reveal' && !isSubmitted && (
                    <>
                        <div className="login-header">
                            <h2>¡Cuenta Verificada!</h2>
                            <p>Hemos recuperado tus credenciales.</p>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tu contraseña actual es:</p>
                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '1rem',
                                borderRadius: '8px',
                                fontSize: '1.2rem',
                                letterSpacing: showCurrent ? '0' : '0.3rem',
                                fontFamily: showCurrent ? 'inherit' : 'monospace',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '1rem',
                                border: '1px solid var(--border)'
                            }}>
                                <span>{showCurrent ? currentPassword : '••••••••'}</span>
                                <button
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                    title={showCurrent ? "Ocultar" : "Mostrar"}
                                >
                                    {showCurrent ?
                                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        :
                                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    }
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary btn-full"
                            style={{ marginBottom: '1rem' }}
                        >
                            Conservar y Volver al Login
                        </button>

                        <button
                            onClick={() => setViewMode('change')}
                            className="btn-secondary btn-full"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border)',
                                color: '#ffffff',
                                marginTop: '1rem'
                            }}
                        >
                            Cambiar Contraseña
                        </button>
                    </>
                )}

                {/* MODE 2: CHANGE PASSWORD FORM */}
                {viewMode === 'change' && !isSubmitted && (
                    <>
                        <div className="login-header">
                            <h2>Nueva Contraseña</h2>
                            <p>Crea una contraseña segura.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label>Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button type="submit" className="btn-primary btn-full">
                                Actualizar Contraseña
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('reveal')}
                                style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </form>
                    </>
                )}

                {/* SUCCESS STATE */}
                {isSubmitted && (
                    <div className="success-message" style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3>¡Verificado!</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Tu contraseña ha sido actualizada.
                        </p>
                        <Link to="/login" className="btn-primary btn-full">
                            Ir al Login ahora
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
