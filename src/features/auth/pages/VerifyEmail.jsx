import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPVerification from '../components/OTPVerification';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { register, login } = useAuth();

    const { email, role, type, userData, initialDebugOtp } = location.state || {};

    if (!email) {
        // Redirigir si no hay email (acceso directo a la página)
        setTimeout(() => navigate('/register'), 0);
        return null;
    }

    const handleVerifySuccess = () => {
        if (type === 'registration') {
            register(role, userData);
            navigate('/dashboard');
        } else if (type === 'login') {
            login(userData);
            navigate('/dashboard');
        }
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
                onVerify={handleVerifySuccess}
                onCancel={handleCancel}
                initialDebugOtp={initialDebugOtp}
            />
        </div>
    );
};

export default VerifyEmail;
