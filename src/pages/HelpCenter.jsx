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
                <h3>Disponibilidad y Modo Pausa</h3>
                <p>En Cooplance valoramos tu autonomía. El "Modo Pausa" te permite decidir cuándo estar fuera de servicio sin preocupaciones.</p>
                <ul>
                    <li>Es <strong>100% voluntario e ilimitado</strong>. Puedes activarlo y desactivarlo las veces que quieras desde tu perfil.</li>
                    <li>Mientras estás en pausa, tus servicios se mostrarán al final de los listados con un aviso especial, evitando que recibas nuevos pedidos mientras no estás disponible.</li>
                    <li><strong>Sin penalizaciones por tiempo:</strong> No perderás XP ni nivel por tomarte el tiempo que necesites.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Ganancia de Experiencia (XP) y Calidad</h3>
                <p>Tu XP te permite subir de nivel y se obtiene principalmente al concretar ventas exitosas:</p>
                <ul>
                    <li>Venta Mayor a $140.000 ARS (ciento cuarenta mil pesos): <strong>80 XP</strong></li>
                    <li>Venta Mayor a $70.000 ARS (setenta mil pesos): <strong>40 XP</strong></li>
                    <li>Venta Mayor a $28.000 ARS (veintiocho mil pesos): <strong>30 XP</strong></li>
                    <li>De $7.000 ARS (siete mil pesos) a $28.000 ARS (veintiocho mil pesos): <strong>10 XP</strong></li>
                </ul>
                <p><em>* Nivel 1: Menos de $140.000 ARS (ciento cuarenta mil pesos) otorga 40 XP fijos.</em></p>
                
                <h4 style={{ marginTop: '1.2rem', color: 'var(--primary)' }}>Penalizaciones por Calidad (Nivel 6+)</h4>
                <p>Para asegurar la excelencia en los niveles superiores, los profesionales de <strong>Nivel 6 o más</strong> están sujetos a deducciones de XP si reciben bajas calificaciones:</p>
                <ul>
                    <li>Reseña de 1 o 2 estrellas: <strong>-100 XP</strong></li>
                    <li>Reseña de 3 estrellas: <strong>-20 XP</strong></li>
                </ul>
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
            <p>Cooplance ofrece un entorno de alto rendimiento para organizaciones que buscan escalar sus equipos con talento verificado y flujos de trabajo optimizados.</p>
            
            <div className="freelancer-invite-box" style={{ 
                background: 'rgba(99, 102, 241, 0.1)', 
                border: '1px solid var(--primary)', 
                padding: '1rem', 
                borderRadius: '12px',
                marginBottom: '2rem',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
            }}>
                <strong>💡 Tip para Freelancers:</strong> Te invitamos a leer esta sección para conocer cómo piensan las empresas, qué campos adicionales ven al contratar y cómo puedes destacar tu perfil institucional.
            </div>

            <div className="help-section">
                <h3>Perfil de Empresa y Verificación</h3>
                <p>Las cuentas de empresa acceden a un nivel de profesionalismo superior para atraer al mejor talento de la plataforma.</p>
                <ul>
                    <li><strong>Insignia de Verificación:</strong> Al completar el registro con CUIT y datos legales, tu empresa recibe un sello distintivo que genera confianza inmediata.</li>
                    <li><strong>Visibilidad Premium:</strong> Las ofertas de empresas se destacan en los listados para atraer profesionales de Niveles 5 a 10.</li>
                    <li><strong>Perfil Institucional:</strong> Muestra tu industria, tamaño de equipo y proyectos anteriores para construir tu reputación como empleador.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Gestión de Postulaciones (Postulaciones)</h3>
                <p>Hemos diseñado un flujo de trabajo intuitivo para que encuentres a la persona o equipo ideal sin fricciones:</p>
                <ol>
                    <li><strong>Recepción de Propuestas:</strong> Cada vez que un freelancer se postula, verás su propuesta económica, tiempo de entrega y una carta de presentación personalizada.</li>
                    <li><strong>Análisis de Perfil:</strong> Puedes acceder al historial completo del postulante, sus insignias, nivel de XP y reseñas de otros clientes.</li>
                    <li><strong>Entrevistas vía Chat:</strong> Inicia un hilo de conversación directo con los candidatos pre-seleccionados para profundizar en detalles técnicos o culturales.</li>
                    <li><strong>Selección y Contratación:</strong> Una vez elegido el candidato, el sistema formaliza la contratación y los fondos quedan protegidos por el sistema de Escrow hasta la entrega.</li>
                </ol>
            </div>

            <div className="help-section">
                <h3>Publicación Avanzada de Vacantes</h3>
                <p>A diferencia de los clientes individuales, las empresas pueden estructurar sus búsquedas laborales con campos específicos:</p>
                <ul>
                    <li><strong>Múltiples Vacantes:</strong> ¿Necesitas 5 desarrolladores para un mismo proyecto? Puedes definir el número de personas a contratar en una sola publicación.</li>
                    <li><strong>Duración del Contrato:</strong> Establece si el trabajo es por un hito único, por meses o por tiempo indefinido.</li>
                    <li><strong>Frecuencia de Pago:</strong> Define si los pagos serán semanales, quincenales o mensuales, adaptándose a la administración de tu empresa.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Hiring Coops (Equipos)</h3>
                <p>Nuestra mayor ventaja competitiva. Como empresa, no solo puedes contratar individuos, sino también <strong>Cooperativas (Coops)</strong>.</p>
                <div className="legal-note">
                    <p>Contratar una Coop te permite delegar la gestión interna del equipo al Líder de Proyecto de la Coop, reduciendo tu carga administrativa y asegurando que varios profesionales trabajen en sincronía bajo un mismo presupuesto.</p>
                </div>
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
                            <p><strong>Ejemplo:</strong> En un proyecto de $100.000 ARS (cien mil pesos) con dos Nivel 6 y un Nivel 3, se divide en 15 partes (6+6+3). El Nivel 3 recibe 3 partes (~$20.000 ARS - veinte mil pesos) y los Nivel 6 reciben 6 partes cada uno (~$40.000 ARS - cuarenta mil pesos). Esto incentiva la meritocracia y el apoyo a nuevos talentos.</p>
                        </div>
                    </li>
                    <li><strong>2. División Equitativa (Automática):</strong> Los fondos netos se distribuyen en partes exactamente iguales entre todos los miembros que participaron en el trabajo, independientemente de su nivel personal.</li>
                    <li><strong>3. División Manual (Personalizada):</strong> El fundador o administrador de la Coop define porcentajes o montos específicos para cada miembro. Esta distribución debe quedar preestablecida por el dueño de la Coop antes de iniciar la ejecución del servicio para garantizar claridad total.</li>
                </ul>
            </div>

            <div className="help-section">
                <h3>Distribución de Pagos</h3>
                <div className="legal-note">
                    <p><strong>Ejemplo:</strong> Al cobrar un proyecto de $100.000 ARS (cien mil pesos) donde trabajaron un freelancer Nivel 6, otro de Nivel 6, y un talento nuevo de Nivel 3. Se obtienen 15 partes (6+6+3). El Nivel 3 obtiene ~$20.000 ARS (veinte mil pesos) y los Nivel 6 ~$40.000 ARS (cuarenta mil pesos) cada uno.</p>
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
                <p><strong>Prevención de Fraude y Contracargos:</strong> Cooplance se reserva el derecho de auditar o suspender temporalmente los retiros de fondos ante cualquier actividad financiera sospechosa. En caso de que un Cliente inicie un contracargo o desconocimiento de compra fraudulento ante su entidad emisora o pasarela de pagos, Cooplance no estará obligada a liquidar dichos fondos al Freelancer o Coop con patrimonio propio. Se procederá a la suspensión inmediata de las cuentas involucradas hasta la resolución del caso.</p>

                <h3>6. Sistema de Niveles y Experiencia (XP)</h3>
                <ul>
                    <li><strong>Obtención de XP:</strong> Se obtienen puntos de experiencia al concretar ventas exitosas.</li>
                    <li><strong>Restricciones:</strong> Ventas inferiores a $5.000 ARS (cinco mil pesos) no generan XP. El tope máximo de experiencia por transacción es de 100 XP.</li>
                    <li><strong>Evolución:</strong> Cooplance podrá incorporar en el futuro métricas adicionales (como reseñas de clientes) para la progresión de niveles.</li>
                </ul>

                <h3>7. Entregas, Cancelaciones y Retención de Fondos (Escrow)</h3>
                <p><strong>Seguridad Financiera:</strong> Cooplance actúa exclusivamente como intermediario tecnológico. La retención temporal de fondos (Escrow) para la seguridad de los proyectos es gestionada en su totalidad por pasarelas de pago externas. Cooplance no almacena ni administra fondos reales; la Billetera interna cumple una función estrictamente visual.</p>
                <div className="legal-note">
                    <p><strong>Excepción de Arrepentimiento:</strong> En concordancia con la Ley de Defensa del Consumidor de la República Argentina, al tratarse de servicios digitales confeccionados a medida, el Usuario reconoce y acepta que no resulta aplicable el derecho de revocación o arrepentimiento de 10 días una vez iniciada la ejecución del servicio.</p>
                </div>
                <div className="legal-note">
                    <p><strong>Protección al Freelancer (Política de No Reembolso):</strong> Una vez que el trabajo ha comenzado o se ha realizado la entrega, no se aceptarán cancelaciones unilaterales ni devoluciones por motivos de insatisfacción personal del Cliente. En caso de inconformidad, el Cliente deberá agotar las instancias de "Revisiones" ofrecidas por el Freelancer.</p>
                </div>
                <p><strong>Cancelación por Incumplimiento:</strong> Si el Freelancer no realiza ninguna entrega una vez vencido el plazo estipulado, el Cliente tendrá el derecho de solicitar la cancelación del proyecto. En este caso, el Cliente podrá optar por:</p>
                <ol style={{ paddingLeft: '1.5rem' }}>
                    <li>Recibir el reembolso del 100% de los fondos a su medio de pago original (sujeto a los tiempos de procesamiento de la entidad financiera), o</li>
                    <li>Elegir que dicho monto se acredite íntegramente como "Saldo a favor" en su cuenta de Cooplance para ser utilizado en futuras contrataciones.</li>
                </ol>
                <div className="legal-note" style={{ marginTop: '0.5rem', marginBottom: '1rem', borderLeftColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                    <p style={{ color: '#ef4444' }}><strong>Aviso Legal sobre Incumplimiento Grave:</strong> En caso de incumplimiento contractual grave o fraude comprobado por alguna de las partes, Cooplance se reserva el derecho de otorgar la información privada (datos de identidad y contacto) del sujeto que incumpla a la parte afectada, para que esta pueda realizar las acciones legales y extrajudiciales que considere necesarias.</p>
                </div>
                <p><strong>Aprobación Automática:</strong> Si el Cliente no responde tras una entrega final, el sistema marcará el pedido como completado automáticamente tras tres (3) días hábiles.</p>

                <h3>8. Propiedad Intelectual y Derechos de Autor</h3>
                <ul>
                    <li><strong>Transferencia de Derechos:</strong> Una vez que el trabajo ha sido finalizado y el pago ha sido liberado en favor del Freelancer o la Coop, la propiedad legal y los derechos de uso comercial del producto final se transfieren íntegramente al Cliente o Empresa contratante.</li>
                    <li><strong>Uso del Freelancer:</strong> El Freelancer o la Coop no podrán dar un uso propio, personal o comercial al trabajo realizado para un tercero.</li>
                    <li><strong>Derecho de Exhibición (Portfolio):</strong> El Freelancer o los miembros de la Coop conservan el derecho permanente de incluir el trabajo realizado en su portfolio profesional dentro y fuera de Cooplance, con el fin de exhibir su experiencia y habilidades ante potenciales clientes, salvo acuerdo de confidencialidad previo.</li>
                </ul>
                <p><strong>Detalles legales adicionales:</strong> Otros aspectos de la propiedad intelectual se encuentran <em>(Aún por definir)</em>.</p>

                <p><strong>Intermediación:</strong> Cooplance actúa exclusivamente como intermediario tecnológico. No interviene en la ejecución de los proyectos y no se hace responsable por la calidad, exactitud o nivel de satisfacción final del trabajo entregado por los profesionales.</p>
                
                <h3>Resolución de Disputas</h3>
                <p>En caso de conflicto entre usuarios, Cooplance proveerá únicamente un canal de mediación amistosa y no asume el rol de árbitro legal ni financiero. De no haber acuerdo, la resolución de los fondos quedará sujeta a las políticas del procesador de pagos externo, renunciando los usuarios a iniciar acciones contra Cooplance por la calidad de los servicios contratados.</p>
                <div className="legal-note">
                    <p><strong>Exención de Responsabilidad en Servicios Presenciales:</strong> En el caso de los servicios que requieran un encuentro físico o presencial entre los Usuarios, Cooplance funciona únicamente como una plataforma de contacto. Los Usuarios asumen la total responsabilidad y el riesgo al acordar y ejecutar trabajos fuera del entorno digital.</p>
                </div>
                <p><strong>Reportes, Soporte y Colaboración Legal:</strong> Sin perjuicio de la exención de responsabilidad mencionada, Cooplance mantiene un estricto compromiso con la seguridad de su comunidad. Ante cualquier incidente, maltrato o irregularidad durante un servicio (físico o digital), el Usuario afectado podrá y deberá emitir un reporte a nuestro equipo de soporte.</p>

                <h3>10. Obligaciones Fiscales y Facturación</h3>
                <p>Cooplance actúa como un intermediario y no es empleador, socio ni representante de los Freelancers. Cada Freelancer opera como un profesional independiente y es el único y exclusivo responsable de cumplir con sus obligaciones fiscales, tributarias y previsionales vigentes (ej. inscripción en AFIP, Dirección General de Rentas, etc.). Es responsabilidad exclusiva del Freelancer o de la Coop emitir y entregar al Cliente o Empresa la factura legal correspondiente por el total del servicio prestado. Cooplance emitirá y pondrá a disposición del Usuario la factura legal correspondiente única y exclusivamente por el monto equivalente a la comisión de intermediación (fee de servicio) cobrada por la plataforma.</p>

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
                    <li><strong>Identidad/Registro:</strong> Cooplance solicita el número de DNI o documento de identidad exclusivamente a los Usuarios registrados bajo el rol de Freelancer y a los Adultos Responsables para verificar identidad, mayoría de edad o vínculo parental. No es obligatorio proveer el DNI para usuarios que se registren exclusivamente como Clientes.</li>
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
                    <li><strong>Prohibición de Distribución y Trabajos (+18):</strong> Queda estrictamente prohibida la distribución, realización de trabajos, o publicación de proyectos relacionados con temas sexuales o para mayores de dieciocho (+18) años, así como cualquier material pornográfico o que fomente la violencia. El incumplimiento de esta norma derivará en la suspensión inmediata y permanente de la cuenta.</li>
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
                <div className="legal-note" style={{ marginTop: '1rem' }}>
                    <p><strong>Consentimiento de Supervisión:</strong> Para garantizar un entorno seguro, el Adulto Responsable vinculado tendrá acceso de lectura irrestricto (Modo Espejo) a toda la actividad de la cuenta del menor, incluyendo transacciones, postulaciones y chats privados. Al registrarse, ambas partes aceptan y consienten esta supervisión.</p>
                    <p><strong>Límite de Cupo:</strong> Cada Adulto Responsable podrá tener un máximo de dos (2) cuentas de menores bajo su supervisión simultánea.</p>
                </div>

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
