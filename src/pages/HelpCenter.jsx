import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FREELANCER_BENEFITS, CLIENT_BENEFITS } from '../data/levelBenefits';
import '../styles/pages/HelpCenter.scss';

const HelpCenter = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'freelancers');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

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
        </div>
    );

    const renderClientGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Clientes</h2>
            <p>Encuentra al talento perfecto para tus proyectos personales o puntuales.</p>

            <div className="help-section">
                <h3>¿Cómo contratar?</h3>
                <ol>
                    <li><strong>Explorar Servicios:</strong> Busca servicios ya definidos por freelancers.</li>
                    <li><strong>Publicar Proyecto:</strong> Si necesitas algo específico, publica un proyecto detallando tus requerimientos.</li>
                </ol>
            </div>

            <div className="help-section">
                <h3>Niveles de Reconocimiento al Cliente</h3>
                <p>Los clientes también ascienden en una escala de prestigio que desbloquea mayores capacidades de gestión, seguridad y descuentos exclusivos.</p>
                {renderBenefitsTable(CLIENT_BENEFITS, 'client')}
            </div>
        </div>
    );

    const renderCompanyGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía para Empresas</h2>
            <p>Soluciones robustas para organizaciones y contratación de equipos.</p>

            <div className="help-section">
                <h3>Perfil de Empresa</h3>
                <ul>
                    <li><strong>Verificación:</strong> Insignia de empresa verificada.</li>
                    <li><strong>Publicación Avanzada:</strong> Campos adicionales en proyectos (Vacantes, Duración de Contrato).</li>
                    <li><strong>Gestión de Equipos:</strong> Herramientas para manejar múltiples freelancers.</li>
                </ul>
            </div>
        </div>
    );

    const renderCoopsGuide = () => (
        <div className="help-content fade-in">
            <h2>Guía de Coops (Agrupaciones / Equipos)</h2>
            <p>Conviértete en mucho más que un freelancer solitario uniéndote a una "Cooperativa" digital.</p>

            <div className="help-section">
                <h3>¿Qué son las Coops?</h3>
                <p>Las Coops son equipos conformados por diversos freelancers que se asocian de forma comunitaria para abordar grandes proyectos que un individuo no lograría abarcar con sus tiempos regulares por sí solo.</p>
            </div>

            <div className="help-section">
                <h3>Modalidades de Distribución de Pagos</h3>
                <p>El sistema de Cooplance fomenta la colaboración justa y transparente. Al crear un servicio o aceptar un proyecto, la Coop puede elegir entre tres formas de repartir los ingresos:</p>
                <ul>
                    <li><strong>1. Proporcional por Nivel (Automática):</strong> El pago se divide en "partes" basadas en el nivel de cada participante.
                        <div className="legal-note" style={{ marginTop: '0.5rem' }}>
                            <p><strong>Ejemplo:</strong> En un proyecto de $100.000 con dos Nivel 6 y un Nivel 3, se divide en 15 partes (6+6+3). El Nivel 3 recibe 3 partes (~$20.000) y los Nivel 6 reciben 6 partes cada uno (~$40.000). Esto incentiva la meritocracia y el apoyo a nuevos talentos.</p>
                        </div>
                    </li>
                    <li><strong>2. División Equitativa (Automática):</strong> Los fondos netos se distribuyen en partes exactamente iguales entre todos los miembros que participaron en el trabajo, independientemente de su nivel personal.</li>
                    <li><strong>3. División Manual (Personalizada):</strong> El fundador o administrador de la Coop define porcentajes o montos específicos para cada miembro. Esta distribución debe quedar preestablecida por el dueño de la Coop antes de iniciar la ejecución del servicio para garantizar claridad total.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Distribución de Pagos</h3>
                <div className="legal-note">
                    <p><strong>Ejemplo:</strong> Al cobrar un proyecto de $100.000 ARS donde trabajaron un freelancer Nivel 6, otro de Nivel 6, y un talento nuevo de Nivel 3. Se obtienen 15 partes (6+6+3). El Nivel 3 obtiene ~$20.000 y los Nivel 6 ~$40.000 cada uno.</p>
                </div>
            </div>
        </div>
    );

    const renderTerms = () => (
        <div className="help-content fade-in">
            <h2>Términos y Condiciones de Servicio de Cooplance</h2>
            
            <div className="legal-text">
                <span className="last-updated">Última actualización: Abril de 2026</span>

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
                    <li>Trabajos Individuales: La comisión base es del 12%, pudiendo reducirse hasta un 6% según el Nivel de Usuario. La tabla de niveles está disponible en el panel del usuario.</li>
                    <li>Trabajos en Coop: Se aplica una comisión fija e invariable del 12%.</li>
                </ul>
                <div className="legal-note">
                    <p><strong>Distribución Automática en Coops:</strong> Los fondos se distribuirán automáticamente según la modalidad elegida por la Coop (Proporcional por Nivel, División Personalizada o División Equitativa).</p>
                </div>
                <p><strong>Extracción de Fondos:</strong> Los mecanismos, plazos y condiciones para la extracción de saldo hacia cuentas externas están <em>(Aún por definir)</em>.</p>

                <h3>6. Sistema de Niveles y Experiencia (XP)</h3>
                <ul>
                    <li><strong>Obtención de XP:</strong> Se obtienen puntos de experiencia al concretar ventas exitosas.</li>
                    <li><strong>Restricciones:</strong> Ventas inferiores a $5.000 no generan XP. El tope máximo de experiencia por transacción es de 100 XP.</li>
                    <li><strong>Evolución:</strong> Cooplance podrá incorporar en el futuro métricas adicionales (como reseñas de clientes) para la progresión de niveles.</li>
                </ul>

                <h3>7. Entregas, Cancelaciones y Retención de Fondos (Escrow)</h3>
                <p><strong>Seguridad Financiera:</strong> Cooplance retiene el pago del Cliente hasta la finalización del proyecto.</p>
                <div className="legal-note">
                    <p><strong>Protección al Freelancer (Política de No Reembolso):</strong> Una vez que el trabajo ha comenzado o se ha realizado la entrega, no se aceptarán cancelaciones unilaterales ni devoluciones por motivos de insatisfacción personal del Cliente. En caso de inconformidad, el Cliente deberá agotar las instancias de "Revisiones" ofrecidas por el Freelancer.</p>
                </div>
                <p><strong>Cancelación por Incumplimiento:</strong> Si el Freelancer no realiza ninguna entrega una vez vencido el plazo estipulado, el Cliente tendrá el derecho de solicitar la cancelación del proyecto. En este caso, el Cliente podrá optar por:</p>
                <ol style={{ paddingLeft: '1.5rem' }}>
                    <li>Recibir el reembolso del 100% de los fondos a su medio de pago original (sujeto a los tiempos de procesamiento de la entidad financiera), o</li>
                    <li>Elegir que dicho monto se acredite íntegramente como "Saldo a favor" en su cuenta de Cooplance para ser utilizado en futuras contrataciones.</li>
                </ol>
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
                <div className="legal-note">
                    <p><strong>Exención de Responsabilidad en Servicios Presenciales:</strong> En el caso de los servicios que requieran un encuentro físico o presencial entre los Usuarios, Cooplance funciona únicamente como una plataforma de contacto. Los Usuarios asumen la total responsabilidad y el riesgo al acordar y ejecutar trabajos fuera del entorno digital.</p>
                </div>
                <p><strong>Reportes, Soporte y Colaboración Legal:</strong> Sin perjuicio de la exención de responsabilidad mencionada, Cooplance mantiene un estricto compromiso con la seguridad de su comunidad. Ante cualquier incidente, maltrato o irregularidad durante un servicio (físico o digital), el Usuario afectado podrá y deberá emitir un reporte a nuestro equipo de soporte.</p>

                <h3>10. Obligaciones Fiscales y Facturación</h3>
                <p>Cooplance actúa como un intermediario y no es empleador, socio ni representante de los Freelancers. Cada Freelancer opera como un profesional independiente y es el único y exclusivo responsable de cumplir con sus obligaciones fiscales, tributarias y previsionales vigentes (ej. inscripción en AFIP, Dirección General de Rentas, etc.). Es responsabilidad exclusiva del Freelancer o de la Coop emitir y entregar al Cliente o Empresa la factura legal correspondiente por el total del servicio prestado.</p>

                <h3>11. Ley Aplicable y Jurisdicción</h3>
                <p><strong>Marco Legal:</strong> Los presentes Términos y Condiciones, la Política de Privacidad y cualquier otro acuerdo o política vinculada a Cooplance, se rigen e interpretan en todos sus puntos de acuerdo con las leyes vigentes de la República Argentina.</p>
                <p><strong>Resolución de Controversias:</strong> Ante cualquier divergencia, reclamo o disputa legal, las partes acuerdan someterse a la jurisdicción exclusiva de los Tribunales Ordinarios de la Provincia de Córdoba.</p>

                <h3>12. Modificaciones a los Términos y Políticas</h3>
                <p>Cooplance se reserva el derecho exclusivo de modificar, actualizar o reemplazar estos Términos y Condiciones en cualquier momento. El uso continuado de la plataforma tras la publicación de dichas modificaciones constituye la aceptación expresa y plena de los nuevos términos por parte del Usuario.</p>
            </div>
        </div>
    );

    const renderPrivacy = () => (
        <div className="help-content fade-in">
            <h2>Política de Privacidad de Cooplance</h2>
            
            <div className="legal-text">
                <span className="last-updated">Última actualización: Abril de 2026</span>

                <h3>1. Introducción</h3>
                <p>Bienvenido a Cooplance. El cuidado y la protección de tus datos personales son fundamentales para nosotros. Esta Política de Privacidad describe cómo recopilamos, utilizamos, protegemos y compartimos la información de nuestros usuarios (en adelante, "Usuarios", ya sean clientes, freelancers o empresas) cuando acceden y utilizan la plataforma de Cooplance.</p>
                <p>A los efectos legales y del tratamiento de datos personales, la plataforma "Cooplance" es operada y administrada por <strong>[RAZÓN SOCIAL DE LA EMPRESA, ej. Cooplance S.A.S.]</strong>, con CUIT <strong>[Número de CUIT de la empresa]</strong> y domicilio legal constituido en <strong>[Dirección legal de la empresa, Provincia, País]</strong>.</p>
                <p>Al registrarte y utilizar nuestros servicios, aceptas las prácticas descritas en este documento.</p>

                <h3>2. Información que recopilamos</h3>
                <p>Para garantizar un entorno seguro, transparente y de confianza, solicitamos información específica dependiendo del tipo de cuenta y la naturaleza del servicio:</p>
                <ul>
                    <li><strong>Datos de registro generales:</strong> A todos los Usuarios les solicitamos información obligatoria que incluye su nombre real, apellido, fecha de nacimiento y una dirección de correo electrónico válida.</li>
                    <li><strong>Información de Freelancers (Profesionales y Oficios):</strong>
                        <ul>
                            <li><strong>Identidad:</strong> Solicitamos el número de DNI de forma obligatoria para verificar la identidad del profesional.</li>
                            <li><strong>Profesiones reguladas:</strong> Es obligatorio proporcionar el número de matrícula correspondiente y la institución académica.</li>
                        </ul>
                    </li>
                    <li><strong>Información de Clientes:</strong> La provisión del DNI no es obligatoria para los usuarios que se registran exclusivamente para contratar servicios.</li>
                    <li><strong>Cuentas de Empresa:</strong> Solicitamos de forma obligatoria el nombre de la empresa, el CUIT, y el nombre del propietario, representante legal o titular.</li>
                    <li><strong>Datos de ubicación y contacto (Servicios Presenciales):</strong> Proporcionar la ubicación geográfica es de carácter obligatorio para coordinar trabajos presenciales.</li>
                </ul>

                <h3>3. Información de Pagos, Facturación y Pasarelas de Pago</h3>
                <p><strong>Naturaleza del servicio:</strong> Cooplance actúa exclusivamente como una plataforma tecnológica de intermediación. No procesamos de forma directa las transacciones económicas entre los Usuarios.</p>
                <p><strong>Procesadores de pago externos:</strong> Toda la gestión se realiza íntegramente a través de pasarelas de pago de terceros debidamente reguladas y certificadas. El Usuario comprende y acepta que los fondos son gestionados por estos proveedores externos.</p>
                <div className="legal-note">
                    <p><strong>Seguridad y no almacenamiento de datos:</strong> Cooplance no recopila, no procesa y no almacena bajo ninguna circunstancia datos financieros críticos (como números de tarjetas). Toda la información es procesada en entornos seguros y encriptados de nuestras pasarelas asociadas.</p>
                </div>

                <h3>4. Visibilidad y Privacidad de la Información</h3>
                <p>Clasificamos la información en pública (visible para otros usuarios) y privada (estrictamente confidencial).</p>
                <p><strong>Información Pública:</strong> Nombre y apellido, número de matrícula (profesionales), nombre de la empresa y ubicación geográfica (en servicios presenciales).</p>
                <p><strong>Información Privada:</strong> DNI, CUIT, fecha de nacimiento, número de teléfono celular y dirección de correo electrónico. La comunicación se realizará exclusivamente a través de los canales internos provistos por Cooplance.</p>

                <h3>5. Retención y Eliminación de Datos</h3>
                <ul>
                    <li><strong>Desactivación inmediata:</strong> Al solicitar la eliminación de la cuenta, el perfil dejará de ser visible instantáneamente.</li>
                    <li><strong>Acceso a interacciones previas:</strong> El historial de trabajos y chats permanecerá accesible únicamente para aquellos usuarios con los que se haya interactuado previamente.</li>
                    <li><strong>Período de gracia:</strong> Se establece un período de 30 días posteriores a la solicitud de baja antes de la eliminación definitiva.</li>
                    <li><strong>Excepciones legales:</strong> Conservaremos cierta información necesaria (como DNI o CUIT) por el tiempo que exija la ley para prevención de fraudes y cumplimiento fiscal.</li>
                </ul>

                <h3>6. Uso de Cookies y Tecnologías de Rastreo</h3>
                <p><strong>¿Qué son?</strong> Pequeños archivos de texto que se guardan en tu navegador para mejorar la experiencia y garantizar el correcto funcionamiento.</p>
                <ul>
                    <li><strong>Esenciales y de Seguridad:</strong> Para mantener sesiones seguras y prevenir accesos no autorizados.</li>
                    <li><strong>Rendimiento y Analítica:</strong> Para entender cómo los usuarios interactúan con la plataforma.</li>
                </ul>

                <h3>7. Seguridad, Moderación y Contenido Inapropiado</h3>
                <p>Nos reservamos el derecho de monitorear y moderar el contenido para prevenir actividades ilícitas.</p>
                <ul>
                    <li><strong>Contenido prohibido:</strong> Queda estrictamente prohibida la publicación de contenido para adultos (+18), material pornográfico o que fomente la violencia.</li>
                    <li><strong>Baneo y Apelación:</strong> Si un usuario viola estas normativas, su cuenta será suspendida. El usuario tiene 15 días hábiles para apelar enviando un correo a <strong>cooplance.org@gmail.com</strong>.</li>
                </ul>

                <h3>8. Almacenamiento y Transferencia Internacional de Datos</h3>
                <p>La información es almacenada de forma segura utilizando infraestructuras en la nube de primer nivel (como Supabase).</p>
                <p><strong>Ubicación:</strong> Los servidores pueden encontrarse fuera de tu país de residencia (por ejemplo, en Estados Unidos). Al utilizar Cooplance, aceptas esta transferencia internacional bajo altos estándares de seguridad.</p>

                <h3>9. Derechos del Usuario, Acceso y Modificación de Datos</h3>
                <p>Tienes derecho a acceder, rectificar o eliminar tus datos. Los datos secundarios se pueden cambiar desde el panel, pero los datos críticos (DNI, Nombre, Mail) requieren una solicitud formal a <strong>cooplance.org@gmail.com</strong> por motivos de seguridad.</p>

                <h3>10. Menores de Edad y Cuentas Supervisadas</h3>
                <div className="legal-note">
                    <p><strong>Cuentas Supervisadas (16-17 años):</strong> Operan bajo la tutoría obligatoria de un Responsable Legal vinculado. Tienen prohibido realizar trabajos presenciales y relacionarse comercialmente con cuentas de "Empresas".</p>
                </div>
                <p>Al cumplir los 18 años, la cuenta se desvinculará automáticamente de la supervisión y pasará a ser una cuenta estándar.</p>

                <h3>11. Cambios a esta Política de Privacidad</h3>
                <p>Cooplance se reserva el derecho de modificar esta política. Cualquier cambio sustancial será notificado vía correo electrónico o mediante un aviso destacado en la plataforma.</p>
            </div>
        </div>
    );

    return (
        <div className={`help-center-container fade-in ${isMobile ? (activeTab ? 'detail-mode' : 'index-mode') : 'desktop-mode'}`}>
            {isMobile ? (
                !activeTab ? (
                    <div className="help-index-wrapper">
                        <h1 className="help-index-title">CENTRO DE AYUDA</h1>
                        <div className="help-category-grid">
                            {categories.map((cat) => (
                                <div key={cat.id} className="help-category-card glass-panel" onClick={() => handleTabChange(cat.id)}>
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
                            Volver
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
