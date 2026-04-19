import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import '../styles/pages/NotFound.scss';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-container">
            <div className="not-found-content glass-strong">
                <div className="error-code">404</div>
                <div className="error-blob"></div>
                
                <h1>Oops! Página no encontrada</h1>
                <p>Parece que el enlace que seguiste se ha extraviado o la página ya no existe en Cooplance.</p>
                
                <div className="actions">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="btn-secondary"
                    >
                        <ArrowLeft size={18} />
                        Volver atrás
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="btn-primary"
                    >
                        <Home size={18} />
                        Ir al Inicio
                    </button>
                </div>
            </div>
            
            <div className="background-elements">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
            </div>
        </div>
    );
};

export default NotFound;
