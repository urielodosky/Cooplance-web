import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import FullPageLoader from './FullPageLoader';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show high-priority splash screen while checking session
    if (loading) {
        return <FullPageLoader message="Recuperando tu sesión de forma segura..." />;
    }

    if (!user) {
        // Redirect to login if user is not authenticated and loading is done
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};

export default ProtectedRoute;
