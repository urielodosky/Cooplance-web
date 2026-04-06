import React, { useState } from 'react';
import ProfileTestModal from '../components/home/ProfileTestModal';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import '../styles/pages/Home.scss';

const Home = () => {
    const { user } = useAuth();
    const [showTestModal, setShowTestModal] = useState(false);

    return (
        <div className="container home-container">
            <header className="hero-header">
                <h1 className="hero-title">
                    Crecemos juntos<br />
                    <span className="highlight-text">trabajás libre.</span>
                </h1>
                <p className="hero-description">
                    La plataforma que conecta freelancers, clientes y empresas en un ecosistema justo y transparente.
                </p>
                <div className="hero-buttons">
                    <Link to={user ? "/dashboard" : "/register"} className="btn-primary btn-hero-primary">
                        Comenzar ahora
                    </Link>
                    <Link to="/help" className="btn-secondary btn-hero-secondary" style={{ marginLeft: '1rem' }}>
                        Guía
                    </Link>
                </div>
            </header>

            <div className="test-cta-inline">
                <p>¿No sabés qué cuenta elegir? <button className="btn-link" onClick={() => setShowTestModal(true)}>Descubrilo con un Test Rápido</button></p>
            </div>

            <section className="roles-section">
                {[
                    {
                        title: 'Freelancers',
                        description: 'Publicá tus servicios, forma agencias (Coops) con otros talentos y subí de nivel para reducir comisiones. Ideal para profesionales independientes.',
                        link: '/info/freelancers'
                    },
                    {
                        title: 'Empresas',
                        description: 'Publicá ofertas laborales a gran escala, reclutá talento y contratá agencias (Coops) completas para escalar tu negocio con herramientas exclusivas.',
                        link: '/info/empresas'
                    },
                    {
                        title: 'Clientes',
                        description: 'Explorá el catálogo de servicios, contactá freelancers y resolvé tus necesidades o proyectos personales de forma rápida y segura.',
                        link: '/info/clientes'
                    }
                ].map((role) => (
                    <div key={role.title} className="glass role-card">
                        <h3 className="role-title">{role.title}</h3>
                        <p className="role-description">
                            {role.description}
                        </p>
                        <Link to={role.link} className="role-link">Saber más &rarr;</Link>
                    </div>
                ))}
            </section>
            <ProfileTestModal isOpen={showTestModal} onClose={() => setShowTestModal(false)} />
        </div>
    );
};

export default Home;
