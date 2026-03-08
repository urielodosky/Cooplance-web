import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { otpService } from '../../../utils/otpService';
import '../../../styles/pages/Login.scss';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: OTP
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [devCode, setDevCode] = useState(null);
    const [resendCount, setResendCount] = useState(0); // Track resends
    const navigate = useNavigate();

    // AUTO-FIX: Sync session to DB if missing (Common in dev/testing)
    React.useEffect(() => {
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const activeSession = JSON.parse(localStorage.getItem('cooplance_user') || 'null');

        if (activeSession && storedUsers.length === 0) {
            const recoveredUser = { ...activeSession, password: activeSession.password || '123456' };
            localStorage.setItem('cooplance_db_users', JSON.stringify([recoveredUser]));
        }
    }, []);

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setDevCode(null);

        // 1. Verify if user exists locally first
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');

        const userExists = storedUsers.some(u =>
            u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase()
        );

        if (!userExists) {
            setError('Usuario no registrado. Verifica tu email.');
            setIsLoading(false);
            return;
        }

        try {
            const result = await otpService.sendOTP(email, 'reset_password');
            if (result.success) {
                if (result.devOTP) {
                    setDevCode(result.devOTP);
                }
                setStep(2);
            } else {
                setError(result.message || 'Error al enviar el correo.');
            }
        } catch (err) {
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCount >= 2) {
            setError('Has alcanzado el límite de reenvíos. Intenta más tarde.');
            return;
        }

        setIsLoading(true);
        setError('');
        setDevCode(null);

        try {
            const result = await otpService.sendOTP(email, 'reset_password');
            if (result.success) {
                if (result.devOTP) {
                    setDevCode(result.devOTP);
                }
                setResendCount(prev => prev + 1);
                alert(`Código reenviado. Intentos restantes: ${2 - resendCount - 1}`);
            } else {
                setError('Error al reenviar.');
            }
        } catch (err) {
            setError('Error de conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await otpService.verifyOTP(email, otp);
            if (result.success) {
                navigate('/reset-password', { state: { email, verified: true } });
            } else {
                setError(result.message || 'Código incorrecto/expirado.');
            }
        } catch (err) {
            setError('Error de verificación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass login-card">
                <div className="login-header">
                    <h2>Recuperar Contraseña</h2>
                    <p>{step === 1 ? 'Ingresa tu email y te enviaremos un código.' : `Ingresa el código enviado a ${email}`}</p>
                </div>

                {step === 1 ? (
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
                            {isLoading ? 'Verificando...' : 'Verificar Email y Enviar Código'}
                        </button>

                        <div className="login-footer">
                            <Link to="/login" className="register-link">Volver al inicio de sesión</Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="login-form">
                        {devCode && (
                            <div style={{
                                background: 'rgba(234, 179, 8, 0.1)',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                color: '#fbbf24',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                textAlign: 'center',
                                fontSize: '0.9rem'
                            }}>
                                Código de prueba: <b style={{ fontSize: '1.1rem', color: '#fff', marginLeft: '0.5rem' }}>{devCode}</b>
                            </div>
                        )}

                        {error && <div className="error-message" style={{ color: 'var(--accent)', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

                        <div className="form-group">
                            <label>Código de Verificación</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.2rem' }}
                                maxLength={6}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary btn-full" disabled={isLoading}>
                            {isLoading ? 'Verificando...' : 'Verificar Código'}
                        </button>

                        <div className="login-footer">
                            <button
                                type="button"
                                onClick={handleResendCode}
                                className="text-link"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: resendCount >= 2 ? 'var(--text-muted)' : 'var(--primary)',
                                    cursor: resendCount >= 2 ? 'not-allowed' : 'pointer',
                                    textDecoration: 'underline'
                                }}
                                disabled={resendCount >= 2}
                            >
                                {resendCount >= 2 ? 'Límite de reenvíos alcanzado' : '¿No recibiste el código? Reenviar'}
                            </button>
                            {resendCount > 0 && resendCount < 2 && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--text-muted)' }}>({2 - resendCount} restantes)</span>}
                        </div>
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>Cambiar email</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
