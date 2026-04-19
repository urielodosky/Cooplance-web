import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../../../styles/pages/Login.scss';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { updatePassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            await updatePassword(password);
            setIsSubmitted(true);
            
            // Cleanup cooplance_db_users legacy data for this user if it exists
            // This is a safety measure to remove plain-text passwords from localStorage
            try {
                localStorage.removeItem('cooplance_db_users');
                localStorage.removeItem('cooplance_user');
            } catch (e) {
                // Ignore cleanup errors
            }

            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error("[ResetPassword] Error:", err);
            setError(err.message || 'Error al actualizar la contraseña. El enlace puede haber expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass login-card">
                <div className="login-header">
                    <h2>Nueva Contraseña</h2>
                    <p>
                        {isSubmitted 
                            ? 'Tu contraseña ha sido actualizada' 
                            : 'Crea una nueva contraseña segura para tu cuenta.'}
                    </p>
                </div>

                {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message" style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

                        <div className="form-group">
                            <label>Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                disabled={isLoading}
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
                                disabled={isLoading}
                            />
                        </div>

                        <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
                            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                ) : (
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
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3>¡Contraseña Actualizada!</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Ya puedes iniciar sesión con tus nuevas credenciales.
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
