import { 
    CreditCard as Coin, 
    Zap as Flame, 
    Rocket, 
    Heart, 
    Star, 
    Diamond, 
    Users as Handshake, 
    Eye 
} from 'lucide-react';

export const BADGE_FAMILIES = [
    {
        familyId: 'sales',
        title: 'Trayectoria Comercial',
        description: 'Métricas de volumen y éxito en la contratación de servicios.',
        badges: [
            { id: 'f_sales_1', title: 'Primera Venta', required: 1, desc: 'Registro de la primera venta exitosa.' },
            { id: 'f_sales_10', title: 'Operación Consolidada', required: 10, desc: '10 ventas completadas con éxito.' },
            { id: 'f_sales_100', title: 'Vendedor Senior', required: 100, desc: 'Alcanza las 100 ventas concretadas.' },
            { id: 'f_sales_1000', title: 'Líder Comercial', required: 1000, desc: 'Hito de 1,000 ventas alcanzado.' },
            { id: 'f_sales_10000', title: 'Referente de Mercado', required: 10000, desc: 'Referente global con 10,000 ventas gestionadas.' },
        ]
    },
    {
        familyId: 'levels',
        title: 'Desarrollo Profesional',
        description: 'Crecimiento profesional y nivel de experiencia en la plataforma.',
        badges: [
            { id: 'f_lvl_2', title: 'Nivel Inicial', required: 2, desc: 'Alcanza el Nivel 2 de experiencia.' },
            { id: 'f_lvl_6', title: 'Nivel Profesional', required: 6, desc: 'Alcanza el Nivel 6 de experiencia.' },
            { id: 'f_lvl_8', title: 'Nivel Experto', required: 8, desc: 'Alcanza el Nivel 8 de experiencia.' },
            { id: 'f_lvl_9', title: 'Especialista Senior', required: 9, desc: 'Alcanza el Nivel 9 de experiencia.' },
            { id: 'f_lvl_10', title: 'Grado Profesional Máximo', required: 10, desc: 'Alcanza el nivel máximo de autoridad profesional (10).' },
        ]
    },
    {
        familyId: 'services',
        title: 'Portafolio de Servicios',
        description: 'Capacidad de diversificación de la oferta profesional.',
        badges: [
            { id: 'f_srv_1', title: 'Publicación Inicial', required: 1, desc: 'Publicación de la primera oferta de servicio técnica.' },
            { id: 'f_srv_3', title: 'Portafolio Diversificado', required: 3, desc: 'Oferta diversificada de 3 servicios activos.' },
            { id: 'f_srv_5', title: 'Consultoría Integral', required: 5, desc: 'Portafolio completo de 5 servicios profesionales.' },
        ]
    },
    {
        familyId: 'loyalty',
        title: 'Fidelización de Clientes',
        description: 'Métricas de retención y recurrencia de contratos.',
        badges: [
            { id: 'f_loy_2', title: 'Retención de Clientes', required: 2, desc: 'Un cliente ha vuelto a contratar sus servicios.' },
            { id: 'f_loy_5', title: 'Alianza Estratégica', required: 5, desc: 'Relación continua con 5 contratos recurrentes.' },
            { id: 'f_loy_10', title: 'Socio de Confianza', required: 10, desc: 'Alianza a largo plazo con 10 contratos del mismo cliente.' },
        ]
    },
    {
        familyId: 'speed',
        title: 'Eficiencia Operativa',
        description: 'Cumplimiento y optimización de los plazos de entrega.',
        badges: [
            { id: 'f_spd_1', title: 'Entrega Eficiente', required: 1, desc: 'Primera entrega realizada antes del plazo límite.' },
            { id: 'f_spd_5', title: 'Optimización de Tiempos', required: 5, desc: '5 entregas anticipadas confirmadas.' },
            { id: 'f_spd_10', title: 'Excelencia Operativa', required: 10, desc: '10 entregas finalizadas antes de lo previsto.' },
            { id: 'f_spd_100', title: 'Gestión Temporal Superior', required: 100, desc: 'Historial de 100 entregas puntuales y anticipadas.' },
        ]
    },
    {
        familyId: 'reviews',
        title: 'Satisfacción del Cliente',
        description: 'Garantía de calidad y valoraciones positivas.',
        badges: [
            { id: 'f_rev_1', title: 'Calidad Inicial', required: 1, desc: 'Primera reseña con máxima calificación.' },
            { id: 'f_rev_5', title: 'Consistencia de Calidad', required: 5, desc: '5 reseñas consecutivas de excelencia profesional.' },
            { id: 'f_rev_10', title: 'Prestigio Profesional', required: 10, desc: '10 valoraciones de 5 estrellas documentadas.' },
            { id: 'f_rev_100', title: 'Trayectoria de Excelencia', required: 100, desc: 'Logro de 100 reseñas de calificación máxima verificadas.' },
        ]
    }
];

export const CLIENT_BADGE_FAMILIES = [
    {
        familyId: 'purchases',
        title: 'Inversión en Talento',
        description: 'Métricas de volumen y éxito en la adquisición de servicios.',
        badges: [
            { id: 'c_pur_1', title: 'Primera Compra', required: 1, desc: 'Gestión de la primera contratación en la plataforma.' },
            { id: 'c_pur_10', title: 'Inversor en Talento', required: 10, desc: 'Registros de 10 contrataciones profesionales realizadas.' },
            { id: 'c_pur_100', title: 'Socio Corporativo', required: 100, desc: 'Gestión de 100 contratos de proyecto finalizados.' },
        ]
    },
    {
        familyId: 'levels',
        title: 'Evolución como Cliente',
        description: 'Crecimiento y experiencia gestionando proyectos en Cooplance.',
        badges: [
            { id: 'c_lvl_2', title: 'Cliente Iniciado', required: 2, desc: 'Alcanza el Nivel 2 como contratista.' },
            { id: 'c_lvl_6', title: 'Cliente Recurrente', required: 6, desc: 'Alcanza el Nivel 6 de reputación.' },
            { id: 'c_lvl_8', title: 'Estratega de Proyectos', required: 8, desc: 'Alcanza el Nivel 8 de experiencia.' },
            { id: 'c_lvl_10', title: 'Patrono de Élite', required: 10, desc: 'Alcanza el grado máximo de gestión (Nivel 10).' },
        ]
    },
    {
        familyId: 'loyalty',
        title: 'Fidelidad a Talentos',
        description: 'Métrica de re-contratación y confianza en profesionales.',
        badges: [
            { id: 'c_loy_2', title: 'Socio de Confianza', required: 2, desc: 'Has contratado al mismo profesional 2 veces.' },
            { id: 'c_loy_5', title: 'Alianza Continua', required: 5, desc: 'Has confiado en el mismo talento para 5 encargos.' },
            { id: 'c_loy_10', title: 'Mecenas Principal', required: 10, desc: 'Has mantenido una relación de 10 contratos con el mismo profesional.' },
        ]
    },
    {
        familyId: 'reviews',
        title: 'Reputación como Comprador',
        description: 'Calidad de la interacción con los profesionales contratados.',
        badges: [
            { id: 'c_rev_1', title: 'Buen Empleador', required: 1, desc: 'Primera valoración positiva recibida.' },
            { id: 'c_rev_5', title: 'Trato Profesional', required: 5, desc: '5 reseñas de excelencia por parte de freelancers.' },
            { id: 'c_rev_10', title: 'Líder de Proyectos', required: 10, desc: 'Historial de 10 valoraciones impecables.' },
        ]
    },
    {
        familyId: 'talent',
        title: 'Gestión Estratégica de Talento',
        description: 'Capacidad para diversificar y gestionar una red de recursos.',
        badges: [
            { id: 'c_tal_2', title: 'Selección Diversificada', required: 2, desc: 'Colaboración documentada con 2 profesionales distintos.' },
            { id: 'c_tal_5', title: 'Gestión de Recursos', required: 5, desc: 'Asignaciones diversificadas con 5 perfiles de talento.' },
            { id: 'c_tal_10', title: 'Red de Colaboración Global', required: 10, desc: 'Consolidación de una red de 10 profesionales externos.' },
        ]
    },
    {
        familyId: 'projects',
        title: 'Arquitectura de Proyectos',
        description: 'Estructuración y dirección de iniciativas profesionales.',
        badges: [
            { id: 'c_prj_1', title: 'Planificación Inicial', required: 1, desc: 'Estructuración del primer proyecto profesional.' },
            { id: 'c_prj_3', title: 'Arquitecto de Proyectos', required: 3, desc: 'Planificación documentada de 3 iniciativas complejas.' },
            { id: 'c_prj_5', title: 'Director de Iniciativas', required: 5, desc: 'Gestión histórica de 5 grandes proyectos profesionales.' },
        ]
    }
];
