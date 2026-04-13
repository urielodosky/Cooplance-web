import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPVerification from '../components/OTPVerification';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { verifyOtp, resendOtp } = useAuth();
    const [verificationError, setVerificationError] = useState(null);

    const { email, type } = location.state || {};

    if (!email) {
        setTimeout(() => navigate('/register'), 0);
        return null;
    }

    const handleVerify = async (code) => {
        setVerificationError(null);
        console.log("[VerifyEmail] Verifying OTP via Supabase...");
        
        // This calls supabase.auth.verifyOtp() which:
        // 1. Confirms the email (sets email_confirmed_at)
        // 2. Creates a session
        // 3. Triggers the SQL function that creates the profile
        await verifyOtp(email, code);

        console.log("[VerifyEmail] Verified! Redirecting to dashboard.");
        sessionStorage.removeItem('cooplance_pending_registration');
        navigate('/dashboard');
    };

    const handleResend = async () => {
        await resendOtp(email);
    };

    const handleCancel = () => {
        if (type === 'registration') {
            navigate('/register');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '8rem' }}>
            <OTPVerification
                email={email}
                onVerify={handleVerify}
                onResend={handleResend}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default VerifyEmail;
