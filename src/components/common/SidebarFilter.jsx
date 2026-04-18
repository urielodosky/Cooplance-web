import React, { useState, useEffect, useRef } from 'react';
import { serviceCategories } from '../../features/services/data/categories';
import CustomDropdown from './CustomDropdown';
import { getArgentinaProvinces, getArgentinaCities } from '../../utils/locationUtils';
import '../../styles/components/SidebarFilter.scss';

const SidebarFilter = ({ onFilterChange, filters, variant = 'default' }) => {
    // Ensure we have default values to avoid modifying undefined
    const currentFilters = filters || {
        query: '',
        category: '',
        subcategory: '',
        specialties: [],
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: '',
        country: 'Argentina',
        province: [],
        city: [],
        paymentMethods: [],
        paymentFrequency: [],
        durationMin: '',
        durationMax: '',
        durationUnit: 'months',
        commissionMin: '',
        commissionMax: '',
        memberCountMin: '',
        memberCountMax: ''
    };
    
    const [isExpanded, setIsExpanded] = useState(false);

    // Local state for query
    const [localQuery, setLocalQuery] = useState(currentFilters.query);
    
    // Sync local query if parent changes it
    useEffect(() => {
        setLocalQuery(currentFilters.query);
    }, [currentFilters.query]);

    // Location API State
    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    // Fetch Provinces on Mount (Fixed to Argentina)
    useEffect(() => {
        const fetchProvinces = async () => {
            setIsLoadingLoc(true);
            const provinces = await getArgentinaProvinces();
            setArgProvinces(provinces);
            setIsLoadingLoc(false);
        };
        fetchProvinces();
    }, []);

    // Fetch Cities based on selected provinces
    useEffect(() => {
        const selectedProvinces = currentFilters.province || [];
        if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
            const fetchCities = async () => {
                setIsLoadingLoc(true);
                let allCities = [];
                for (const prov of selectedProvinces) {
                    const cities = await getArgentinaCities(prov);
                    allCities = [...allCities, ...cities];
                }
                const names = [...new Set(allCities)].sort();
                setArgCities(names);
                setIsLoadingLoc(false);
            };
            fetchCities();
        } else {
            setArgCities([]);
        }
    }, [currentFilters.province]);

    const categories = Object.keys(serviceCategories || {}).sort();

    const handleChange = (name, value) => {
        let newValue = value;

        // If "Comisión (Por Venta)" is selected, we just pass the value 'commission'
        // and handle the expansion in searchUtils for better UI cleanliness

        const newFilters = { ...currentFilters, [name]: newValue };
        if (name === 'category') {
            newFilters.subcategory = '';
            newFilters.specialties = [];
        }
        if (name === 'subcategory') {
            newFilters.specialties = [];
        }
        onFilterChange(newFilters);
    };

    const handleSearchTrigger = () => {
        onFilterChange({ ...currentFilters, query: localQuery });
    };

    const handleCheckbox = (group, value) => {
        const current = currentFilters[group] || [];
        let newValues;
        if (current.includes(value)) {
            newValues = current.filter(v => v !== value);
        } else {
            newValues = [...current, value];
        }
        handleChange(group, newValues);
    };

    const handleClear = () => {
        const reset = {
            query: '',
            category: '',
            subcategory: '',
            specialties: [],
            priceMin: '',
            priceMax: '',
            rating: 0,
            workMode: [],
            level: '',
            location: '',
            country: 'Argentina',
            province: [],
            city: [],
            paymentMethods: [],
            paymentFrequency: [],
            durationMin: '',
            durationMax: '',
            durationUnit: 'months',
            commissionMin: '',
            commissionMax: '',
            memberCountMin: '',
            memberCountMax: ''
        };
        onFilterChange(reset);
    };

    const handleStarClick = (e, starIndex) => {
        const { left, width } = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const isHalf = mouseX < width / 2;
        let newRating = starIndex;
        if (isHalf) newRating -= 0.5;
        handleChange('rating', newRating);
    };

    const renderStars = () => {
        return [1, 2, 3, 4, 5].map(star => {
            const rating = currentFilters.rating;
            let className = 'star';
            if (rating >= star) className += ' full';
            else if (rating === star - 0.5) className += ' half';
            return (
                <span
                    key={star}
                    className={className}
                    onClick={(e) => handleStarClick(e, star)}
                >
                    ★
                </span>
            );
        });
    };

    // Payment method options
    const paymentOptions = [
        { label: 'PayPal', value: 'paypal' },
        { label: 'Mercado Pago', value: 'mercadopago' },
        { label: 'Binance', value: 'binance' },
        { label: 'Tarjeta', value: 'card' }
    ];

    // Payment frequency options
    const frequencyOptions = [
        { label: 'Único', value: 'unique' },
        { label: 'Diario', value: 'daily' },
        { label: 'Semanal', value: 'weekly' },
        { label: 'Quincenal', value: 'biweekly' },
        { label: 'Mensual', value: 'monthly' },
        { label: 'Comisión (Por Venta)', value: 'commission' }
    ];

    const durationUnits = [
        { label: 'Días', value: 'days' },
        { label: 'Semanas', value: 'weeks' },
        { label: 'Meses', value: 'months' },
        { label: 'Años', value: 'years' }
    ];

    return (
        <div className="glass sidebar-filter premium-compact">
            {/* 1. Search Row */}
            <div className="filter-search-row">
                <div className="search-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o palabra clave..."
                        className="search-input"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                    />
                </div>
                <div className="search-actions">
                    <button 
                        className={`btn-toggle-filters ${isExpanded ? 'active' : ''}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="4" y1="21" x2="4" y2="14" />
                            <line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" />
                            <line x1="20" y1="12" x2="20" y2="3" />
                            <line x1="1" y1="14" x2="7" y2="14" />
                            <line x1="9" y1="8" x2="15" y2="8" />
                            <line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                        <span>Filtros</span>
                    </button>
                    {!isExpanded && (
                        <button onClick={handleSearchTrigger} className="btn-search-violet-main">
                            Buscar
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="expanded-filters-container animate-slide-down">

            {/* 2. Main Filter Grid (Row 1) */}
            <div className={`filter-options-grid ${variant === 'company' ? 'is-company' : variant === 'team' ? 'is-team' : ''}`}>
                {/* Category */}
                <div className="filter-item">
                    <label>CATEGORÍA</label>
                    <CustomDropdown
                        options={categories.map(c => ({ label: c, value: c }))}
                        value={currentFilters.category}
                        onChange={(val) => handleChange('category', val)}
                        placeholder="Todas"
                    />
                </div>

                {/* Modality Boxes (Compact) */}
                <div className="filter-item">
                    <label>MODALIDAD</label>
                    <div className="compact-box-selectors">
                        <div 
                            className={`selection-box-sm remote ${currentFilters.workMode.includes('remote') ? 'active' : ''}`}
                            onClick={() => handleCheckbox('workMode', 'remote')}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                                <polyline points="10 9 12 11 14 9"></polyline>
                            </svg>
                            <span>Remoto</span>
                        </div>
                        <div 
                            className={`selection-box-sm presential ${currentFilters.workMode.includes('presential') ? 'active' : ''}`}
                            onClick={() => handleCheckbox('workMode', 'presential')}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>Presencial</span>
                        </div>
                    </div>
                </div>

                {/* Frequency for Companies & Teams */}
                {(variant === 'company' || variant === 'team') && (
                    <div className="filter-item">
                        <label>FRECUENCIA</label>
                        <CustomDropdown
                            options={frequencyOptions}
                            value={currentFilters.paymentFrequency}
                            onChange={(val) => handleChange('paymentFrequency', val)}
                            placeholder="Elegir..."
                            multiple={true}
                        />
                    </div>
                )}


                <div className="filter-item">
                    {(variant === 'company' || variant === 'team') && currentFilters.paymentFrequency?.includes('commission') ? (
                        <>
                            <label>% COMISIÓN</label>
                            <div className="compact-range">
                                <input
                                    type="number"
                                    placeholder="Mín %"
                                    value={currentFilters.commissionMin}
                                    onChange={(e) => handleChange('commissionMin', e.target.value)}
                                />
                                <span className="sep">-</span>
                                <input
                                    type="number"
                                    placeholder="Máx %"
                                    value={currentFilters.commissionMax}
                                    onChange={(e) => handleChange('commissionMax', e.target.value)}
                                />
                                <span className="unit-label">%</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <label>{(variant === 'company' || variant === 'team') ? 'PRESUPUESTO EST.' : 'PRESUPUESTO ($)'}</label>
                            <div className="compact-range">
                                <input
                                    type="number"
                                    placeholder="Mín"
                                    value={currentFilters.priceMin}
                                    onChange={(e) => handleChange('priceMin', e.target.value)}
                                />
                                <span className="sep">-</span>
                                <input
                                    type="number"
                                    placeholder="Máx"
                                    value={currentFilters.priceMax}
                                    onChange={(e) => handleChange('priceMax', e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Payment Methods Dropdown (only for default variant in first row) */}
                {variant === 'default' && (
                    <div className="filter-item">
                        <label>MÉTODOS DE PAGO</label>
                        <CustomDropdown
                            options={paymentOptions}
                            value={currentFilters.paymentMethods}
                            onChange={(val) => handleChange('paymentMethods', val)}
                            placeholder="Elegir..."
                            multiple={true}
                        />
                    </div>
                )}
            </div>

            {/* 2.5 Row 2 for Companies & Teams */}
            {(variant === 'company' || variant === 'team') && (
                <div className={`filter-options-grid is-${variant} secondary-row`}>
                    {/* Team Specific: Member Count Range (Moved here) */}
                    {variant === 'team' && (
                        <div className="filter-item miembros-col">
                            <label>MIEMBROS</label>
                            <div className="compact-range">
                                <input
                                    type="number"
                                    placeholder="Mín"
                                    value={currentFilters.memberCountMin}
                                    onChange={(e) => handleChange('memberCountMin', e.target.value)}
                                />
                                <span className="sep">-</span>
                                <input
                                    type="number"
                                    placeholder="Máx"
                                    value={currentFilters.memberCountMax}
                                    onChange={(e) => handleChange('memberCountMax', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Shared: Duration */}
                    <div className="filter-item duration-col">
                        <label>DURACIÓN ESTIMADA</label>
                        <div className="duration-picker-group">
                            <div className="compact-range">
                                <input
                                    type="number"
                                    placeholder="De"
                                    value={currentFilters.durationMin}
                                    onChange={(e) => handleChange('durationMin', e.target.value)}
                                />
                                <span className="sep">-</span>
                                <input
                                    type="number"
                                    placeholder="A"
                                    value={currentFilters.durationMax}
                                    onChange={(e) => handleChange('durationMax', e.target.value)}
                                />
                            </div>
                            <div className="unit-selector">
                                <CustomDropdown
                                    options={durationUnits}
                                    value={currentFilters.durationUnit}
                                    onChange={(val) => handleChange('durationUnit', val)}
                                    placeholder="Unidad"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shared: Settlement Frequency for Commission */}
                    {currentFilters.paymentFrequency?.includes('commission') && (
                        <div className="filter-item commission-freq-col animate-in">
                            <label>LIQUIDACIÓN DE %</label>
                            <CustomDropdown
                                options={frequencyOptions.filter(f => f.value !== 'commission')}
                                value={currentFilters.commissionFrequency}
                                onChange={(val) => handleChange('commissionFrequency', val)}
                                placeholder="Frecuencia..."
                            />
                        </div>
                    )}

                    {/* Payment Methods */}
                    <div className="filter-item payment-methods-col">
                        <label>MÉTODOS DE PAGO</label>
                        <CustomDropdown
                            options={paymentOptions}
                            value={currentFilters.paymentMethods}
                            onChange={(val) => handleChange('paymentMethods', val)}
                            placeholder="Elegir..."
                            multiple={true}
                        />
                    </div>
                </div>
            )}

            {/* 3. Logical Group (Row 2): Subcategory + Specialties */}
            {currentFilters.category && (
                <div className="subcat-specialties-row">
                    <div className="filter-item subcat-col">
                        <label>SUBCATEGORÍA</label>
                        <CustomDropdown
                            options={(() => {
                                const catData = serviceCategories?.[currentFilters.category];
                                if (catData && typeof catData === 'object' && !Array.isArray(catData)) {
                                    return Object.keys(catData).map(s => ({ label: s, value: s }));
                                }
                                return [];
                            })()}
                            value={currentFilters.subcategory || ''}
                            onChange={(val) => handleChange('subcategory', val)}
                            placeholder="Todas"
                        />
                    </div>
                    
                    <div className="filter-item specialties-col">
                        <label>ESPECIALIDADES</label>
                        <div className="compact-specs-flex">
                            {(() => {
                                if (!currentFilters.category || !currentFilters.subcategory) return <span className="helper-text">Elige subcategoría para ver especialidades</span>;
                                
                                const specs = serviceCategories?.[currentFilters.category]?.[currentFilters.subcategory];
                                if (!Array.isArray(specs)) return null;
                                
                                return specs.map(spec => {
                                    const isSelected = (currentFilters.specialties || []).includes(spec);
                                    return (
                                        <button
                                            key={spec}
                                            className={`spec-pill ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                const current = currentFilters.specialties || [];
                                                const newSpecs = current.includes(spec) 
                                                    ? current.filter(s => s !== spec) 
                                                    : [...current, spec];
                                                handleChange('specialties', newSpecs);
                                            }}
                                        >
                                            {spec}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Location Row (Georef) */}
            {currentFilters.workMode.includes('presential') && (
                <div className="location-expansion-row animate-in">
                    <div className="expansion-grid">
                        <div className="filter-item">
                            <label>PROVINCIAS DE ARGENTINA (MÁX 3)</label>
                            <CustomDropdown
                                options={argProvinces.map(p => ({ label: p, value: p }))}
                                value={currentFilters.province}
                                onChange={(val) => handleChange('province', val)}
                                placeholder={`Seleccionar (${currentFilters.province?.length || 0}/3)`}
                                searchable={true}
                                multiple={true}
                                maxSelections={3}
                                disabled={isLoadingLoc && argProvinces.length === 0}
                            />
                        </div>
                        <div className="filter-item">
                            <label>CIUDADES (MÁX 5)</label>
                            <CustomDropdown
                                options={argCities.map(c => ({ label: c, value: c }))}
                                value={currentFilters.city}
                                onChange={(val) => handleChange('city', val)}
                                placeholder={isLoadingLoc ? "Cargando..." : `Seleccionar (${currentFilters.city?.length || 0}/5)`}
                                searchable={true}
                                multiple={true}
                                maxSelections={5}
                                disabled={!currentFilters.province || currentFilters.province.length === 0 || isLoadingLoc}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Footer Actions */}
            <div className="filter-footer-row">
                <div className="rating-horizontal">
                    <label>RATING</label>
                    <div className="stars-mini">{renderStars()}</div>
                </div>
                <div className="action-buttons">
                    <button onClick={handleClear} className="btn-clear-flat">Limpiar</button>
                    <button onClick={handleSearchTrigger} className="btn-search-violet">Buscar</button>
                </div>
            </div>
                </div>
            )}
        </div>
    );
};

export default SidebarFilter;
