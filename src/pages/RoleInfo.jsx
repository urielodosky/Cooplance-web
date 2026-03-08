import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import "../styles/pages/Home.scss";
// Reusing home styles for cards

const roleData = {
    freelancers: {
        title: "Freelancers",
        heroTitle: "Trabaja con libertad y seguridad.",
        description: "Únete a una comunidad donde tu talento es valorado. Cooplance te ofrece herramientas para gestionar tus proyectos, pagos seguros y crecimiento profesional.",
        features: [
            { title: "Pagos Garantizados", desc: "El cliente deposita los fondos antes de iniciar. Tu trabajo siempre está cubierto." },
            { title: "Sistema de Niveles", desc: "Gana XP, sube de nivel y desbloquea beneficios exclusivos y menores comisiones." },
            { title: "Comunidad Activa", desc: "Participa en foros, eventos y conecta con otros profesionales." }
        ],
        ctaText: "Crear Perfil Freelancer",
        ctaLink: "/register?role=freelancer"
    },
    empresas: {
        title: "Empresas",
        heroTitle: "Talento verificado para tu negocio.",
        description: "Optimiza tus procesos de contratación. Encuentra profesionales calificados, gestiona equipos y factura de manera centralizada.",
        features: [
            { title: "Facturación Centralizada", desc: "Una sola factura para todos tus contratistas freelance." },
            { title: "Talento Top", desc: "Acceso a freelancers verificados y con excelentes calificaciones." },
            { title: "Gestión de Proyectos", desc: "Herramientas integrales para el seguimiento de entregables." }
        ],
        ctaText: "Registrar Empresa",
        ctaLink: "/register?role=company"
    },
    compradores: {
        title: "Compradores",
        heroTitle: "Haz realidad tus ideas.",
        description: "Ya sea un logo, una app o una consultoría, encuentra al experto ideal en minutos con seguridad total.",
        features: [
            { title: "Protección al Comprador", desc: "Si no recibes lo acordado, te devolvemos tu dinero." },
            { title: "Variedad de Servicios", desc: "Miles de categorías para cubrir cualquier necesidad." },
            { title: "Soporte 24/7", desc: "Estamos aquí para ayudarte en cada paso del proceso." }
        ],
        ctaText: "Empezar a Contratar",
        ctaLink: "/register?role=client" // Assuming client = buyer
    }
};

const RoleInfo = () => {
    const { roleId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Normalize to lowercase match
    const roleKey = roleId?.toLowerCase();
    const data = roleData[roleKey] || roleData['freelancers']; // Default fallback

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [roleKey]);

    const handleCtaClick = () => {
        if (user) {
            const confirmSwitch = window.confirm(
                `Estás conectado como ${user.username || 'usuario'}. ¿Quieres cerrar sesión para crear una nueva cuenta de ${data.title}?`
            );
            if (confirmSwitch) {
                logout();
                navigate(data.ctaLink);
            }
        } else {
            navigate(data.ctaLink);
        }
    };

    return (
        <div className="container home-container">
            <header className="hero-header">
                <h1 className="hero-title" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <span className="highlight-text">{data.heroTitle}</span>
                </h1>
                <p className="hero-description">{data.description}</p>
                <div className="hero-buttons">
                    <button
                        onClick={handleCtaClick}
                        className="btn-primary btn-hero-primary"
                        style={{ border: 'none', cursor: 'pointer' }}
                    >
                        {data.ctaText}
                    </button>
                </div>
            </header>

            <section className="roles-section">
                {data.features.map((feature, idx) => (
                    <div key={idx} className="glass role-card" style={{ textAlign: 'left' }}>
                        <h3 className="role-title" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{feature.title}</h3>
                        <p className="role-description" style={{ marginBottom: 0 }}>
                            {feature.desc}
                        </p>
                    </div>
                ))}
            </section>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                    Volver al inicio
                </Link>
            </div>
        </div>
    );
};

export default RoleInfo;
