/**
 * Funciones de Seguridad Globales (XSS & Rate Limiting Helpers)
 */

/**
 * stripHTMLTags
 * Elimina completamente cualquier indicio de sintaxis de etiquetas (tags) HTML 
 * para garantizar que el texto que se inyecta en la Base de Datos sea 100% texto plano.
 * Esto previene XSS persistente en caso de que otros clientes (como correos o apps sin escaneo) consuman la BD.
 */
export const sanitizeText = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    // Remueve todo lo que se asemeje a un tag HTML abierto o cerrado
    // e.g., <script>, <b>, <img src="x" />
    return str.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Creador de Throttler
 * Limita la ejecución de una función consecutivamente en un periodo de tiempo
 * para evitar llamadas excesivas provocadas por "spam de clic".
 */
export function createThrottler(limitMs = 1500) {
    let lastRun = 0;
    
    return function canRun() {
        const now = Date.now();
        if (now - lastRun >= limitMs) {
            lastRun = now;
            return true;
        }
        return false;
    };
}
