import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/Explore.scss';

const Events = () => {
    const navigate = useNavigate();

    return (
        <div className="container" style={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            paddingTop: '4rem'
        }}>
            <div className="glass" style={{ padding: '3rem', maxWidth: '600px', width: '90%' }}>
                {/* Emoji removed for professional look */}
                <h1 className="explore-title" style={{ marginBottom: '1rem' }}>¡Próximamente!</h1>
                <p className="explore-subtitle" style={{ marginBottom: '2rem' }}>
                    Estamos preparando algo increíble para la comunidad. Muy pronto podrás asistir a eventos exclusivos, talleres y networking.
                </p>

                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--primary)',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Nuevo Evento: Carrera al Nivel 10</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        ¡El primer usuario en alcanzar el Nivel 10 ganará una insignia exclusiva y beneficios premium! ¿Aceptas el reto?
                    </p>
                </div>

                <button onClick={() => navigate('/explore')} className="btn-primary">
                    Explorar Servicios mientras tanto
                </button>
            </div>
        </div>
    );
};

export default Events;
