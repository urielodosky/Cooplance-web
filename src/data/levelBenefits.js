export const FREELANCER_BENEFITS = {
    1: {
        name: 'Nuevo Talento',
        description: 'Perfil en fase de inicio, enfocado en construir reputación.',
        benefits: [
            '1 Proyecto a la vez',
            'Publicar 1 servicio',
            '5 solicitudes de trabajo por semana',
            'Tus clientes reciben doble XP (incentivo de contratación)'
        ]
    },
    2: {
        name: 'Asociado Junior',
        description: 'Trayectoria inicial confirmada con experiencia básica.',
        benefits: [
            'Manejar hasta 3 proyectos simultáneos',
            'Publicar hasta 2 servicios',
            '10 solicitudes de trabajo por semana'
        ]
    },
    3: {
        name: 'Asociado Senior',
        description: 'Colaborador recurrente con flujo de trabajo constante.',
        benefits: [
            'Manejar hasta 5 proyectos a la vez',
            'Publicar hasta 3 servicios',
            '20 solicitudes de trabajo por semana'
        ]
    },
    4: {
        name: 'Profesional Independiente',
        description: 'Especialista con experiencia comprobada en múltiples proyectos.',
        benefits: [
            'Manejar hasta 10 proyectos activos',
            'Publicar hasta 4 servicios',
            '30 solicitudes de trabajo por semana'
        ]
    },
    5: {
        name: 'Profesional Consolidado',
        description: 'Perfil de alto rendimiento y estabilidad en la plataforma.',
        benefits: [
            'Sin límite de proyectos activos',
            'Publicar hasta 5 servicios',
            '50 solicitudes de trabajo por semana',
            'Insignia por alcanzar la mitad del recorrido'
        ]
    },
    6: {
        name: 'Especialista',
        description: 'Reconocimiento avanzado y optimización de márgenes.',
        benefits: [
            'Comisión reducida al 11%',
            '50 solicitudes de trabajo por semana',
            '¡Cuidado! Se desbloquea la pérdida de XP por inactividad',
            'Tip: Mantén actividad regular para no bajar de nivel'
        ]
    },
    7: {
        name: 'Especialista Senior',
        description: 'Referente técnico con prioridad de mercado.',
        benefits: [
            'Comisión reducida al 10%',
            '50 solicitudes de trabajo por semana'
        ]
    },
    8: {
        name: 'Consultor Estratégico',
        description: 'Liderazgo y excelencia en la ejecución de servicios.',
        benefits: [
            'Comisión reducida al 9%',
            '50 solicitudes de trabajo por semana'
        ]
    },
    9: {
        name: 'Socio de Élite',
        description: 'Máximo prestigio y beneficios exclusivos de plataforma.',
        benefits: [
            'Comisión reducida al 8%',
            '50 solicitudes de trabajo por semana'
        ]
    },
    10: {
        name: 'Maestro Cooplance',
        description: 'Máximo rango honorífico. Una leyenda del ecosistema.',
        benefits: [
            'Comisión reducida al 6%',
            '50 solicitudes de trabajo por semana',
            'Estrella destacada en todos tus servicios'
        ]
    }
};

export const CLIENT_BENEFITS = {
    1: {
        name: 'Cliente Iniciador',
        description: 'Bienvenido al ecosistema de gestión de talento.',
        benefits: [
            '1-2 Pedidos activos simultáneos',
            'Acceso básico al buscador'
        ]
    },
    2: {
        name: 'Promotor de Talento',
        description: 'Descubriendo y potenciando el talento independiente.',
        benefits: [
            'Historial y Registro de Freelancers',
            'Puedes publicar hasta 2 pedidos a la vez',
            'Puedes Mantener activos hasta 3 pedidos'
        ]
    },
    3: {
        name: 'Colaborador Activo',
        description: 'Construyendo relaciones sólidas con profesionales.',
        benefits: [
            'Puedes publicar hasta 3 pedidos a la vez',
            'Puedes Mantener activos hasta 5 pedidos'
        ]
    },
    4: {
        name: 'Socio Recurrente',
        description: 'Adquisición constante de servicios de calidad.',
        benefits: [
            'Puedes publicar hasta 4 pedidos a la vez',
            'Puedes Mantener activos hasta 10 pedidos'
        ]
    },
    5: {
        name: 'Impulsor Estratégico',
        description: 'Fomentando el crecimiento profesional a gran escala.',
        benefits: [
            'Puedes publicar hasta 5 pedidos a la vez',
            'Puedes Mantener activos los pedidos que quieras'
        ]
    },
    6: {
        name: 'Inversor de Talento',
        description: 'Socio avanzado con herramientas de gestión premium.',
        benefits: [
            'Puedes dejar en favoritos a los freelancer',
            'Puedes crear tus propios Coops (Equipos de Trabajo)',
            '¡Cuidado! Se desbloquea la pérdida de XP por inactividad'
        ]
    },
    7: {
        name: 'Aliado Regional',
        description: 'Presencia e impacto significativo en la comunidad.',
        benefits: [
            'Recibes un 2% de dto. al contratar freelancers nivel 1-2'
        ]
    },
    8: {
        name: 'Aliado Global',
        description: 'Liderazgo organizacional y contratación de alto nivel.',
        benefits: [
            'Recibes 2% de dto. al contratar freelancers nivel 1-3'
        ]
    },
    9: {
        name: 'Socio de Élite',
        description: 'Estatus preferencial con beneficios máximos.',
        benefits: [
            'Mismos Beneficios con soporte priorizado'
        ]
    },
    10: {
        name: 'Mecenas Cooplance',
        description: 'Máximo estatus institucional y reconocimiento global.',
        benefits: [
            'Pedidos resaltados (1h) y prioritarios',
            'Recibes un descuento del 3% en todas tus compras',
            'Rol de "Comprador Prioritario"'
        ]
    }
};

export const getBenefitsForRole = (role) => {
    if (role === 'freelancer') return FREELANCER_BENEFITS;
    return CLIENT_BENEFITS;
};
