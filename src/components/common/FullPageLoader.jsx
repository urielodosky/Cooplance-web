import React from 'react';

const FullPageLoader = ({ message = "Verificando tu conexión segura..." }) => {
    return (
        <div className="full-page-loader">
            <div className="loader-content">
                <div className="cooplance-logo-loader">
                    <span className="logo-text">COOPLANCE</span>
                    <div className="logo-sparkle"></div>
                </div>
                <div className="loader-spinner"></div>
                <p className="loader-message">{message}</p>
                <span className="loader-subtext">Protegiendo tu sesión</span>
            </div>
        </div>
    );
};

export default FullPageLoader;
