export const FREELANCER_BENEFITS = {
    1: {
        name: 'Nuevo',
        description: 'Recién ingresado, enfocado en aprender y generar confianza.',
        benefits: [
            '1 Proyecto a la vez',
            'Publicar 1 servicio',
            'Tus clientes reciben doble XP (incentivo de contratación)'
        ]
    },
    2: {
        name: 'Inicial',
        description: 'Ya tienes experiencia básica dentro de Cooplance.',
        benefits: [
            'Manejar hasta 3 proyectos simultáneos',
            'Publicar hasta 2 servicios'
        ]
    },
    3: {
        name: 'Activo',
        description: 'Freelancer constante.',
        benefits: [
            'Manejar hasta 5 proyectos a la vez',
            'Publicar hasta 3 servicios'
        ]
    },
    4: {
        name: 'Consolidado',
        description: 'Freelancer con experiencia comprobada.',
        benefits: [
            'Manejar hasta 10 proyectos activos',
            'Publicar hasta 4 servicios'
        ]
    },
    5: {
        name: 'Profesional',
        description: 'Perfil estable dentro de la plataforma.',
        benefits: [
            'Sin límite de proyectos activos',
            'Publicar hasta 5 servicios',
            'Insignia por alcanzar la mitad del recorrido'
        ]
    },
    6: {
        name: 'Avanzado',
        description: 'Reconocimiento y mejores ganancias.',
        benefits: [
            'Comisión reducida al 11%',
            '¡Cuidado! Se desbloquea la pérdida de XP por inactividad',
            'Tip: Mantén actividad regular para no bajar de nivel'
        ]
    },
    7: {
        name: 'Experto',
        description: 'Un referente en su campo.',
        benefits: [
            'Comisión reducida al 10%'
        ]
    },
    8: {
        name: 'Referente',
        description: 'Liderando el mercado.',
        benefits: [
            'Comisión reducida al 9%'
        ]
    },
    9: {
        name: 'Élite',
        description: 'La cima de la excelencia.',
        benefits: [
            'Comisión reducida al 8%'
        ]
    },
    10: {
        name: 'Legendario',
        description: 'Nivel máximo. Una leyenda de Cooplance.',
        benefits: [
            'Comisión reducida al 6%',
            'Estrella destacada en todos tus servicios'
        ]
    }
};

export const CLIENT_BENEFITS = {
    1: {
        name: 'Nuevo',
        description: 'Bienvenido a la comunidad de talento.',
        benefits: [
            '1-2 Pedidos activos simultáneos',
            'Acceso básico al buscador'
        ]
    },
    2: {
        name: 'Explorador',
        description: 'Descubriendo el potencial del talento freelance.',
        benefits: [
            'Historial y Registro de Freelancers',
            'Puedes publicar hasta 2 pedidos a la vez',
            'Puedes Mantener activos hasta 3 pedidos'
        ]
    },
    3: {
        name: 'Colaborador',
        description: 'Empezando a construir relaciones.',
        benefits: [
            'Puedes publicar hasta 3 pedidos a la vez',
            'Puedes Mantener activos hasta 5 pedidos'
        ]
    },
    4: {
        name: 'Cliente Frecuente',
        description: 'Un socio habitual para nuestros freelancers.',
        benefits: [
            'Puedes publicar hasta 4 pedidos a la vez',
            'Puedes Mantener activos hasta 10 pedidos'
        ]
    },
    5: {
        name: 'Impulsor de Talento',
        description: 'Fomentando el crecimiento profesional.',
        benefits: [
            'Puedes publicar hasta 5 pedidos a la vez',
            'Puedes Mantener activos los pedidos que quieras'
        ]
    },
    6: {
        name: 'Inversor de Talento',
        description: 'Apostando fuerte por la calidad.',
        benefits: [
            'Puedes dejar en favoritos a los freelancer',
            'Puedes crear tus propios Coops (Equipos de Trabajo)',
            '¡Cuidado! Se desbloquea la pérdida de XP por inactividad'
        ]
    },
    7: {
        name: 'Partner Cooplance',
        description: 'Un aliado clave en el ecosistema.',
        benefits: [
            'Recibes un 2% de dto. al contratar freelancers nivel 1-2'
        ]
    },
    8: {
        name: 'Cliente Elite',
        description: 'Gestión de talento a gran escala.',
        benefits: [
            'Recibes 2% de dto. al contratar freelancers nivel 1-3'
        ]
    },
    9: {
        name: 'Aliado Estratégico',
        description: 'Construyendo el futuro del trabajo.',
        benefits: [
            'Mismos Beneficios'
        ]
    },
    10: {
        name: 'Legendario',
        description: 'El máximo estatus para una organización.',
        benefits: [
            'Pedidos resaltados (1h) y prioritarios',
            'Recibes un descuento del 3% en todas tus compras',
            'Rol de "Comprador Prioritario"'
        ]
    }
};

export const getBenefitsForRole = (role) => {
    if (role === 'freelancer') return FREELANCER_BENEFITS;
    return CLIENT_BENEFITS; // Default for buyer/company
};
