import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { otpService } from '../../../utils/otpService';
import '../../../styles/pages/Login.scss';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (identifier && password) {
            setLoading(true);
            // Validate against mock database
            const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            const foundUser = storedUsers.find(u =>
                (u.email?.toLowerCase() === identifier.toLowerCase() || u.username?.toLowerCase() === identifier.toLowerCase()) &&
                u.password === password
            );

            if (foundUser) {
                if (foundUser.email) {
                    // Send OTP to email and redirect to separate page
                    otpService.sendOTP(foundUser.email, 'login').then(result => {
                        setLoading(false);
                        if (result.success) {
                            otpService.markAsSent(foundUser.email);
                            navigate('/verify-email', {
                                state: {
                                    email: foundUser.email,
                                    type: 'login',
                                    userData: foundUser,
                                    initialDebugOtp: result.devOTP
                                }
                            });
                        } else {
                            setError(result.message);
                        }
                    }).catch(err => {
                        setLoading(false);
                        setError('Error al conectar con el servidor de correos.');
                    });
                } else {
                    setLoading(false);
                    // If no email (legacy data), just login
                    login(foundUser);
                    navigate('/dashboard');
                }
            } else {
                setLoading(false);
                setError('Correo o contraseña incorrectos. (Asegúrate de haberte registrado)');
            }
        } else {
            setError('Por favor completa todos los campos.');
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
                        <label className="form-label">Correo Electrónico o Usuario</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="ejemplo@correo.com o usuario"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
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
                        {loading ? 'Enviando código...' : 'Iniciar Sesión'}
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
