import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/components/OTPVerification.scss';

const OTPVerification = ({ email, onVerify, onResend, onCancel }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
    const [canResend, setCanResend] = useState(false);
    const [cooldown, setCooldown] = useState(60); // Initial 60s cooldown after first send
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCount, setResendCount] = useState(0);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Timer for expiration
        const expirationTimer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Timer for resend cooldown
        const cooldownTimer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(expirationTimer);
            clearInterval(cooldownTimer);
        };
    }, []);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            // Focus on the next empty input or last one
            const nextIndex = Math.min(pastedData.length, 5);
            if (inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex].focus();
            }
        }
    };

    const handleVerify = async () => {
        const fullCode = otp.join('');
        if (fullCode.length < 6) {
            setError('Por favor ingresa los 6 dígitos.');
            return;
        }

        setLoading(true);
        setError('');

        // Watchdog: unlock after 25s if hung
        const watchdog = setTimeout(() => {
            setLoading(false);
            setError('La verificación tardó demasiado. Intenta de nuevo.');
        }, 25000);

        try {
            await onVerify(fullCode);
            // If onVerify succeeds, the parent component will navigate away
        } catch (err) {
            console.error('[OTP] Verification error:', err);
            setError(err.message || 'Código incorrecto o expirado.');
        } finally {
            clearTimeout(watchdog);
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || resendCount >= 3) return;

        setLoading(true);
        setError('');

        try {
            await onResend();
            setResendCount(prev => prev + 1);
            setCanResend(false);
            setCooldown(60);
            setTimeLeft(180);
            setOtp(['', '', '', '', '', '']);
            if (inputRefs.current[0]) inputRefs.current[0].focus();
        } catch (err) {
            setError(err.message || 'Error al reenviar el código.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="otp-container">
            <h3>Verificación de Correo</h3>
            <p className="otp-subtitle">
                Hemos enviado un código de 6 dígitos a: <strong>{email}</strong>
            </p>

            <div className="otp-inputs">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        autoFocus={index === 0}
                    />
                ))}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Revisa tu bandeja de entrada y la carpeta de spam.
            </p>

            {error && <p className="otp-error">{error}</p>}

            <div className="otp-timer">
                El código expira en: <span>{formatTime(timeLeft)}</span>
            </div>

            <div className="otp-actions">
                <button
                    className="btn-primary"
                    onClick={handleVerify}
                    disabled={loading || timeLeft === 0}
                >
                    {loading ? 'Verificando...' : 'Verificar Código'}
                </button>

                <button
                    className="btn-secondary"
                    onClick={handleResend}
                    disabled={!canResend || resendCount >= 3 || loading}
                >
                    {resendCount >= 3 
                        ? 'Límite de reenvíos alcanzado' 
                        : canResend 
                            ? 'Reenviar Código' 
                            : `Reenviar en ${cooldown}s`
                    }
                </button>

                <button className="btn-text" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default OTPVerification;
