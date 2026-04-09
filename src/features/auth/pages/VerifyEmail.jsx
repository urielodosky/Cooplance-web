import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OTPVerification from '../components/OTPVerification';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { confirmRegistration } = useAuth();

    const { email, role, type, userData, initialDebugOtp } = location.state || {};

    if (!email) {
        // Redirigir si no hay email (acceso directo a la página)
        setTimeout(() => navigate('/register'), 0);
        return null;
    }

    const handleVerifySuccess = async () => {
        try {
            // Confirm the already created user (this triggers the SQL profile creation)
            await confirmRegistration();

            // Clean up
            sessionStorage.removeItem('cooplance_pending_registration');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error during registration confirmation:', error);
            
            // Helpful error if user switched ports/sessions
            if (error.message.includes("No hay una sesión activa")) {
                alert("🔴 ERROR DE SESIÓN: Parece que estás en un puerto distinto (ej. 5173 vs 5174). \n\nPor favor, cierra todas las pestañas de Cooplance, abre solo UNA y vuelve a intentar el código.");
            } else {
                // The error message might already be user-friendly from AuthContext
                alert('No pudimos completar tu registro: ' + error.message);
            }
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
