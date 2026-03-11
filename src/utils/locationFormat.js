export const formatLocation = (locationString) => {
    if (!locationString) return { display: '', tooltip: [] };

    // Split by comma and clean up whitespace
    const parts = locationString.split(',').map(p => p.trim()).filter(Boolean);

    // List of common countries to ignore if we already have detailed locations
    const ignoreCountries = ['Argentina', 'Colombia', 'Perú', 'México', 'Chile', 'Uruguay', 'España'];

    const provincesMap = new Map();
    const unparsedLocations = [];

    parts.forEach(part => {
        // Match pattern "City (Province)"
        const match = part.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            const city = match[1].trim();
            const province = match[2].trim();
            if (!provincesMap.has(province)) {
                provincesMap.set(province, new Set());
            }
            provincesMap.get(province).add(city);
        } else {
            // It's a standalone location.
            // Only add to unparsed if it's NOT already functioning as a province header,
            // and it's NOT a country being ignored.
            const isAlreadyAProvince = Array.from(provincesMap.keys()).some(
                prov => prov.toLowerCase() === part.toLowerCase()
            );

            if (!isAlreadyAProvince) {
                 if (!ignoreCountries.includes(part) || parts.length === 1) {
                    unparsedLocations.push(part);
                 }
            }
        }
    });

    // Final clean-up: if during parsing an element was pushed to unparsed,
    // but a LATER element established it as a province, remove it from unparsed.
    const finalUnparsed = unparsedLocations.filter(loc => 
        !provincesMap.has(loc)
    );

    const parsedProvinces = Array.from(provincesMap.keys());
    const allProvincesAndStandalone = [...parsedProvinces, ...finalUnparsed];
    const uniqueLocations = [...new Set(allProvincesAndStandalone)];

    // Build the tooltip (structured by province for the hover view)
    const tooltipGroups = [];
    provincesMap.forEach((cities, prov) => {
        tooltipGroups.push({ province: prov, cities: Array.from(cities) });
    });
    if (finalUnparsed.length > 0) {
        tooltipGroups.push({ province: 'Otros', cities: finalUnparsed });
    }

    let display = '';

    // If completely unparsed or empty, return as is
    if (provincesMap.size === 0) {
        return { display: locationString, tooltip: [] };
    }

    // Logic: 1 unique province -> check cities
    if (uniqueLocations.length === 1 && provincesMap.size === 1) {
        const provName = uniqueLocations[0];
        const cityCount = provincesMap.get(provName).size;
        
        if (cityCount > 1) {
            display = `${provName}, +${cityCount} ciudades`;
        } else {
            // Only 1 city in 1 province
            display = `${Array.from(provincesMap.get(provName))[0]} (${provName})`;
        }
    } else {
        // Multiple provinces or mixed locations
        const limit = 3;
        if (uniqueLocations.length <= limit) {
            display = uniqueLocations.join(', ');
        } else {
            display = uniqueLocations.slice(0, limit).join(', ') + `, +${uniqueLocations.length - limit} más`;
        }
    }

    return { display, tooltip: tooltipGroups };
};

export const formatLocationDetail = (locationString) => {
    if (!locationString) return '';

    const parts = locationString.split(',').map(p => p.trim()).filter(Boolean);
    const ignoreCountries = ['Argentina', 'Colombia', 'Perú', 'México', 'Chile', 'Uruguay', 'España'];

    const provincesMap = new Map();
    const unparsedLocations = [];

    parts.forEach(part => {
        const match = part.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            const city = match[1].trim();
            const province = match[2].trim();
            if (!provincesMap.has(province)) {
                provincesMap.set(province, new Set());
            }
            provincesMap.get(province).add(city);
        } else {
            const isAlreadyAProvince = Array.from(provincesMap.keys()).some(
                prov => prov.toLowerCase() === part.toLowerCase()
            );

            if (!isAlreadyAProvince) {
                if (!ignoreCountries.includes(part) || parts.length === 1) {
                    unparsedLocations.push(part);
                }
            }
        }
    });

    // Final clean-up check
    const finalUnparsed = unparsedLocations.filter(loc => 
        !provincesMap.has(loc)
    );

    if (provincesMap.size === 0) {
        return locationString;
    }

    const outputParts = [];

    provincesMap.forEach((cities, prov) => {
        outputParts.push(`${prov}: ${Array.from(cities).join(', ')}`);
    });

    if (finalUnparsed.length > 0) {
        outputParts.push(...finalUnparsed);
    }

    // Return as array so UI components can map it to multiple lines
    return outputParts;
};
