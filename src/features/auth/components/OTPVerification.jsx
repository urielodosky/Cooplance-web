import React, { useState, useEffect, useRef } from 'react';
import { otpService } from '../../../utils/otpService';
import '../../../styles/components/OTPVerification.scss';

const OTPVerification = ({ email, onVerify, onCancel, initialDebugOtp }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
    const [canResend, setCanResend] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [error, setError] = useState('');
    const [debugOtp, setDebugOtp] = useState(initialDebugOtp || '');
    const [loading, setLoading] = useState(false);
    const [resendCount, setResendCount] = useState(0);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Initial cooldown check
        const initialCooldown = otpService.getResendCooldown(email);
        setCooldown(initialCooldown);
        setCanResend(initialCooldown === 0);

        // Timer for 3 minute expiration
        const expirationTimer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Try to find debug OTP in localStorage if not provided
        if (!debugOtp) {
            const stored = localStorage.getItem(`otp_demo_${email}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setDebugOtp(parsed.code);
                } catch (e) {}
            }
        }

        // Timer for 30s resend cooldown
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
    }, [email, debugOtp]);

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
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
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

        try {
            const result = await otpService.verifyOTP(email, fullCode);

            if (result.success) {
                await onVerify(); // <--- Await the actual database confirmation
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend || resendCount >= 2) return;

        setLoading(true);
        const result = await otpService.sendOTP(email, 'resend');

        if (result.success) {
            // Update debug OTP if present in resend response
            if (result.devOTP) setDebugOtp(result.devOTP);

            otpService.markAsSent(email);
            setResendCount(prev => prev + 1);
            setCanResend(false);
            setCooldown(30);
            setTimeLeft(180);
            setOtp(['', '', '', '', '', '']);
            if (inputRefs.current[0]) {
                inputRefs.current[0].focus();
            }
            setError('');
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="otp-container">
            <h3>Verificación de Correo</h3>
            <p className="otp-subtitle">Hemos enviado un código de 6 dígitos a: <strong>{email}</strong></p>

            <div className="otp-inputs">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        autoFocus={index === 0}
                    />
                ))}
            </div>

            {debugOtp && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.8rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px dashed var(--primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--primary)',
                    textAlign: 'center'
                }}>
                    🛠️ MODO DEBUG: Tu código es <strong>{debugOtp}</strong>
                </div>
            )}

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
                    disabled={!canResend || resendCount >= 2}
                >
                    {resendCount >= 2 ? 'Límite de reenvíos superado' : canResend ? 'Reenviar Código' : `Reenviar en ${cooldown}s`}
                </button>

                <button className="btn-text" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default OTPVerification;
