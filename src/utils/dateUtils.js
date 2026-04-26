/**
 * Formats a date to a relative string like "hace 2 días" or "hace 1 hora".
 */
export const formatRelativeDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'hace un momento';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `hace ${diffInYears} ${diffInYears === 1 ? 'año' : 'años'}`;
};

export const formatFullDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};
