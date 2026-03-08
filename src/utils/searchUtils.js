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
    const category = (item.category || '').toLowerCase();
    const subcategories = (item.subcategories || []).map(s => s.toLowerCase());
    const description = (item.description || '').toLowerCase();
    const tags = (item.tags || []).map(t => t.toLowerCase());

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

        // Subcategory (New)
        if (filters.subcategory && filters.subcategory.length > 0) {
            const filterSubs = Array.isArray(filters.subcategory) ? filters.subcategory : [filters.subcategory];

            // Normalize item subcategories to array
            // Note: ProjectCreateForm saves as 'subcategories' (plural), but searchUtils used 'subcategory'.
            // I should check what ProjectCreateForm saves. 
            // Step 632: `subcategories: []`.
            // ExploreClients maps storedProjects.
            // Wait, does ExploreClients map 'subcategories' to 'subcategory'?
            // Step 714: `const allProjects = storedProjects.reverse().map(p => ({ ...p, tags: ... }))`.
            // It just spreads `...p`. So the key is `subcategories`.
            // But searchUtils checks `item.subcategory`. 
            // I MUST CHECK BOTH or FIX MAPPING.

            const itemSubs = Array.isArray(item.subcategories)
                ? item.subcategories
                : (Array.isArray(item.subcategory) ? item.subcategory : (item.subcategory ? [item.subcategory] : []));

            // Check intersection: If ANY filter subcategory matches ANY item subcategory, return true (or ALL? UI implies filtering down. Usually OR within same facet).
            // SidebarFilter allows multiple selection. "SEO" OR "SEM".
            const hasMatch = filterSubs.some(sub => itemSubs.includes(sub));
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

            // Province Filter (Best effort string match on location string)
            if (filters.province) {
                const filterProvince = filters.province.toLowerCase();
                if (!itemLoc.includes(filterProvince)) return false;
            }

            // City Filter (Best effort string match)
            // Fallback to legacy 'location' filter variable if 'city' is not used but present
            const filterCity = (filters.city || filters.location || '').toLowerCase();
            if (filterCity) {
                if (!itemLoc.includes(filterCity)) return false;
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

        return true;
    });

    // 2. Score and Sort by Relevance
    // Calculate Filter Match Score (for Subcategories) to rank "more matching" items higher
    if (filters.subcategory && filters.subcategory.length > 0) {
        const filterSubs = Array.isArray(filters.subcategory) ? filters.subcategory : [filters.subcategory];
        result = result.map(item => {
            const itemSubs = Array.isArray(item.subcategories)
                ? item.subcategories
                : (Array.isArray(item.subcategory) ? item.subcategory : (item.subcategory ? [item.subcategory] : []));

            // Count how many filter subcategories are present in the item
            const matchCount = filterSubs.filter(sub => itemSubs.includes(sub)).length;
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
