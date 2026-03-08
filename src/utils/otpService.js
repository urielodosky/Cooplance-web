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

        // Store in localStorage for verification
        localStorage.setItem(`otp_demo_${email}`, fakeOtp);

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

        const storedOtp = localStorage.getItem(`otp_demo_${email}`);

        // Accept either the stored OTP or a magic '123456' for ease of use
        if (code === storedOtp || code === '123456') {
            return { success: true, message: 'Verificación exitosa.' };
        } else {
            return { success: false, message: 'Código incorrecto. Intenta con 123456' };
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
