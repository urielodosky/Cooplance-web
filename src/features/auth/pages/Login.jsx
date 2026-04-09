import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../../../styles/pages/Login.scss';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setLoading(true);
        try {
            await login({ email, password });
            // El useEffect se encargará de navegar si el usuario se carga
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión.');
            setLoading(false);
        } finally {
            // No quitamos el loading inmediatamente aquí si fue exitoso 
            // para evitar que el botón parpadee antes de navegar,
            // pero si en 5 segundos no hemos navegado, lo liberamos por seguridad.
            setTimeout(() => {
                if (window.location.pathname === '/login') {
                    setLoading(false);
                }
            }, 5000);
        }
    };

    return (
        <div className="container login-container">
            <div className="glass login-card">
                <div className="login-header">
                    <h2 className="login-title">Bienvenido</h2>
                    <p>Ingresa a tu cuenta para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div style={{ color: 'var(--accent)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="form-footer">
                    ¿No tienes una cuenta? <Link to="/register">Regístrate</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
