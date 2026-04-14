/**
 * Real OTP Service for Cooplance
 * Connects to the Node.js backend for email delivery.
 */

const API_URL = import.meta.env?.VITE_API_URL || 'https://cooplance-api.onrender.com/api/otp';

export const otpService = {
    /**
     * Calls backend to send an OTP to an email address
     */
    sendOTP: async (email, type = 'registration') => {
        try {
            console.log(` [OTP SERVICE] Requesting OTP from backend for ${email}`);
            const response = await fetch(`${API_URL}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type })
            });
            const data = await response.json();
            
            if (data.devFallback && data.otp) {
                console.warn(`[DEV FALLBACK] Your code is: ${data.otp}`);
            }
            
            return data;
        } catch (error) {
            console.error('[OTP SERVICE] Error connecting to backend:', error);
            return {
                success: false,
                message: 'No se pudo conectar con el servidor de correos.'
            };
        }
    },

    /**
     * Calls backend to verify the OTP provided by the user
     */
    verifyOTP: async (email, code) => {
        try {
            console.log(` [OTP SERVICE] Verifying code for ${email}`);
            
            // Magic code 123456 bypasses for dev ease
            if (code === '123456') {
                return { success: true, message: 'Verificación exitosa (Bypass).' };
            }
            
            const response = await fetch(`${API_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[OTP SERVICE] Error verifying code:', error);
            return {
                success: false,
                message: 'Error de conexión al verificar el código.'
            };
        }
    },

    /**
     * Frontend-only cooldown check (optional, but good for UX)
     */
    canResendOTP: (email) => {
        // We can still use localStorage for localized cooldowns to prevent spamming the button
        const lastSent = localStorage.getItem(`otp_last_sent_${email}`);
        if (!lastSent) return true;

        const secondsPassed = (Date.now() - parseInt(lastSent)) / 1000;
        return secondsPassed >= 30;
    },

    getResendCooldown: (email) => {
        const lastSent = localStorage.getItem(`otp_last_sent_${email}`);
        if (!lastSent) return 0;

        const secondsPassed = (Date.now() - parseInt(lastSent)) / 1000;
        const remaining = Math.ceil(30 - secondsPassed);
        return remaining > 0 ? remaining : 0;
    },

    markAsSent: (email) => {
        localStorage.setItem(`otp_last_sent_${email}`, Date.now().toString());
    }
};
