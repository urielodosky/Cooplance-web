import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPVerification from '../components/OTPVerification';
import '../../../styles/pages/Login.scss';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpStep, setOtpStep] = useState(false); // Show OTP form after credentials validated
    const { login, loginVerifyOtp, resendOtp, user } = useAuth();
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
            const result = await login({ email, password });
            
            if (result.requiresOtp) {
                // Credentials valid — show OTP step
                setOtpStep(true);
            }
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (code) => {
        await loginVerifyOtp(email, code);
        // If successful, the useEffect will navigate to dashboard
    };

    const handleOtpResend = async () => {
        // Re-send OTP via signInWithOtp
        const { supabase } = await import('../../../lib/supabase');
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw new Error(error.message);
    };

    // ─── OTP Step ──────────────────────────────────────────────────────
    if (otpStep) {
        return (
            <div className="container" style={{ paddingTop: '8rem' }}>
                <OTPVerification
                    email={email}
                    onVerify={handleOtpVerify}
                    onResend={handleOtpResend}
                    onCancel={() => setOtpStep(false)}
                />
            </div>
        );
    }

    // ─── Login Form ────────────────────────────────────────────────────
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
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
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
