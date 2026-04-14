/**
 * locationUtils.js
 * Utility to handle location data (Provinces/Cities) for Argentina.
 * Implements Caching via localStorage and Fallback lists to avoid SPOF or API Rate Limits (429).
 */

const CACHE_KEY_PROVINCES = 'cooplance_arg_provinces';
const CACHE_KEY_CITIES_PREFIX = 'cooplance_arg_cities_';

// Hardcoded fallback list (24 jurisdictions of Argentina)
const ARGENTINA_PROVINCES_FALLBACK = [
    "Buenos Aires",
    "Ciudad Autónoma de Buenos Aires",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Córdoba",
    "Corrientes",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
    "Tucumán"
].sort();

/**
 * Fetches all provinces of Argentina.
 * Priority: Cache -> API -> Fallback
 */
export const getArgentinaProvinces = async () => {
    // 1. Try Cache
    const cached = localStorage.getItem(CACHE_KEY_PROVINCES);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Error parsing cached provinces", e);
        }
    }

    // 2. Try API
    try {
        const response = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=nombre&max=100');
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.provincias && Array.isArray(data.provincias)) {
            const names = data.provincias.map(p => p.nombre).sort();
            // Store in cache
            localStorage.setItem(CACHE_KEY_PROVINCES, JSON.stringify(names));
            return names;
        }
    } catch (error) {
        console.warn("Georef API Failure, using Fallback Provinces:", error.message);
    }

    // 3. Last Resort: Fallback
    return ARGENTINA_PROVINCES_FALLBACK;
};

/**
 * Fetches cities for a specific province.
 * Limit of 1000 cities per province for performance.
 */
export const getArgentinaCities = async (provinceName) => {
    if (!provinceName) return [];

    const cacheKey = `${CACHE_KEY_CITIES_PREFIX}${provinceName.replace(/\s/g, '_')}`;
    
    // 1. Try Cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
            console.error("Error parsing cached cities", e);
        }
    }

    // 2. Try API
    try {
        const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinceName)}&campos=nombre,provincia.nombre&max=1000`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        
        if (data && data.localidades && Array.isArray(data.localidades)) {
            const cityNames = data.localidades.map(m => `${m.nombre} (${m.provincia.nombre})`).sort();
            // Store in cache
            localStorage.setItem(cacheKey, JSON.stringify(cityNames));
            return cityNames;
        }
    } catch (error) {
        console.error(`Error fetching cities for ${provinceName}:`, error.message);
    }

    return []; // No cities fallback provided as it varies too much, but we avoid crashing
};
