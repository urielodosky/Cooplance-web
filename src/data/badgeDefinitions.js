import { 
    CreditCard as Coin, 
    Zap as Flame, 
    Rocket, 
    Heart, 
    Zap as Lightning, 
    Star, 
    Diamond, 
    Users as Handshake, 
    Eye 
} from 'lucide-react';

export const BADGE_FAMILIES = [
    {
        familyId: 'sales',
        title: 'Trayectoria Comercial',
        description: 'Volumen y éxito en la venta de servicios.',
        badges: [
            { id: 'f_sales_1', title: 'Primera Venta', required: 1, desc: 'Registro de la primera venta.' },
            { id: 'f_sales_10', title: '10 Ventas', required: 10, desc: '10 ventas completadas con éxito.' },
            { id: 'f_sales_100', title: '100 Ventas', required: 100, desc: 'Alcanza las 100 ventas concretadas.' },
            { id: 'f_sales_1000', title: '1,000 Ventas', required: 1000, desc: 'Hito de 1,000 ventas alcanzado.' },
            { id: 'f_sales_10000', title: '10,000 Ventas', required: 10000, desc: 'Referente global con 10,000 ventas.' },
        ]
    },
    {
        familyId: 'levels',
        title: 'Desarrollo Profesional',
        description: 'Mide tu crecimiento y nivel de experiencia.',
        badges: [
            { id: 'f_lvl_2', title: 'Aspirante', required: 2, desc: 'Alcanza el Nivel 2.' },
            { id: 'f_lvl_6', title: 'Profesional', required: 6, desc: 'Alcanza el Nivel 6.' },
            { id: 'f_lvl_8', title: 'Experto', required: 8, desc: 'Alcanza el Nivel 8.' },
            { id: 'f_lvl_9', title: 'Maestro', required: 9, desc: 'Alcanza el Nivel 9.' },
            { id: 'f_lvl_10', title: 'Leyenda Viva', required: 10, desc: 'Alcanza el nivel máximo de experiencia (10).' },
        ]
    },
    {
        familyId: 'services',
        title: 'Portafolio de Servicios',
        description: 'Diversificación de la oferta profesional.',
        badges: [
            { id: 'f_srv_1', title: 'El Pionero', required: 1, desc: 'Publicación de la primera oferta de servicio.' },
            { id: 'f_srv_3', title: 'Emprendedor', required: 3, desc: 'Oferta diversificada de 3 servicios.' },
            { id: 'f_srv_5', title: 'Agencia', required: 5, desc: 'Portafolio completo de 5 servicios activos.' },
        ]
    },
    {
        familyId: 'loyalty',
        title: 'Fidelización de Clientes',
        description: 'Métricas de retención y recurrencia.',
        badges: [
            { id: 'f_loy_2', title: 'Cliente Frecuente', required: 2, desc: 'Un cliente ha vuelto a contratar tus servicios.' },
            { id: 'f_loy_5', title: 'Lealtad Pura', required: 5, desc: 'Relación continua con 5 contratos recurrentes.' },
            { id: 'f_loy_10', title: 'Amigos Por Siempre', required: 10, desc: 'Alianza a largo plazo con 10 contratos del mismo cliente.' },
        ]
    },
    {
        familyId: 'speed',
        title: 'Eficiencia Operativa',
        description: 'Métricas de cumplimiento de plazos de entrega.',
        badges: [
            { id: 'f_spd_1', title: 'Acelerador', required: 1, desc: 'Primera entrega anticipada.' },
            { id: 'f_spd_5', title: 'Turbo', required: 5, desc: '5 entregas antes de la fecha límite.' },
            { id: 'f_spd_10', title: 'Rayo', required: 10, desc: '10 entregas anticipadas confirmadas.' },
            { id: 'f_spd_100', title: 'Viajero en el Tiempo', required: 100, desc: 'Historial de 100 entregas puntuales y anticipadas.' },
        ]
    },
    {
        familyId: 'reviews',
        title: 'Satisfacción del Cliente',
        description: 'Evaluaciones y control de calidad percibida.',
        badges: [
            { id: 'f_rev_1', title: 'Buen Comienzo', required: 1, desc: 'Primera reseña con máxima calificación.' },
            { id: 'f_rev_5', title: 'Aprobado', required: 5, desc: '5 reseñas consecutivas de excelencia.' },
            { id: 'f_rev_10', title: 'Famoso', required: 10, desc: '10 valoraciones perfectas documentadas.' },
            { id: 'f_rev_100', title: 'Ídolo de Masas', required: 100, desc: 'Logro de 100 reseñas estelares verificadas.' },
        ]
    }
];

export const CLIENT_BADGE_FAMILIES = [
    {
        familyId: 'purchases',
        title: 'Inversión en Talento',
        description: 'Historial de contrataciones corporativas.',
        badges: [
            { id: 'c_pur_1', title: 'Primer Paso', required: 1, desc: 'Gestión de la primera contratación.' },
            { id: 'c_pur_10', title: 'Inversor', required: 10, desc: 'Registros de 10 contrataciones realizadas.' },
            { id: 'c_pur_100', title: 'Magnate', required: 100, desc: 'Asignación de 100 contratos de proyecto.' },
        ]
    },
    {
        familyId: 'talent',
        title: 'Diversificación de Recursos Humanos',
        description: 'Capacidad para expandir la red de talento.',
        badges: [
            { id: 'c_tal_2', title: 'Ojo Crítico', required: 2, desc: 'Colaboración documentada con 2 profesionales distintos.' },
            { id: 'c_tal_5', title: 'Director de Casting', required: 5, desc: 'Asignaciones diversificadas con 5 perfiles.' },
            { id: 'c_tal_10', title: 'Red Global', required: 10, desc: 'Consolidación de una red de 10 profesionales.' },
        ]
    },
    {
        familyId: 'projects',
        title: 'Gestión de Proyectos',
        description: 'Estructuración y publicación de iniciativas profesionales.',
        badges: [
            { id: 'c_prj_1', title: 'Primera Idea', required: 1, desc: 'Estructuración del primer proyecto.' },
            { id: 'c_prj_3', title: 'Arquitecto', required: 3, desc: 'Planificación documentada de 3 iniciativas.' },
            { id: 'c_prj_5', title: 'Visionario', required: 5, desc: 'Gestión simultánea o histórica de 5 grandes proyectos.' },
        ]
    }
];
