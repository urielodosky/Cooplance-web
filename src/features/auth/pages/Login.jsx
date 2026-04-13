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
        // Only redirect if there is a stable user session and no pending login steps
        if (user && !loading && !otpStep) {
            navigate('/dashboard');
        }
    }, [user, navigate, loading, otpStep]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setLoading(true);
        console.log("[Login] Starting handleSubmit...");
        try {
            const result = await login({ email, password });
            console.log("[Login] Login result received:", result);
            
            if (result && result.requiresOtp) {
                console.log("[Login] Credentials valid — setting otpStep to true");
                setOtpStep(true);
            } else {
                console.warn("[Login] Login result did not require OTP or result is null");
            }
        } catch (err) {
            console.error("[Login] Error during login:", err);
            setError(err.message || 'Error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (code) => {
        try {
            await loginVerifyOtp(email, code);
            console.log("[Login] OTP verified successfully. Clearing otpStep.");
            setOtpStep(false);
        } catch (err) {
            console.error("[Login] OTP verification failed:", err);
            // Error is handled by the OTPVerification component's UI
            throw err;
        }
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
                    <h2 className="login-title">Bienvenido a Cooplance</h2>
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
