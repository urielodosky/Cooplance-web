import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FREELANCER_BENEFITS, CLIENT_BENEFITS } from '../data/levelBenefits';
import '../styles/pages/HelpCenter.scss';

const HelpCenter = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'freelancers');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Initial sync and resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', handleResize);
        
        // On desktop, if no tab is selected, default to freelancers
        if (window.innerWidth >= 900 && !searchParams.get('tab')) {
            setActiveTab('freelancers');
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [searchParams]);

    // Sync tab with URL param
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        } else if (!isMobile) {
            setActiveTab('freelancers');
        }
    }, [searchParams, isMobile]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackToIndex = () => {
        setActiveTab(null);
        setSearchParams({});
    };

    const categories = [
        { id: 'freelancers', title: 'Freelancers', desc: 'Guía sobre niveles, beneficios y cómo crecer en la plataforma.', icon: '👤' },
        { id: 'clients', title: 'Clientes', desc: 'Encuentra talento, publica proyectos y gestiona tus contrataciones.', icon: '🤝' },
        { id: 'companies', title: 'Empresas', desc: 'Herramientas avanzadas para reclutamiento y gestión de equipos.', icon: '🏢' },
        { id: 'coops', title: 'Coops (Equipos)', desc: 'Todo sobre el trabajo colaborativo y la distribución por niveles.', icon: '👥' },
        { id: 'terms', title: 'Términos y Condiciones', desc: 'Reglas de uso, comisiones y responsabilidades.', icon: '📜' },
        { id: 'privacy', title: 'Política de Privacidad', desc: 'Cómo protegemos tus datos y los de tu organización.', icon: '🛡️' }
    ];

    const renderBenefitsTable = (benefitsObj, role = 'freelancer') => {
        if (isMobile) {
            return (
                <div className="benefits-mobile-list">
                    {Object.entries(benefitsObj).map(([level, data]) => (
                        <div key={level} className="benefit-mobile-card glass-panel">
                            <div className="card-header">
                                <span className={`level-badge ${role === 'client' ? 'client' : ''}`}>{level}</span>
                                <div className="header-info">
                                    <h4>{data.name}</h4>
                                    <p>{data.description}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <h5>Beneficios:</h5>
                                <ul className="benefits-list">
                                    {data.benefits.map((benefit, i) => (
                                        <li key={i}>{benefit}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="benefits-table-wrapper">
                <table className="benefits-table">
                    <thead>
                        <tr>
                            <th>Nivel</th>
                            <th>Título Profesional</th>
                            <th>Beneficios e Impacto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(benefitsObj).map(([level, data]) => (
                            <tr key={level}>
                                <td><span className={`level-badge ${role === 'client' ? 'client' : ''}`}>{level}</span></td>
                                <td>
                                    <div className="title-cell">
                                        <strong>{data.name}</strong>
                                        <span className="level-desc">{data.description}</span>
                                    </div>
                                </td>
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
        );
    };

    const renderFreelancerGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Freelancers</h2>
            <p>Bienvenido a la comunidad de talento de Cooplance. Aquí te explicamos cómo crecer y obtener mejores beneficios.</p>

            <div className="help-section">
                <h3>¿Qué es un Freelancer en Cooplance?</h3>
                <p>Un freelancer es un profesional independiente que ofrece sus servicios a través de la plataforma. Puedes publicar "Servicios" (paquetes predefinidos) o postularte a "Proyectos" publicados por clientes.</p>
            </div>

            <div className="help-section">
                <h3>Escala de Reconocimiento Profesional</h3>
                <p>Tu trayectoria se valida a través de 10 niveles honoríficos. Cada ascenso desbloquea mayores capacidades técnicas y beneficios económicos.</p>
                {renderBenefitsTable(FREELANCER_BENEFITS, 'freelancer')}
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
                <h3>Niveles de Reconocimiento al Cliente</h3>
                <p>Los clientes también ascienden en una escala de prestigio que desbloquea mayores capacidades de gestión, seguridad y descuentos exclusivos.</p>
                {renderBenefitsTable(CLIENT_BENEFITS, 'client')}
            </div>

            <div className="help-section">
                <h3>Contratar Nuevos Talentos</h3>
                <p>Te animamos a contratar freelancers de niveles más bajos (Iniciantes). Muchas veces son talentos increíbles buscando sus primeros trabajos para conseguir reputación, y pueden ofrecer presupuestos más accesibles.</p>
                <p>Al completarse y calificar este trabajo exitosamente, <strong>los clientes reciben el doble de experiencia (XP)</strong> al comprar de nuevos talentos (Niveles 1 a 3).</p>
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
            <h2>Términos y Condiciones de Servicio</h2>
            <p className="last-updated">Última actualización: Abril de 2026</p>

            <div className="legal-text">
                <h3>1. Definición de Usuarios y Roles</h3>
                <p>Dentro de Cooplance, los usuarios pueden interactuar bajo distintos roles, cada uno con capacidades específicas:</p>
                <ul>
                    <li><strong>Freelancer:</strong> Profesional independiente o de oficio que ofrece sus servicios, habilidades y conocimientos a terceros a través de la plataforma.</li>
                    <li><strong>Cliente:</strong> Usuario (persona física) que utiliza la plataforma con el fin de buscar, solicitar y contratar los servicios de uno o más Freelancers.</li>
                    <li><strong>Empresa:</strong> Usuario (persona jurídica o entidad comercial verificada) que utiliza la plataforma para contratar servicios, publicar ofertas laborales estructuradas o gestionar equipos de trabajo.</li>
                </ul>

                <h3>2. Modalidades de Contratación</h3>
                <p>Cooplance facilita la conexión entre las partes a través de múltiples modalidades de interacción:</p>
                <ul>
                    <li><strong>Servicios Directos (Catálogo):</strong> El Freelancer publica un servicio o paquete de trabajo específico con un precio y alcance predefinidos. Los Clientes o Empresas pueden adquirir este servicio de forma directa.</li>
                    <li><strong>Solicitudes de Clientes (Licitación):</strong> Un Cliente publica una necesidad o proyecto específico. Los Freelancers pueden visualizar la solicitud y enviar propuestas o cotizaciones para que el Cliente seleccione la opción que mejor se adapte a sus requerimientos.</li>
                    <li><strong>Ofertas Laborales (Exclusivo Empresas):</strong> Las Empresas pueden publicar ofertas de trabajo detallando la carga horaria, duración del contrato y condiciones específicas. Los Freelancers interesados pueden postularse a dichas ofertas para ser seleccionados por la Empresa.</li>
                </ul>

                <h3>3. Sistema de "Coops" (Equipos de Trabajo)</h3>
                <p>Cooplance permite la colaboración agrupada a través de la creación de "Coops" (equipos), cuyas dinámicas varían según el creador:</p>
                <ul>
                    <li><strong>Coops de Freelancers:</strong> Los Freelancers pueden agruparse para formar equipos y publicar Servicios Directos conjuntos o postularse a Solicitudes/Ofertas Laborales de mayor envergadura. El número máximo de miembros por Coop es de cinco (5).</li>
                    <li><strong>Coops de Clientes:</strong> Los Clientes pueden crear un entorno privado ("Coop") para agrupar y organizar a los distintos Freelancers que han contratado para un proyecto específico.</li>
                    <li><strong>Coops de Empresas:</strong> Las Empresas pueden crear y administrar equipos de trabajo internos ("Coops empresariales"), invitando a Freelancers a trabajar bajo la dirección y gestión directa de la Empresa.</li>
                </ul>

                <h3>4. Responsabilidad y Gestión en las Coops de Freelancers</h3>
                <ul>
                    <li><strong>Designación del Líder de Proyecto:</strong> Para cada trabajo aceptado o servicio vendido por una Coop, el equipo deberá designar a un "Líder" o "Encargado", quien será el interlocutor principal y oficial con el Cliente.</li>
                    <li><strong>Comunicación y Visibilidad:</strong> El Líder de Proyecto canaliza la comunicación formal. El resto de los miembros involucrados tendrán acceso de lectura al chat para garantizar la transparencia interna del equipo.</li>
                    <li><strong>Responsabilidad de Entrega:</strong> El Líder de Proyecto actúa como el representante y garante principal del cumplimiento, calidad y plazos de entrega del trabajo acordado frente al Cliente o Empresa.</li>
                </ul>

                <h3>5. Pagos, Comisiones y Distribución de Fondos</h3>
                <p><strong>Comisiones de la Plataforma:</strong> Cooplance aplica una comisión sobre los pagos procesados:</p>
                <ul>
                    <li>Trabajos Individuales: La comisión base es del 12%, pudiendo reducirse hasta un 6% según el Nivel de Usuario.</li>
                    <li>Trabajos en Coop: Se aplica una comisión fija e invariable del 12%.</li>
                </ul>
                <p><strong>Distribución Automática en Coops:</strong> Los fondos se distribuirán automáticamente según la modalidad elegida por la Coop (Proporcional por Nivel, División Personalizada o División Equitativa).</p>
                <p><strong>Extracción de Fondos:</strong> Los mecanismos, plazos y condiciones para la extracción de saldo hacia cuentas externas están <em>(Aún por definir)</em>.</p>

                <h3>6. Sistema de Niveles y Experiencia (XP)</h3>
                <ul>
                    <li><strong>Obtención de XP:</strong> Se obtienen puntos de experiencia al concretar ventas exitosas.</li>
                    <li><strong>Restricciones:</strong> Ventas inferiores a $5.000 no generan XP. El tope máximo de experiencia por transacción es de 100 XP.</li>
                    <li><strong>Evolución:</strong> Cooplance podrá incorporar en el futuro métricas adicionales (como reseñas de clientes) para la progresión de niveles.</li>
                </ul>

                <h3>7. Entregas, Cancelaciones y Retención de Fondos (Escrow)</h3>
                <p><strong>Seguridad Financiera:</strong> Cooplance retiene el pago del Cliente hasta la finalización del proyecto.</p>
                <p><strong>Cancelación por Incumplimiento:</strong> Si el Freelancer no realiza ninguna entrega una vez vencido el plazo estipulado, el Cliente tendrá el derecho de solicitar la cancelación del proyecto. En este caso, el Cliente podrá optar por:</p>
                <ol style={{ paddingLeft: '2rem', color: 'var(--text-secondary)' }}>
                    <li style={{ marginBottom: '1rem' }}>Recibir el reembolso del 100% de los fondos a su medio de pago original (sujeto a los tiempos de procesamiento de la entidad financiera), o</li>
                    <li style={{ marginBottom: '1rem' }}>Elegir que dicho monto se acredite íntegramente como "Saldo a favor" en su cuenta de Cooplance para ser utilizado en futuras contrataciones.</li>
                </ol>
                <p><strong>Protección al Freelancer (Política de No Reembolso):</strong> Una vez que el trabajo ha comenzado o se ha realizado la entrega, no se aceptarán cancelaciones unilaterales ni devoluciones por motivos de insatisfacción personal del Cliente. En caso de inconformidad, el Cliente deberá agotar las instancias de "Revisiones" ofrecidas por el Freelancer.</p>
                <p><strong>Aprobación Automática:</strong> Si el Cliente no responde tras una entrega final, el sistema marcará el pedido como completado automáticamente tras tres (3) días hábiles.</p>

                <h3>8. Propiedad Intelectual y Derechos de Autor</h3>
                <ul>
                    <li><strong>Transferencia de Derechos:</strong> Una vez que el trabajo ha sido finalizado y el pago ha sido liberado en favor del Freelancer o la Coop, la propiedad legal y los derechos de uso comercial del producto final se transfieren íntegramente al Cliente o Empresa contratante.</li>
                    <li><strong>Uso del Freelancer:</strong> El Freelancer o la Coop no podrán dar un uso propio, personal o comercial al trabajo realizado para un tercero.</li>
                    <li><strong>Derecho de Exhibición (Portfolio):</strong> El Freelancer o los miembros de la Coop conservan el derecho permanente de incluir el trabajo realizado en su portfolio profesional dentro y fuera de Cooplance, con el fin de exhibir su experiencia y habilidades ante potenciales clientes, salvo acuerdo de confidencialidad previo.</li>
                </ul>
                <p><strong>Detalles legales adicionales:</strong> Otros aspectos de la propiedad intelectual se encuentran <em>(Aún por definir)</em>.</p>

                <h3>9. Limitación de Responsabilidad y Servicios Presenciales</h3>
                <p><strong>Intermediación:</strong> Cooplance actúa exclusivamente como intermediario tecnológico. No interviene en la ejecución de los proyectos y no se hace responsable por la calidad, exactitud o nivel de satisfacción final del trabajo entregado por los profesionales.</p>
                <p><strong>Exención de Responsabilidad en Servicios Presenciales:</strong> En el caso de los servicios que requieran un encuentro físico o presencial entre los Usuarios, Cooplance funciona únicamente como una plataforma de contacto. Por lo tanto, Cooplance queda expresa y totalmente exonerada de cualquier responsabilidad civil, penal o administrativa por accidentes, lesiones, robos, daños materiales, físicos o morales, o cualquier otro perjuicio que pudiera ocurrir antes, durante o después de la prestación de un servicio presencial. Los Usuarios asumen la total responsabilidad y el riesgo al acordar y ejecutar trabajos fuera del entorno digital.</p>
                <p><strong>Reportes, Soporte y Colaboración Legal:</strong> Sin perjuicio de la exención de responsabilidad mencionada, Cooplance mantiene un estricto compromiso con la seguridad de su comunidad. Ante cualquier incidente, maltrato o irregularidad durante un servicio (físico o digital), el Usuario afectado podrá y deberá emitir un reporte a nuestro equipo de soporte, adjuntando las pruebas pertinentes y detallando lo sucedido. Cooplance evaluará la situación para tomar medidas disciplinarias internas, incluyendo el bloqueo preventivo o definitivo de los infractores. En casos de gravedad que constituyan un presunto delito, Cooplance elevará el reporte y cooperará activamente proporcionando la información, registros y pruebas a las autoridades policiales o judiciales competentes para su correspondiente investigación.</p>

                <h3>10. Obligaciones Fiscales y Facturación</h3>
                <p>Cooplance actúa como un intermediario y no es empleador, socio ni representante de los Freelancers. Cada Freelancer opera como un profesional independiente y es el único y exclusivo responsable de cumplir con sus obligaciones fiscales, tributarias y previsionales vigentes (ej. inscripción en AFIP, Dirección General de Rentas, etc.). Es responsabilidad exclusiva del Freelancer o de la Coop emitir y entregar al Cliente o Empresa la factura legal correspondiente por el total del servicio prestado. Cooplance únicamente emitirá comprobantes o facturas por el porcentaje de comisión cobrado por el uso de la plataforma.</p>

                <h3>11. Ley Aplicable y Jurisdicción</h3>
                <p><strong>Marco Legal:</strong> Los presentes Términos y Condiciones, la Política de Privacidad y cualquier otro acuerdo o política vinculada a Cooplance, se rigen e interpretan en todos sus puntos de acuerdo con las leyes vigentes de la República Argentina.</p>
                <p><strong>Resolución de Controversias:</strong> Ante cualquier divergencia, reclamo o disputa legal que pudiera surgir en relación con el uso de la plataforma, la prestación de los servicios o la interpretación de estos términos, las partes acuerdan someterse a la jurisdicción exclusiva de los Tribunales Ordinarios de la Provincia de Córdoba. Al aceptar estos términos, el Usuario renuncia expresamente a cualquier otro fuero o jurisdicción que pudiera corresponderle, incluso por razón de su domicilio presente o futuro.</p>

                <h3>12. Modificaciones a los Términos y Políticas</h3>
                <p>Cooplance se reserva el derecho exclusivo de modificar, actualizar o reemplazar estos Términos y Condiciones, la Política de Privacidad y cualquier otra norma de la plataforma en cualquier momento. Las modificaciones entrarán en vigencia desde el momento exacto de su publicación en la página web. Los cambios que consideremos sustanciales serán notificados a los Usuarios a través de la dirección de correo electrónico vinculada a su cuenta. El uso continuado de la plataforma tras la publicación de dichas modificaciones constituye la aceptación expresa y plena de los nuevos términos por parte del Usuario. </p>
            </div>
        </div>
    );

    const renderPrivacy = () => (
        <div className="help-content fade-in">
            <h2>Política de Privacidad de Cooplance</h2>
            <p className="last-updated">Última actualización: Abril de 2026</p>

            <div className="legal-text">
                <h3>1. Introducción</h3>
                <p>Bienvenido a Cooplance. El cuidado y la protección de tus datos personales son fundamentales para nosotros. Esta Política de Privacidad describe cómo recopilamos, utilizamos, protegemos y compartimos la información de nuestros usuarios (en adelante, "Usuarios", ya sean clientes, freelancers o empresas) cuando acceden y utilizan la plataforma de Cooplance.</p>
                <p>A los efectos legales y del tratamiento de datos personales, la plataforma "Cooplance" es operada y administrada por <strong>[RAZÓN SOCIAL DE LA EMPRESA, ej. Cooplance S.A.S.]</strong>, con CUIT <strong>[Número de CUIT de la empresa]</strong> y domicilio legal constituido en <strong>[Dirección legal de la empresa, Provincia, País]</strong>.</p>
                <p>Al registrarte y utilizar nuestros servicios, aceptas las prácticas descritas en este documento.</p>

                <h3>2. Información que recopilamos</h3>
                <p>Para garantizar un entorno seguro, transparente y de confianza, solicitamos información específica dependiendo del tipo de cuenta y la naturaleza del servicio:</p>
                <ul>
                    <li><strong>Datos de registro generales:</strong> A todos los Usuarios que crean una cuenta en Cooplance les solicitamos información obligatoria que incluye su nombre real, apellido, fecha de nacimiento (para verificar la edad mínima requerida) y una dirección de correo electrónico válida.</li>
                    <li><strong>Información de Freelancers (Profesionales y Oficios):</strong> Identidad: Solicitamos el número de DNI de forma obligatoria para verificar la identidad del profesional. Profesiones reguladas: Para los profesionales que ejerzan labores matriculadas (por ejemplo, Psicología, Arquitectura, etc.), es obligatorio proporcionar el número de matrícula correspondiente y el nombre de la Universidad o institución donde cursaron sus estudios.</li>
                    <li><strong>Información de Clientes:</strong> La provisión del DNI no es obligatoria para los usuarios que se registran exclusivamente para contratar servicios, a menos que la naturaleza de la transacción lo requiera por motivos de facturación o seguridad.</li>
                    <li><strong>Cuentas de Empresa:</strong> Si el registro se realiza en nombre de una persona jurídica o empresa (ya sea para contratar o para ofrecer servicios), solicitamos de forma obligatoria el nombre de la empresa, el CUIT, y el nombre del responsable o titular a nombre de quien está registrada la empresa.</li>
                    <li><strong>Datos de ubicación y contacto (Servicios Presenciales):</strong> El número de teléfono celular y los datos de ubicación exacta son opcionales para la mayoría de los usuarios. Sin embargo, para la coordinación y ejecución de trabajos presenciales, proporcionar la ubicación geográfica es de carácter obligatorio.</li>
                </ul>

                <h3>3. Información de Pagos, Facturación y Pasarelas de Pago</h3>
                <p><strong>Naturaleza del servicio:</strong> Cooplance actúa exclusivamente como una plataforma tecnológica de intermediación. Cooplance no es una entidad financiera, banco, ni empresa fiduciaria, y no procesa de forma directa las transacciones económicas entre los Usuarios.</p>
                <p><strong>Procesadores de pago externos:</strong> Toda la gestión, el procesamiento de transacciones y la retención temporal de fondos (sistema de resguardo o Escrow) se realiza íntegramente a través de pasarelas de pago de terceros debidamente reguladas y certificadas. Al realizar una transacción, el Usuario comprende y acepta que los fondos son gestionados por estos proveedores externos, quedando sujetos a sus respectivos Términos y Condiciones.</p>
                <p><strong>Seguridad y no almacenamiento de datos:</strong> Para garantizar la máxima seguridad y transparencia, Cooplance no recopila, no procesa y no almacena bajo ninguna circunstancia datos financieros críticos (tales como números de tarjetas de crédito o débito, fechas de vencimiento o códigos de seguridad/CVV). Toda la información de facturación y pago es ingresada y procesada directamente en los entornos seguros y encriptados proporcionados por nuestras pasarelas de pago asociadas.</p>

                <h3>4. Visibilidad y Privacidad de la Información</h3>
                <p>En Cooplance entendemos la importancia de proteger tus datos personales. Por ello, clasificamos la información que recopilamos en pública (visible para otros usuarios) y privada (estrictamente confidencial).</p>
                <p><strong>Información Pública (Visible en la plataforma):</strong></p>
                <ul>
                    <li>Usuarios generales: Tu nombre y apellido estarán visibles para que la comunidad sepa con quién está interactuando.</li>
                    <li>Profesionales matriculados: Para brindar seguridad y transparencia a los clientes, el número de matrícula y la universidad de egreso serán de acceso público en el perfil del profesional.</li>
                    <li>Empresas: Se mostrará públicamente el nombre de la empresa y el nombre del responsable o titular. Adicionalmente, las empresas podrán mostrar su ubicación geográfica de manera opcional.</li>
                    <li>Servicios presenciales: Para facilitar la conexión entre usuarios de la misma zona, la ubicación geográfica será visible en aquellos perfiles o solicitudes que impliquen trabajos presenciales.</li>
                </ul>
                <p><strong>Información Privada (Estrictamente confidencial):</strong></p>
                <p>Los siguientes datos no serán visibles para el público ni para otros usuarios bajo ninguna circunstancia, y se mantendrán protegidos en nuestras bases de datos: Documento Nacional de Identidad (DNI), Clave Única de Identificación Tributaria (CUIT), fecha de nacimiento, número de teléfono celular y dirección de correo electrónico. La comunicación entre los usuarios se realizará exclusivamente a través de los canales internos provistos por Cooplance para garantizar la seguridad de ambas partes.</p>

                <h3>5. Retención y Eliminación de Datos</h3>
                <p>En Cooplance respetamos tu derecho a eliminar tu información cuando decidas dejar de utilizar nuestros servicios. El proceso de eliminación se rige por las siguientes pautas:</p>
                <ul>
                    <li><strong>Desactivación inmediata:</strong> Al solicitar la eliminación de la cuenta, el acceso (login) se deshabilitará instantáneamente y el perfil del usuario dejará de ser visible en las búsquedas públicas de la plataforma.</li>
                    <li><strong>Acceso a interacciones previas:</strong> Para garantizar la integridad de los acuerdos comerciales ya finalizados, el historial de trabajos realizados y los chats de comunicación permanecerán accesibles únicamente para aquellos usuarios con los que el titular de la cuenta haya interactuado o mantenido contratos previos.</li>
                    <li><strong>Período de gracia y eliminación definitiva:</strong> Se establecerá un período de 30 días posteriores a la solicitud de baja. Transcurrido este lapso, Cooplance procederá a eliminar definitivamente la información personal del perfil (fotos, descripciones, portfolios).</li>
                    <li><strong>Excepciones por seguridad y cumplimiento legal:</strong> Por motivos de seguridad, prevención de fraudes, resolución de disputas y cumplimiento de obligaciones fiscales o legales aplicables, Cooplance conservará cierta información estrictamente necesaria (como el DNI, CUIT, historial de transacciones financieras y registros de auditoría o baneos) por el tiempo que exija la ley, incluso después de que la cuenta haya sido eliminada.</li>
                </ul>

                <h3>6. Uso de Cookies y Tecnologías de Rastreo</h3>
                <p>Para mejorar la experiencia del usuario y garantizar el correcto funcionamiento de la plataforma, Cooplance utiliza cookies y tecnologías similares.</p>
                <ul>
                    <li><strong>¿Qué son?</strong> Las cookies son pequeños archivos de texto que se guardan en tu navegador o dispositivo cuando visitas nuestra página.</li>
                    <li><strong>¿Para qué las usamos?</strong> Esenciales y de Seguridad: Para mantener tu sesión iniciada de forma segura, identificar tráfico irregular y prevenir ataques o accesos no autorizados a tu cuenta. Rendimiento y Analítica: Para entender cómo los usuarios interactúan con la plataforma (qué secciones visitan más, de dónde provienen) y poder mejorar nuestro servicio de forma continua.</li>
                    <li><strong>Control del usuario:</strong> Puedes configurar tu navegador para rechazar total o parcialmente las cookies. Sin embargo, ten en cuenta que deshabilitar cookies esenciales puede afectar el funcionamiento correcto de tu cuenta en Cooplance.</li>
                </ul>

                <h3>7. Seguridad, Moderación y Contenido Inapropiado</h3>
                <p>Cooplance mantiene un estricto compromiso con la seguridad de su comunidad. Nos reservamos el derecho de monitorear y moderar el contenido publicado en la plataforma para prevenir actividades ilícitas y asegurar el cumplimiento de nuestros Términos y Condiciones.</p>
                <ul>
                    <li><strong>Monitoreo preventivo:</strong> Podemos emplear herramientas automatizadas o revisión manual para detectar fraudes, spam o cualquier intento de eludir el sistema de la plataforma.</li>
                    <li><strong>Contenido prohibido:</strong> Queda estrictamente prohibida la publicación, intercambio, solicitud o distribución de contenido para adultos (+18), material pornográfico, o cualquier tipo de contenido que fomente la violencia, el acoso o la discriminación.</li>
                    <li><strong>Actividades ilícitas y colaboración con autoridades:</strong> Cooplance tiene tolerancia cero frente a delitos. Cualquier actividad sospechosa relacionada con fraudes, estafas, lavado de dinero o cualquier otro acto ilícito resultará en el bloqueo inmediato de la cuenta y será reportada a las autoridades legales competentes. Cooplance colaborará activamente proporcionando los registros y la información requerida por la justicia.</li>
                    <li><strong>Suspensión, Baneo y Derecho de Apelación:</strong> Si un usuario viola estas normativas, su cuenta será suspendida o eliminada. No obstante, para garantizar la equidad ante posibles errores del sistema (falsos positivos), el usuario sancionado tendrá derecho a apelar la decisión dentro de los siguientes 15 días hábiles. Para ello, deberá enviar un correo electrónico a cooplance.org@gmail.com incluyendo obligatoriamente en el asunto del mensaje el formato: "Apelación - [nombre de usuario]". El caso será revisado manualmente por nuestro equipo de soporte, aunque durante este proceso la cuenta permanecerá inhabilitada de forma preventiva.</li>
                    <li><strong>Retención de datos por infracciones:</strong> En caso de que un baneo sea definitivo, Cooplance retendrá los datos técnicos y de identificación de dicho usuario de forma permanente en una lista negra, para impedir su reingreso a la plataforma.</li>
                </ul>

                <h3>8. Almacenamiento y Transferencia Internacional de Datos</h3>
                <p>La información que recopilamos en Cooplance es almacenada de forma segura utilizando infraestructuras de bases de datos en la nube de primer nivel (como Supabase).</p>
                <ul>
                    <li><strong>Ubicación de los servidores:</strong> Los servidores que procesan y almacenan nuestra base de datos pueden encontrarse ubicados físicamente fuera de tu país de residencia (por ejemplo, en Estados Unidos).</li>
                    <li><strong>Transferencia de datos:</strong> Al utilizar Cooplance, comprendes y aceptas que tu información personal pueda ser transferida y procesada en estos servidores internacionales.</li>
                    <li><strong>Seguridad:</strong> Nos aseguramos de que nuestros proveedores de alojamiento cumplan con los más altos estándares y certificaciones de seguridad informática globales para proteger la integridad, confidencialidad y disponibilidad de tus datos personales, implementando medidas como el cifrado de datos y políticas de acceso restringido.</li>
                </ul>

                <h3>9. Derechos del Usuario, Acceso y Modificación de Datos</h3>
                <p>Como titular de tus datos personales, tienes derecho a acceder a la información que Cooplance posee sobre ti, así como a solicitar su actualización, rectificación o eliminación.</p>
                <ul>
                    <li><strong>Acceso y visibilidad:</strong> Podrás visualizar tu información personal y los datos vinculados a tu cuenta directamente desde el panel de tu perfil de usuario.</li>
                    <li><strong>Modificación de datos secundarios:</strong> Tendrás la libertad de actualizar en cualquier momento tu información opcional o secundaria (como foto de perfil, descripción, portfolio, ubicación si aplica, y tarifas) desde la configuración de tu cuenta.</li>
                    <li><strong>Datos críticos e inmutables:</strong> Por motivos de seguridad, prevención de fraudes y para mantener la integridad de las transacciones comerciales, no es posible modificar libremente los datos críticos de identidad una vez registrados. Esto incluye: Nombre, Apellido, DNI, CUIT, fecha de nacimiento y dirección de correo electrónico.</li>
                    <li><strong>Solicitud de rectificación:</strong> Si existe un error en tus datos críticos o requieres actualizarlos por un motivo legal válido (por ejemplo, un cambio de identidad o un error tipográfico en el registro), deberás enviar una solicitud formal a <strong>cooplance.org@gmail.com</strong>. El asunto del correo debe seguir el formato: "Solicitud de rectificación - [cuenta de mail]" o "Solicitud de rectificación - [nombre de usuario]". Nuestro equipo te solicitará documentación respaldatoria para verificar la legitimidad del cambio antes de aplicarlo en el sistema.</li>
                </ul>

                <h3>10. Menores de Edad y Cuentas Supervisadas</h3>
                <p>En Cooplance fomentamos el desarrollo de habilidades profesionales, siempre bajo un marco estricto de seguridad, legalidad y control parental. La edad mínima para registrarse y operar en la plataforma es de 16 años. Los usuarios que tengan entre 16 y 17 años podrán operar exclusivamente bajo la modalidad de "Cuenta Supervisada".</p>
                <ul>
                    <li><strong>Registro y Verificación de Edad:</strong> Todos los usuarios deben proporcionar su fecha de nacimiento al registrarse para verificar que cumplen con la edad mínima de 16 años. Este dato es estrictamente privado y no será visible para otros usuarios.</li>
                    <li><strong>Cuentas de Menores (16 a 17 años):</strong> Estos usuarios no deben proporcionar un DNI. Para su registro, solo se recopilará su nombre real, correo electrónico, fecha de nacimiento y la vinculación obligatoria a una cuenta de un Responsable Legal (mayor de 18 años).</li>
                    <li><strong>Rol del Responsable Legal:</strong> La cuenta del menor debe ser aprobada y vinculada exclusivamente a la cuenta de su Padre, Madre, Tutor o Representante Legal. Este responsable deberá aceptar explícitamente los Términos de Cuidado de Cooplance. A través de la vinculación técnica de ambas cuentas, el Representante Legal tendrá acceso total a la cuenta del menor para garantizar su correcta supervisión, asumiendo la responsabilidad integral por las acciones, ofertas y acuerdos comerciales que el menor realice en la plataforma. Por cuestiones de seguridad, cada cuenta de Responsable Legal podrá tener un máximo de dos (2) cuentas de menores a su cargo.</li>
                    <li><strong>Restricciones de la Cuenta Supervisada:</strong> Para proteger la integridad de los menores, sus cuentas tendrán limitaciones estrictas: Solo entorno digital (tienen terminantemente prohibido realizar trabajos presenciales) y Tipos de clientes (solo podrán operar con usuarios "Clientes" individuales, no con "Empresas").</li>
                    <li><strong>Transición a la Mayoría de Edad:</strong> Al cumplir los 18 años, la cuenta se desvinculará automáticamente de la supervisión del adulto y pasará a ser una cuenta estándar, debiendo completar los datos de identidad requeridos por ley (como el DNI o CUIT).</li>
                </ul>

                <h3>11. Cambios a esta Política de Privacidad</h3>
                <p>Cooplance se reserva el derecho de actualizar o modificar esta Política de Privacidad en cualquier momento para reflejar cambios en nuestras prácticas, en la plataforma o por requerimientos legales. Cualquier modificación entrará en vigencia inmediatamente tras su publicación en esta página. Te recomendamos revisar esta política periódicamente para estar al tanto de cómo protegemos tu información.</p>
            </div>
        </div>
    );

    return (
        <div className={`help-center-container fade-in ${isMobile ? (activeTab ? 'detail-mode' : 'index-mode') : 'desktop-mode'}`}>
            {isMobile ? (
                // MOBILE VIEW: Index (Cards) or Detail (Selected Guide)
                !activeTab ? (
                    <div className="help-index-wrapper">
                        <h1 className="help-index-title">CENTRO DE AYUDA</h1>
                        <div className="help-category-grid">
                            {categories.map((cat) => (
                                <div 
                                    key={cat.id} 
                                    className="help-category-card glass-panel"
                                    onClick={() => handleTabChange(cat.id)}
                                >
                                    <div className="card-icon">{cat.icon}</div>
                                    <h3 className="card-title">{cat.title}</h3>
                                    <p className="card-desc">{cat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="help-detail-wrapper">
                        <button className="back-btn-premium" onClick={handleBackToIndex}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Volver al Centro de Ayuda
                        </button>
                        
                        <main className="help-main glass-panel">
                            {activeTab === 'freelancers' && renderFreelancerGuide()}
                            {activeTab === 'clients' && renderClientGuide()}
                            {activeTab === 'companies' && renderCompanyGuide()}
                            {activeTab === 'coops' && renderCoopsGuide()}
                            {activeTab === 'terms' && renderTerms()}
                            {activeTab === 'privacy' && renderPrivacy()}
                        </main>
                    </div>
                )
            ) : (
                // DESKTOP VIEW: Sidebar + Content Side-by-Side
                <>
                    <aside className="help-sidebar glass-panel">
                        <div className="help-menu-title">Centro de Ayuda</div>
                        <nav className="help-nav">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`help-nav-item ${activeTab === cat.id ? 'active' : ''}`}
                                    onClick={() => handleTabChange(cat.id)}
                                >
                                    {cat.icon} {cat.title}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="help-main glass-panel">
                        {activeTab === 'freelancers' && renderFreelancerGuide()}
                        {activeTab === 'clients' && renderClientGuide()}
                        {activeTab === 'companies' && renderCompanyGuide()}
                        {activeTab === 'coops' && renderCoopsGuide()}
                        {activeTab === 'terms' && renderTerms()}
                        {activeTab === 'privacy' && renderPrivacy()}
                    </main>
                </>
            )}
        </div>
    );
};

export default HelpCenter;
