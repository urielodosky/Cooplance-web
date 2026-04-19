import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../../../styles/pages/Login.scss';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');
    const { resetPassword } = useAuth();

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await resetPassword(email);
            setIsSent(true);
        } catch (err) {
            console.error("[ForgotPassword] Error:", err);
            setError(err.message || 'Error al enviar el correo de recuperación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass login-card">
                <div className="login-header">
                    <h2>Recuperar Contraseña</h2>
                    <p>
                        {isSent 
                            ? '¡Correo enviado con éxito!' 
                            : 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.'}
                    </p>
                </div>

                {!isSent ? (
                    <form onSubmit={handleSendEmail} className="login-form">
                        {error && <div className="error-message" style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@correo.com"
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
                            {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>

                        <div className="login-footer">
                            <Link to="/login" className="register-link">Volver al inicio de sesión</Link>
                        </div>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                            Hemos enviado un enlace a <b>{email}</b>. 
                            Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
                        </p>
                        <Link to="/login" className="btn-primary btn-full">
                            Volver al Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
