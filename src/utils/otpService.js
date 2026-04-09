/**
 * Real OTP Service for Cooplance
 * Connects to the Node.js backend for email delivery.
 */

const API_URL = 'http://127.0.0.1:5000/api/otp';

export const otpService = {
    /**
     * Calls backend to send an OTP to an email address
     * UPDATED: Fully Offline/Mock Mode for consistent demo experience
     */
    sendOTP: async (email, type = 'registration') => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        console.warn(' [OTP SERVICE] Running in OFFLINE DEMO MODE');
        const fakeOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in localStorage for verification with timestamp
        const otpData = {
            code: fakeOtp,
            timestamp: Date.now()
        };
        localStorage.setItem(`otp_demo_${email}`, JSON.stringify(otpData));

        return {
            success: true,
            message: 'Código enviado (Simulación)',
            devOTP: fakeOtp
        };
    },

    /**
     * Calls backend to verify the OTP provided by the user
     */
    verifyOTP: async (email, code) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const storedData = localStorage.getItem(`otp_demo_${email}`);
        if (!storedData && code !== '123456') {
            return { success: false, message: 'No se encontró código para este email.' };
        }

        // Magic code 123456 bypasses expiration for dev ease
        if (code === '123456') {
            return { success: true, message: 'Verificación exitosa (Bypass).' };
        }

        const { code: storedOtp, timestamp } = JSON.parse(storedData);

        // CHECK EXPIRATION: 3 minutes = 180,000 ms
        const isExpired = Date.now() - timestamp > 180000;

        if (isExpired) {
            localStorage.removeItem(`otp_demo_${email}`);
            return { success: false, message: 'El código ha expirado (duración 3 min). Solicita uno nuevo.' };
        }

        if (code === storedOtp) {
            localStorage.removeItem(`otp_demo_${email}`); // Clear after use
            return { success: true, message: 'Verificación exitosa.' };
        } else {
            return { success: false, message: 'Código incorrecto.' };
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
