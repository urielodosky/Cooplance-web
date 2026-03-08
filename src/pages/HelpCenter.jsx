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

            <div className="help-section">
                <h3>Ganancia de Experiencia (XP) y Ganancias</h3>
                <p>Tu XP te permite subir de nivel. Toma en cuenta la siguiente estructura básica de ganancias de XP por trabajo completado:</p>
                <ul>
                    <li>Mayor a $140.000: <strong>80 XP</strong></li>
                    <li>Mayor a $70.000: <strong>40 XP</strong></li>
                    <li>Mayor a $28.000: <strong>30 XP</strong></li>
                    <li>De $7.000 a $28.000: <strong>10 XP</strong></li>
                </ul>
                <p><em>* Nivel 1: Menos de $140.000 otorga 40 XP fijos.</em></p>
            </div>

            <div className="help-section">
                <h3>¿Cómo Crear un Servicio?</h3>
                <ol>
                    <li>Dirígete a tu Panel de Control y luego a "Mis Servicios" o usa el acceso directo "Publicar Servicio".</li>
                    <li>Rellena la información básica: título, descripción, etiquetas y modalidad (remoto o presencial).</li>
                    <li>Configura tus precios, tiempos de entrega y revisiones (puedes activar paquetes).</li>
                    <li>Carga tu imagen de portada y video de promoción.</li>
                    <li>Publica el servicio.</li>
                </ol>
            </div>

            <div className="help-section">
                <h3>¿Cómo Postularse a Trabajos o Empresas?</h3>
                <ol>
                    <li>Navega a la sección <strong>Explorar Clientes</strong> (para trabajos puntuales) o <strong>Explorar Empresas</strong> (para trabajo a largo plazo).</li>
                    <li>Haz clic en "Ver Detalles" del proyecto u oferta que te interese.</li>
                    <li>Haz clic en el botón "Postularse".</li>
                    <li>Envía tu propuesta explicando tu perfil, tu metodología de trabajo y el presupuesto/fecha de entrega propuesto.</li>
                </ol>
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
                <div className="help-section">
                    <h3>Contratar Nuevos Talentos</h3>
                    <p>Te animamos a contratar freelancers de niveles más bajos (Novatos). Muchas veces son talentos increíbles buscando sus primeros trabajos para conseguir reputación en la plataforma, y ​​pueden ofrecer presupuestos mucho más accesibles mientras demuestran de qué son capaces.</p>
                    <p>Al completarse y calificar este trabajo exitosamente, <strong>los clientes reciben el doble de experiencia (XP)</strong> al comprar de freelancers novatos (Niveles 1 a 3).</p>
                </div>

                <div className="help-section">
                    <h3>Ganancias y Experiencia (XP) al Contratar</h3>
                    <p>Al igual que los freelancers, al contratar recurrentemente subes de nivel como cliente. La plataforma te brinda una guía de referencia de precios para ganar experiencia:</p>
                    <ul>
                        <li>Mayor a $140.000: <strong>80 XP</strong></li>
                        <li>Mayor a $70.000: <strong>40 XP</strong></li>
                        <li>Mayor a $28.000: <strong>30 XP</strong></li>
                        <li>De $7.000 a $28.000: <strong>10 XP</strong></li>
                    </ul>
                    <p><em>* Contratar a niveles 1, 2 o 3 duplica estos valores.</em></p>
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
                <h3>Reclutamiento y Ofertas</h3>
                <p>Publica ofertas con detalles de "Puesto" en lugar de solo tareas puntuales. Atrae talento para relaciones a largo plazo definiendo condiciones claras de contrato.</p>
            </div>

            <div className="help-section">
                <h3>Creación de Pedidos, Ofertas o Servicios</h3>
                <ul>
                    <li><strong>Para crear un Servicio:</strong> Se espera que la empresa brinde un paquete ya estructurado (como Software como Servicio o Planes Base); vas a la opción de vender y completas precios, entregables y título.</li>
                    <li><strong>Para crear un Pedido:</strong> Como cualquier comprador, si necesitas algo externo o tercerizar, usa "Publicar Pedido" desde el navbar, fija tu presupuesto de referencia, y espera postulaciones.</li>
                    <li><strong>Para publicar Ofertas de Trabajo (Vacantes):</strong> Utiliza el panel respectivo para definir el Puesto, cantidad de candidatos buscados, jornada, salarios, y contrata a largo plazo a tus talentos.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Reputación de Empresas</h3>
                <p>Las empresas no poseen Niveles de Experiencia (XP) como los freelancers o clientes, pero construyen su prestigio en la plataforma gracias a las valoraciones recibidas. Subir la reputación de tu empresa hace que los perfiles <strong>Experto, Diamante o Maestro</strong> quieran trabajar a largo plazo o aplicar a tus vacantes con mayor frecuencia y confianza.</p>
            </div>
        </div>
    );

    const renderCoopsGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía de Coops (Agrupaciones / Equipos)</h2>
            <p>Conviértete en mucho más que un freelancer solitario uniéndote a una "Cooperativa" digital.</p>

            <div className="help-section">
                <h3>¿Qué son las Coops?</h3>
                <p>Las Coops son equipos conformados por diversos freelancers de la plataforma que se asocian de forma comunitaria para abordar grandes proyectos que un individuo no lograría abarcar con sus tiempos regulares por sí solo.</p>
            </div>

            <div className="help-section">
                <h3>¿Cómo se abordan los trabajos y pagos?</h3>
                <p>Cuando un cliente contrata a la Coop, las tareas se dividen entre los miembros del equipo que participen en ese proyecto. El sistema de Cooplance fomenta la colaboración justa recompensando el mérito directamente basado en el Nivel de los participantes involucrados en dicho trabajo.</p>
                <p><strong>Ejemplo práctico de distribución de pagos:</strong></p>
                <p>Al cobrar un proyecto de $100.000 ARS donde trabajaron un freelancer de Nivel 6, otro de Nivel 6, y un talento nuevo de Nivel 3. Se suman los niveles totales de los participantes: <code>6 + 6 + 3 = 15</code> "Partes" en las que se divide el pago total. Al dividir $100.000 ÷ 15, obtenemos <strong>~$6.666 ARS por "Parte"</strong>. Por la tanto:</p>
                <ul>
                    <li>El freelancer Nivel 3 obtendrá <strong>3 partes</strong> (~$20.000).</li>
                    <li>Cada freelancer Nivel 6 obtendrá <strong>6 partes</strong> (~$40.000 a cada uno).</li>
                </ul>
                <p><em>* Este formato motiva increíblemente la contratación de talentos nuevos para escalar rápido y equilibrar los gastos operativos del equipo, sabiendo que el valor aportado escala equitativamente para todos de acuerdo a su progreso personal en la plataforma.</em></p>
            </div>

            <div className="help-section">
                <h3>Roles Posibles</h3>
                <ul>
                    <li><strong>Administrador/Fundador:</strong> Control total, disuelve equipo a voluntad e invita usuarios.</li>
                    <li><strong>Coordinador:</strong> Median las discusiones, dividen el trabajo de los proyectos, y aceptan proyectos de clientes en nombre de la Coop.</li>
                    <li><strong>Tesorero:</strong> Administra las finanzas, distribuciones fijas del dinero ganado, manteniendo transparencia total.</li>
                    <li><strong>Miembro Directo:</strong> Completa el trabajo a su nombre y recibe su porción según su carga de disciplina en el trabajo total.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Experiencia (XP) de Coops en Trabajos Compartidos</h3>
                <p>Cuando un proyecto colaborativo se completa exitosamente, la Coop como institución y equipo gana su recompensa para subir su influencia, de forma similar a los trabajos regulares para cuentas individuales.</p>
                <p>A nivel <strong>individual</strong>, la cantidad de XP ganada es proporcional a tu participación en el servicio: si el trabajo por el que la Coop fue contratada recae en la categoría que tú trabajas personalmente como aportante al equipo obtienes el total de experiencia y recompensa habitual, pero <strong>si sólo brindaste apoyo en un trabajo que no corresponde a la categoría principal asignada por el cliente </strong> (por ejemplo como organizador secundario), la ganancia para tu perfil individual equivale sólo a una décima parte (10%) de esa experiencia total del proyecto, motivando al equipo a mantenerse en roles complementarios dentro de sus disciplinas registradas activas.</p>
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
                    <button
                        className={`help-nav-item ${activeTab === 'coops' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coops')}
                    >
                        Coops (Equipos)
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
                {activeTab === 'coops' && renderCoopsGuide()}
                {activeTab === 'terms' && renderTerms()}
                {activeTab === 'privacy' && renderPrivacy()}
            </main>
        </div>
    );
};

export default HelpCenter;
