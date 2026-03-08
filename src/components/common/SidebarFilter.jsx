import React from 'react';
import { serviceCategories } from '../../features/services/data/categories';
import CustomDropdown from './CustomDropdown';
import '../../styles/components/SidebarFilter.scss';

const SidebarFilter = ({ onFilterChange, filters, variant = 'default' }) => {

    // Ensure we have default values to avoid modifying undefined
    const currentFilters = filters || {
        query: '',
        category: '',
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: '',
        paymentFrequency: '',
        durationMin: '',
        durationMax: '',
        durationMin: '',
        durationMax: '',
        durationUnit: 'months',
        commissionMin: '',
        commissionMax: ''
    };

    // Local state for query to allow "Enter" or "Button" triggering
    const [localQuery, setLocalQuery] = React.useState(currentFilters.query);

    // Sync local query if parent changes it (e.g. clear filters)
    React.useEffect(() => {
        setLocalQuery(currentFilters.query);
    }, [currentFilters.query]);

    // Payment Frequency Dropdown State
    const [isPaymentMenuOpen, setIsPaymentMenuOpen] = React.useState(false);
    const paymentMenuRef = React.useRef(null);

    // Payment Methods Dropdown State (New)
    const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = React.useState(false);
    const paymentMethodsRef = React.useRef(null);

    // Close payment menu on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (paymentMenuRef.current && !paymentMenuRef.current.contains(event.target)) {
                setIsPaymentMenuOpen(false);
            }
            if (paymentMethodsRef.current && !paymentMethodsRef.current.contains(event.target)) {
                setIsPaymentMethodsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to get display text for payment frequency
    const getPaymentFrequencyLabel = () => {
        const selected = currentFilters.paymentFrequency || [];
        if (!selected || selected.length === 0) return 'Cualquiera';

        const labels = {
            'unique': 'Único',
            'daily': 'Diario',
            'weekly': 'Semanal',
            'biweekly': 'Quincenal',
            'monthly': 'Mensual',
            'commission': 'Comisión'
        };

        if (Array.isArray(selected)) {
            if (selected.length === 6) return 'Todas';
            if (selected.length === 0) return 'Cualquiera';
            return selected.map(k => labels[k]).join(', ');
        }
        return labels[selected] || 'Cualquiera';
    };

    const categories = Object.keys(serviceCategories || {}).sort();

    const handleChange = (name, value) => {
        const newFilters = { ...currentFilters, [name]: value };
        // If category changes, reset subcategory
        if (name === 'category') {
            newFilters.subcategory = [];
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
            subcategory: [],
            priceMin: '',
            priceMax: '',
            rating: 0,
            workMode: [],
            level: '',
            location: '',
            country: '',
            province: '',
            city: '',
            paymentFrequency: '',
            durationMin: '',
            durationMax: '',
            durationMin: '',
            durationMax: '',
            durationUnit: 'months',
            commissionMin: '',
            commissionMax: ''
        };
        onFilterChange(reset);
    };



    const handleStarHover = (e, starIndex) => {
        // Visual feedback only
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

            if (rating >= star) {
                className += ' full';
            } else if (rating === star - 0.5) {
                className += ' half';
            }

            return (
                <span
                    key={star}
                    className={className}
                    onClick={(e) => handleStarClick(e, star)}
                    onMouseMove={(e) => handleStarHover(e, star)}
                    title={`${star - 0.5} o ${star} estrellas`}
                >
                    ★
                </span>
            );
        });
    };

    return (
        <div className="glass sidebar-filter">
            {/* Top Row: Search - Made more compact */}
            <div className="filter-search-row">
                <input
                    type="text"
                    placeholder={variant === 'company' ? "Buscar empresa..." : "Buscar... (ej. Logo, React)"}
                    className="search-input"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                />
            </div>

            {/* Middle Row: Filter Options */}
            <div className="filter-options-row">
                <div className="filter-section">
                    <h3>Categoría</h3>
                    <CustomDropdown
                        options={categories.map(c => ({ label: c, value: c }))}
                        value={currentFilters.category}
                        onChange={(val) => handleChange('category', val)}
                        placeholder="Todas"
                    />

                </div>

                {variant === 'default' && (
                    <div className="filter-section">
                        <h3>Precio</h3>
                        <div className="range-inputs">
                            <input
                                type="number"
                                placeholder="Mín"
                                className="range-input"
                                value={currentFilters.priceMin}
                                onChange={(e) => handleChange('priceMin', e.target.value)}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                placeholder="Máx"
                                className="range-input"
                                value={currentFilters.priceMax}
                                onChange={(e) => handleChange('priceMax', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="filter-section" style={{ flex: 1.5 }}>
                    <h3>Modalidad / Ubicación</h3>
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={currentFilters.workMode.includes('remote')}
                                onChange={() => handleCheckbox('workMode', 'remote')}
                            />
                            Remoto
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={currentFilters.workMode.includes('presential')}
                                onChange={() => handleCheckbox('workMode', 'presential')}
                            />
                            Presencial
                        </label>
                    </div>
                    {currentFilters.workMode.includes('presential') && (
                        <div className="location-inputs" style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                            width: '100%',
                            animation: 'fadeIn 0.2s ease'
                        }}>
                            <input
                                type="text"
                                placeholder="País"
                                className="search-input"
                                style={{ padding: '0.3rem', fontSize: '0.8rem', flex: 1 }}
                                value={currentFilters.country || ''}
                                onChange={(e) => handleChange('country', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Provincia"
                                className="search-input"
                                style={{ padding: '0.3rem', fontSize: '0.8rem', flex: 1 }}
                                value={currentFilters.province || ''}
                                onChange={(e) => handleChange('province', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Ciudad"
                                className="search-input"
                                style={{ padding: '0.3rem', fontSize: '0.8rem', flex: 1 }}
                                value={currentFilters.city || ''}
                                onChange={(e) => handleChange('city', e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Payment Method Filter (New) */}
                {/* Payment Method Filter (New Dropdown) */}
                <div className="filter-section">
                    <h3>Métodos de Pago</h3>

                    {/* Reusing custom dropdown logic for multi-select */}
                    <div className="custom-dropdown-container">
                        <div
                            className={`custom-dropdown-wrapper ${isPaymentMethodsOpen ? 'open' : ''}`}
                            ref={paymentMethodsRef}
                        >
                            <div
                                className="dropdown-selected"
                                onClick={() => setIsPaymentMethodsOpen(!isPaymentMethodsOpen)}
                                style={{ justifyContent: 'space-between' }}
                            >
                                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {(currentFilters.paymentMethods && currentFilters.paymentMethods.length > 0)
                                        ? `${currentFilters.paymentMethods.length} seleccionado(s)`
                                        : 'Cualquiera'}
                                </span>
                                <span className={`dropdown-arrow ${isPaymentMethodsOpen ? 'up' : ''}`}>▼</span>
                            </div>

                            {isPaymentMethodsOpen && (
                                <div className="dropdown-options">
                                    {[
                                        { id: 'paypal', label: 'PayPal' },
                                        { id: 'mercadopago', label: 'Mercado Pago' },
                                        { id: 'binance', label: 'Binance Pay' },
                                        { id: 'card', label: 'Tarjeta (Crédito/Débito)' }
                                    ].map(method => (
                                        <div
                                            key={method.id}
                                            className="dropdown-option"
                                            onClick={(e) => { e.stopPropagation(); handleCheckbox('paymentMethods', method.id); }}
                                        >
                                            <div className="checkbox-label" style={{ width: '100%' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={(currentFilters.paymentMethods || []).includes(method.id)}
                                                    onChange={() => { }}
                                                    style={{ marginRight: '8px' }}
                                                />
                                                {method.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Inline - Moved Here */}

                {/* Subcategories - Full Width Row */}
                {currentFilters.category && (
                    <div className="filter-subcategories-full" style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                            Especialidades en {currentFilters.category}:
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {(serviceCategories[currentFilters.category] || []).map(sub => {
                                const isSelected = Array.isArray(currentFilters.subcategory)
                                    ? currentFilters.subcategory.includes(sub)
                                    : currentFilters.subcategory === sub;

                                return (
                                    <button
                                        key={sub}
                                        style={{
                                            background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            color: isSelected ? 'white' : 'var(--text-secondary)',
                                            padding: '0.3rem 0.8rem', // Slightly larger padding for full row
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none'
                                        }}
                                        onClick={() => {
                                            const current = Array.isArray(currentFilters.subcategory) ? currentFilters.subcategory : [];
                                            let newSubs;
                                            if (current.includes(sub)) {
                                                newSubs = current.filter(s => s !== sub);
                                            } else {
                                                newSubs = [...current, sub];
                                            }
                                            handleChange('subcategory', newSubs);
                                        }}
                                    >
                                        {sub}
                                    </button>
                                );
                            })}
                            {(!serviceCategories[currentFilters.category] || serviceCategories[currentFilters.category].length === 0) && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin subcategorías.</span>
                            )}
                        </div>
                    </div>
                )}

                {variant === 'company' && (
                    <div className="company-filters-grid" style={{
                        gridColumn: '1 / -1',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem',
                        width: '100%'
                    }}>
                        {/* Column 1: Payment Frequency - EXPANDABLE DROPDOWN */}
                        <div className="filter-section" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }} ref={paymentMenuRef}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Frecuencia de Pago</h3>

                            <div className="custom-dropdown-container">
                                <div className={`custom-dropdown-wrapper ${isPaymentMenuOpen ? 'open' : ''}`}>
                                    <div className="dropdown-selected" onClick={() => setIsPaymentMenuOpen(!isPaymentMenuOpen)}>
                                        <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {getPaymentFrequencyLabel()}
                                        </span>
                                        <span className={`dropdown-arrow ${isPaymentMenuOpen ? 'up' : ''}`}>▼</span>
                                    </div>

                                    {isPaymentMenuOpen && (
                                        <div className="dropdown-options">
                                            {[
                                                { value: 'unique', label: 'Único' },
                                                { value: 'daily', label: 'Diario' },
                                                { value: 'weekly', label: 'Semanal' },
                                                { value: 'biweekly', label: 'Quincenal' },
                                                { value: 'monthly', label: 'Mensual' },
                                                { value: 'commission', label: 'Comisión' }
                                            ].map((option) => (
                                                <div
                                                    key={option.value}
                                                    className="dropdown-option"
                                                    onClick={(e) => { e.stopPropagation(); handleCheckbox('paymentFrequency', option.value); }}
                                                >
                                                    <div className="checkbox-label" style={{ width: '100%' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={Array.isArray(currentFilters.paymentFrequency) ? currentFilters.paymentFrequency.includes(option.value) : currentFilters.paymentFrequency === option.value}
                                                            onChange={() => { }}
                                                            style={{ marginRight: '8px' }}
                                                        />
                                                        {option.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Commission Filter - Only visible if 'commission' is selected */}
                            {(Array.isArray(currentFilters.paymentFrequency) && currentFilters.paymentFrequency.includes('commission')) && (
                                <div className="fade-in" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Comisión (%)</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            placeholder="Mín"
                                            className="search-input"
                                            style={{ flex: 1, padding: '0.4rem', textAlign: 'center', minWidth: '0' }}
                                            value={currentFilters.commissionMin || ''}
                                            onChange={(e) => handleChange('commissionMin', e.target.value)}
                                        />
                                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        <input
                                            type="number"
                                            placeholder="Máx"
                                            className="search-input"
                                            style={{ flex: 1, padding: '0.4rem', textAlign: 'center', minWidth: '0' }}
                                            value={currentFilters.commissionMax || ''}
                                            onChange={(e) => handleChange('commissionMax', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Column 2: Budget & Duration */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Min Price */}
                            <div className="filter-section" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Pago Mínimo</h3>
                                <div className="range-inputs" style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', marginRight: '0.5rem', color: 'var(--text-secondary)' }}>$</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="range-input"
                                        style={{ width: '100%', padding: '0.4rem' }}
                                        value={currentFilters.priceMin}
                                        onChange={(e) => handleChange('priceMin', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Duration Range */}
                            <div className="filter-section" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Duración</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        placeholder="Mín"
                                        className="search-input"
                                        style={{ flex: 1, padding: '0.4rem', textAlign: 'center', minWidth: '0' }}
                                        value={currentFilters.durationMin || ''}
                                        onChange={(e) => handleChange('durationMin', e.target.value)}
                                    />
                                    <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                    <input
                                        type="number"
                                        placeholder="Máx"
                                        className="search-input"
                                        style={{ flex: 1, padding: '0.4rem', textAlign: 'center', minWidth: '0' }}
                                        value={currentFilters.durationMax || ''}
                                        onChange={(e) => handleChange('durationMax', e.target.value)}
                                    />
                                </div>
                                <div className="custom-select-wrapper" style={{ marginTop: '0.5rem', minWidth: '100px' }}>
                                    <CustomDropdown
                                        options={[
                                            { label: 'Único', value: 'unique' },
                                            { label: 'Días', value: 'days' },
                                            { label: 'Semanas', value: 'weeks' },
                                            { label: 'Meses', value: 'months' },
                                            { label: 'Años', value: 'years' }
                                        ]}
                                        value={currentFilters.durationUnit || 'months'}
                                        onChange={(val) => handleChange('durationUnit', val)}
                                        placeholder="Unidad"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions Inline - Reset to Bottom */}
                <div className="filter-actions" style={{ marginTop: '1rem', width: '100%', justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleClear} className="btn-filter-action btn-clear">
                        Limpiar
                    </button>
                    <button onClick={handleSearchTrigger} className="btn-filter-action btn-apply">
                        Buscar
                    </button>
                </div>

            </div>

        </div>
    );
};

export default SidebarFilter;
