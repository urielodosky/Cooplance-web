import React, { useState } from 'react';
import { FREELANCER_BENEFITS, CLIENT_BENEFITS } from '../data/levelBenefits';
import '../styles/pages/HelpCenter.scss';

const HelpCenter = () => {
    const [activeTab, setActiveTab] = useState('freelancers');

    const renderFreelancerGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Freelancers</h2>
            <p>Bienvenido a la comunidad de talento de Cooplance. Aquí te explicamos cómo crecer y obtener mejores beneficios.</p>

            <div className="help-section">
                <h3>¿Qué es un Freelancer en Cooplance?</h3>
                <p>Un freelancer es un profesional independiente que ofrece sus servicios a través de la plataforma. Puedes publicar "Servicios" (paquetes predefinidos) o postularte a "Proyectos" publicados por clientes.</p>
            </div>

            <div className="help-section">
                <h3>Sistema de Niveles y Beneficios</h3>
                <p>Tu progreso se mide en niveles (del 1 al 10). Subes de nivel acumulando XP (Experiencia) al completar trabajos y recibir buenas calificaciones.</p>
                <div className="benefits-table-wrapper">
                    <table className="benefits-table">
                        <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Título</th>
                                <th>Beneficios Clave</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(FREELANCER_BENEFITS).map(([level, data]) => (
                                <tr key={level}>
                                    <td><span className="level-badge">{level}</span></td>
                                    <td><strong>{data.name}</strong></td>
                                    <td>
                                        <ul className="benefits-list">
                                            {data.benefits.map((benefit, i) => (
                                                <li key={i}>{benefit}</li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="help-section">
                <h3>Política de Vacaciones</h3>
                <p>Sabemos que necesitas descansar. Por eso ofrecemos un "Modo Vacaciones" que congela tu XP para evitar penalizaciones por inactividad.</p>
                <ul>
                    <li>Tienes <strong>4 usos de 15 días</strong> cada uno por año.</li>
                    <li>Mientras estás activo en vacaciones, no puedes recibir nuevos trabajos, pero tu XP no decae.</li>
                    <li>Debes activarlo manualmente desde tu Panel de Control.</li>
                </ul>
            </div>
        </div>
    );

    const renderClientGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Clientes (Particulares)</h2>
            <p>Encuentra al talento perfecto para tus proyectos personales o puntuales.</p>

            <div className="help-section">
                <h3>¿Cómo contratar?</h3>
                <ol>
                    <li><strong>Explorar Servicios:</strong> Busca servicios ya definidos por freelancers (ej. "Logo por $50").</li>
                    <li><strong>Publicar Proyecto:</strong> Si necesitas algo específico, publica un proyecto detallando tus requerimientos y presupuesto.</li>
                </ol>
            </div>

            <div className="help-section">
                <h3>Niveles de Cliente</h3>
                <p>Los clientes también tienen niveles que desbloquean capacidades de gestión y contratación simultánea.</p>
                <div className="benefits-table-wrapper">
                    <table className="benefits-table">
                        <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Título</th>
                                <th>Capacidades</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(CLIENT_BENEFITS).map(([level, data]) => (
                                <tr key={level}>
                                    <td><span className="level-badge client">{level}</span></td>
                                    <td><strong>{data.name}</strong></td>
                                    <td>
                                        <ul className="benefits-list">
                                            {data.benefits.map((benefit, i) => (
                                                <li key={i}>{benefit}</li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderCompanyGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Empresas</h2>
            <p>Soluciones robustas para organizaciones y contratación de equipos.</p>

            <div className="help-section">
                <h3>Perfil de Empresa</h3>
                <p>Las cuentas de empresa tienen características especiales diseñadas para el flujo de trabajo corporativo:</p>
                <ul>
                    <li><strong>Verificación:</strong> Insignia de empresa verificada para mayor confianza.</li>
                    <li><strong>Publicación Avanzada:</strong> Campos adicionales en proyectos (Vacantes, Duración de Contrato, Frecuencia de Pago).</li>
                    <li><strong>Gestión de Equipos:</strong> Herramientas para manejar múltiples freelancers.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Reclutamiento</h3>
                <p>Publica ofertas con detalles de "Puesto" en lugar de solo tareas puntuales. Atrae talento para relaciones a largo plazo definiendo condiciones claras de contrato.</p>
            </div>
        </div>
    );

    const renderTerms = () => (
        <div className="help-content fade-in">
            <h2>Términos y Condiciones</h2>
            <p className="last-updated">Última actualización: Febrero 2026</p>

            <div className="legal-text">
                <h3>1. Aceptación de los términos</h3>
                <p>Al acceder y utilizar Cooplance, aceptas estar sujeto a estos términos y todas las leyes aplicables. Si no estás de acuerdo con alguno de estos términos, tienes prohibido usar o acceder a este sitio.</p>

                <h3>2. Uso de la Licencia</h3>
                <p>Se concede permiso para descargar temporalmente una copia de los materiales (información o software) en el sitio web de Cooplance solo para visualización transitoria personal y no comercial.</p>

                <h3>3. Descargo de responsabilidad</h3>
                <p>Los materiales en el sitio web de Cooplance se proporcionan "tal cual". Cooplance no ofrece garantías, expresas o implícitas, y por la presente renuncia y niega todas las otras garantías.</p>

                <h3>4. Limitaciones</h3>
                <p>En ningún caso Cooplance o sus proveedores serán responsables de ningún daño (incluyendo, sin limitación, daños por pérdida de datos o beneficios, o debido a la interrupción del negocio) que surjan del uso o la incapacidad de usar los materiales en Cooplance.</p>
            </div>
        </div>
    );

    const renderPrivacy = () => (
        <div className="help-content fade-in">
            <h2>Políticas de Privacidad</h2>
            <p className="last-updated">Última actualización: Febrero 2026</p>

            <div className="legal-text">
                <h3>1. Su privacidad es importante</h3>
                <p>Es política de Cooplance respetar su privacidad con respecto a cualquier información que podamos recopilar mientras operamos nuestro sitio web.</p>

                <h3>2. Información que recopilamos</h3>
                <p>Recopilamos información personal que usted nos proporciona voluntariamente al registrarse, como su nombre, correo electrónico y detalles de perfil profesional.</p>

                <h3>3. Seguridad</h3>
                <p>Valoramos su confianza al proporcionarnos su información personal, por lo que nos esforzamos por utilizar medios comercialmente aceptables para protegerla.</p>

                <h3>4. Cookies</h3>
                <p>Utilizamos cookies para mejorar su experiencia y analizar nuestro tráfico. Al navegar por nuestro sitio, acepta nuestro uso de cookies.</p>
            </div>
        </div>
    );

    return (
        <div className="help-center-container fade-in">
            {/* Sidebar Navigation */}
            <aside className="help-sidebar glass-panel">
                <div className="help-menu-title">Centro de Ayuda</div>
                <nav className="help-nav">
                    <button
                        className={`help-nav-item ${activeTab === 'freelancers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('freelancers')}
                    >
                        Freelancers
                    </button>
                    <button
                        className={`help-nav-item ${activeTab === 'clients' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clients')}
                    >
                        Clientes
                    </button>
                    <button
                        className={`help-nav-item ${activeTab === 'companies' ? 'active' : ''}`}
                        onClick={() => setActiveTab('companies')}
                    >
                        Empresas
                    </button>

                    <div className="separator"></div>

                    <button
                        className={`help-nav-item ${activeTab === 'terms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('terms')}
                    >
                        Términos y Condiciones
                    </button>
                    <button
                        className={`help-nav-item ${activeTab === 'privacy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('privacy')}
                    >
                        Política de Privacidad
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="help-main glass-panel">
                {activeTab === 'freelancers' && renderFreelancerGuide()}
                {activeTab === 'clients' && renderClientGuide()}
                {activeTab === 'companies' && renderCompanyGuide()}
                {activeTab === 'terms' && renderTerms()}
                {activeTab === 'privacy' && renderPrivacy()}
            </main>
        </div>
    );
};

export default HelpCenter;
