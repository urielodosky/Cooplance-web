/**
 * Search and Filter Utilities for Cooplance
 * Implements "Buscador Inteligente" with priority logic.
 */

/**
 * Calculate match score for an item based on query
 * Priority:
 * 1. Exact Match (Title/Tags) -> 100
 * 2. Partial Match (Title/Tags) -> 50
 * 3. Description Match -> 20
 * 4. Semantic Match (simulated) -> 10
 */
const getMatchScore = (item, query, semanticMap = {}) => {
    if (!query) return 100;

    const q = query.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const subcategoriesRaw = item.subcategories || item.subcategory || [];
    const subcategories = (Array.isArray(subcategoriesRaw) ? subcategoriesRaw : [subcategoriesRaw]).map(s => String(s).toLowerCase());
    const description = (item.description || '').toLowerCase();
    const tagsRaw = item.tags || [];
    const tags = (Array.isArray(tagsRaw) ? tagsRaw : [tagsRaw]).map(t => String(t).toLowerCase());

    // 1. Exact Title Match (Highest Priority)
    if (title === q) return 150;

    // 2. Query contained in Title (High Priority)
    if (title.includes(q)) return 100;

    // 3. Category/Subcategory Match (Significant Priority)
    if (category.includes(q) || subcategories.some(s => s.includes(q))) return 80;

    // 4. Tags Match
    if (tags.some(t => t === q)) return 70; // Exact tag
    if (tags.some(t => t.includes(q))) return 50; // Partial tag

    // 5. Description Match
    if (description.includes(q)) return 20;

    // 6. Semantic/Related Match (Bonus)
    const defaultSemantics = {
        'code': ['programacion', 'desarrollo', 'web', 'software'],
        'diseño': ['logo', 'branding', 'arte', 'ui', 'ux'],
        'texto': ['redaccion', 'traduccion', 'copywriting'],
        'marketing': ['seo', 'ads', 'redes sociales']
    };
    const combinedMap = { ...defaultSemantics, ...semanticMap };

    for (const [key, related] of Object.entries(combinedMap)) {
        if (q.includes(key) || related.includes(q)) {
            if (
                title.includes(key) ||
                tags.some(t => t.includes(key)) ||
                related.some(r => title.includes(r) || tags.some(t => t.includes(r)))
            ) {
                return 10;
            }
        }
    }

    return 0;
};

export const searchAndFilterItems = (items, filters = {}) => {
    let result = [...items];
    const {
        query,
        category,
        priceMin,
        priceMax,
        rating,
        workMode, // 'remote', 'presential'
        level,
        language,
        location
    } = filters;

    // 1. Filter by Criteria
    result = result.filter(item => {
        // Category
        if (category && item.category !== category) return false;

        // Subcategory Match (New String Match)
        if (filters.subcategory && item.subcategory !== filters.subcategory) {
            // Check if item has a subcategory string mismatch, but ONLY if we are in the new format 
            // where item.subcategory is a string. If it's old data, let it pass and be filtered by specialties
            if (typeof item.subcategory === 'string' && item.subcategory !== filters.subcategory) return false;
        }

        // Specialties Match
        if (filters.specialties && filters.specialties.length > 0) {
            const filterSpecs = filters.specialties;

            // Normalize item specialties/subcategories to array to support old data
            const itemSpecsRaw = item.specialties || item.subcategories || item.subcategory || [];
            const itemSpecsArray = Array.isArray(itemSpecsRaw) ? itemSpecsRaw : [itemSpecsRaw];

            // Filter down: item must have basically ANY of the selected specialties to show up
            const hasMatch = filterSpecs.some(spec => itemSpecsArray.includes(spec));
            if (!hasMatch) return false;
        }

        // Price
        if (priceMin && item.price < Number(priceMin)) return false;
        if (priceMax && item.price > Number(priceMax)) return false;

        // Rating (if item has rating)
        if (rating && (item.rating || 0) < Number(rating)) return false;

        // Work Mode (Array assumption or String)
        if (workMode && workMode.length > 0) {
            // If item.workMode is array (services)
            if (Array.isArray(item.workMode)) {
                if (!item.workMode.some(m => workMode.includes(m))) return false;
            }
            // If it's string (some legacy data)
            else if (typeof item.workMode === 'string') {
                if (!workMode.includes(item.workMode)) return false;
            }
        }

        // Experience Level (New vs Experienced)
        if (filters.experience && filters.experience.length > 0) {
            const level = item.level || item.clientLevel || 1;
            const showsNew = filters.experience.includes('new');
            const showsExp = filters.experience.includes('experienced');

            if (showsNew && showsExp) {
                // Show all
            } else if (showsNew) {
                if (level > 2) return false;
            } else if (showsExp) {
                if (level <= 2) return false;
            }
        }

        // Level (User level - Numeric Min Filter)
        if (level && (item.level || 1) < Number(level)) return false;

        // Language
        if (language && item.language !== language) return false;

        // Location Filters (Strict for presential)
        if (workMode?.includes('presential')) {
            const itemLoc = (item.location || '').toLowerCase();
            const itemCountry = (item.country || '').toLowerCase();

            // Country Filter
            if (filters.country) {
                const filterCountry = filters.country.toLowerCase();
                // Check explicit country field OR check if location string contains it
                if (!itemCountry.includes(filterCountry) && !itemLoc.includes(filterCountry)) return false;
            }

            // Province Filter (Support for Array from multi-select)
            if (filters.province && (Array.isArray(filters.province) ? filters.province.length > 0 : filters.province)) {
                const provinces = Array.isArray(filters.province) ? filters.province : [filters.province];
                const hasProvinceMatch = provinces.some(p => itemLoc.includes(p.toLowerCase()));
                if (!hasProvinceMatch) return false;
            }

            // City Filter (Support for Array)
            const cityFilter = filters.city || filters.location;
            if (cityFilter && (Array.isArray(cityFilter) ? cityFilter.length > 0 : cityFilter)) {
                const cities = Array.isArray(cityFilter) ? cityFilter : [cityFilter];
                const hasCityMatch = cities.some(c => itemLoc.includes(c.toLowerCase()));
                if (!hasCityMatch) return false;
            }
        }

        // Payment Methods Filter
        if (filters.paymentMethods && filters.paymentMethods.length > 0) {
            // Check if item has paymentMethods (enriched in Explore.jsx)
            const itemMethods = item.paymentMethods || {};

            // If card is selected, we might assume platform always supports it, 
            // BUT user request implies filtering by what freelancer accepts/allows.
            // Requirement: "que se puedan elegir varias" and "metodo de pago".
            // Logic: Show if freelancer accepts AT LEAST ONE of the selected methods.

            const selected = filters.paymentMethods;

            // Special case: 'card' is platform default, usually always true unless restricted?
            // In PaymentModal we saw: Card is always shown.
            // So if user filters by 'card', everything should probably show?
            // Let's assume 'card' is always valid for all services via platform.
            if (selected.includes('card')) return true;

            // For others (paypal, mercadopago, binance), check freelancer prefs
            const matches = selected.some(method => {
                if (method === 'card') return true;
                return itemMethods[method] === true;
            });

            if (!matches) return false;
        }

        // Payment Frequency Filter
        if (filters.paymentFrequency && filters.paymentFrequency.length > 0) {
            const selectedFreqs = [...filters.paymentFrequency];
            // Internal mapping: commission filter also matches per_sale items
            if (selectedFreqs.includes('commission')) selectedFreqs.push('per_sale');

            const itemFreq = item.paymentFrequency || item.payment_frequency;
            
            if (itemFreq) {
                // If it's single selection (string)
                if (typeof itemFreq === 'string') {
                    if (!selectedFreqs.includes(itemFreq)) return false;
                }
                // If it's an array (rare but possible in some data structures)
                else if (Array.isArray(itemFreq)) {
                    if (!itemFreq.some(f => selectedFreqs.includes(f))) return false;
                }
            } else {
                // If item has no frequency but we are filtering for specific ones, 
                // we should probably hide it unless 'unique' is selected and it's basically a fixed project.
                // However, robustness suggests being lenient if no data exists.
                // FOR NOW: If no frequency data, only pass if filtering by 'unique' or no specific freq is selected.
                if (!selectedFreqs.includes('unique')) return false;
            }
        }

        return true;
    });

    // Calculate Filter Match Score (for Specialties/Subcategories) to rank "more matching" items higher
    if (filters.specialties && filters.specialties.length > 0) {
        const filterSpecs = filters.specialties;
        result = result.map(item => {
            const itemSpecsRaw = item.specialties || item.subcategories || item.subcategory || [];
            const itemSpecsArray = Array.isArray(itemSpecsRaw) ? itemSpecsRaw : [itemSpecsRaw];

            // Count how many filter specialties are present in the item
            const matchCount = filterSpecs.filter(spec => itemSpecsArray.includes(spec)).length;
            return { ...item, _filterScore: matchCount };
        });
    }

    if (query) {
        result = result.map(item => ({
            ...item,
            _score: getMatchScore(item, query) + ((item._filterScore || 0) * 10) // Boost score by filter matches
        }))
            .filter(item => item._score > 0) // Remove non-matches
            .sort((a, b) => b._score - a._score);
    } else {
        // If no query, sort by Filter Score first (Best Match), then Newest
        result.sort((a, b) => {
            const scoreDiff = (b._filterScore || 0) - (a._filterScore || 0);
            if (scoreDiff !== 0) return scoreDiff;
            return b.id - a.id;
        });
    }

    return result;
};
