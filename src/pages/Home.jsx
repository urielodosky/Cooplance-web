import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import '../styles/pages/Home.scss';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="container home-container">
            <header className="hero-header">
                <h1 className="hero-title">
                    Crecemos juntos,<br />
                    <span className="highlight-text">trabajás libre.</span>
                </h1>
                <p className="hero-description">
                    La plataforma que conecta freelancers, compradores y empresas en un ecosistema justo y transparente.
                </p>
                <div className="hero-buttons">
                    <Link to={user ? "/dashboard" : "/register"} className="btn-primary btn-hero-primary">
                        Comenzar ahora
                    </Link>
                </div>
            </header>

            <section className="roles-section">
                {['Freelancers', 'Empresas', 'Compradores'].map((role) => (
                    <div key={role} className="glass role-card">
                        <h3 className="role-title">{role}</h3>
                        <p className="role-description">
                            Descubre las oportunidades y beneficios diseñados para {role.toLowerCase()} en nuestra comunidad.
                        </p>
                        <Link to={`/info/${role.toLowerCase()}`} className="role-link">Saber más &rarr;</Link>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default Home;
