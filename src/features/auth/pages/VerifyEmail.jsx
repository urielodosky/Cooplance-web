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

    const handleVerifySuccess = async () => {
        // Retrieve pending registration data from sessionStorage
        const pendingData = JSON.parse(sessionStorage.getItem('cooplance_pending_registration'));

        if (pendingData) {
            try {
                const { role, data } = pendingData;
                await register(role, data);

                // Clean up
                sessionStorage.removeItem('cooplance_pending_registration');
                navigate('/dashboard');
            } catch (error) {
                console.error('Error during Supabase registration:', error);
                alert('Error al crear la cuenta en la Base de Datos: ' + error.message);
            }
        } else {
            console.error('No pending registration found in sessionStorage');
            navigate('/register');
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
