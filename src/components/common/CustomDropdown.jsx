import React, { useState, useRef, useEffect } from 'react';
import '../../styles/components/CustomDropdown.scss';

const CustomDropdown = ({ label, options, value, onChange, placeholder = 'Seleccionar...', disabled = false, searchable = false, multiple = false, maxSelections = 0, allowCustom = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (isOpen) setSearchTerm('');
        }
    };

    const handleSelect = (optionValue) => {
        if (multiple) {
            let newValue = Array.isArray(value) ? [...value] : (value ? [value] : []);
            if (newValue.includes(optionValue)) {
                // Remove if already selected
                newValue = newValue.filter(v => v !== optionValue);
                onChange(newValue);
            } else if (!maxSelections || newValue.length < maxSelections) {
                // Add if limit not reached
                newValue.push(optionValue);
                onChange(newValue);
            }
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // Find the label for the selected value
    let displayValue = placeholder;
    if (multiple) {
        const arrVal = Array.isArray(value) ? value : (value ? [value] : []);
        if (arrVal.length > 0) {
            displayValue = arrVal.map(v => {
                const opt = options.find(o => (o.value || o) === v);
                return opt ? (opt.label || opt) : v;
            }).join(', ');
        }
    } else {
        const selectedOption = options.find(opt => opt.value === value || opt === value);
        if (selectedOption) {
            displayValue = selectedOption.label || (typeof selectedOption === 'string' ? selectedOption : '');
        } else if (value) {
            displayValue = value;
        }
    }

    return (
        <div className="custom-dropdown-container" ref={dropdownRef}>
            {label && <label className="field-label-sm">{label}</label>}
            <div className={`custom-dropdown-wrapper ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}>
                <div className="dropdown-selected" onClick={toggleDropdown}>
                    <span>{displayValue}</span>
                    <span className={`dropdown-arrow ${isOpen ? 'up' : ''}`}>▼</span>
                </div>
                {isOpen && (
                    <div className="dropdown-options">
                        {searchable && (
                            <div className="dropdown-search-wrapper" style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <input
                                    type="text"
                                    ref={searchInputRef}
                                    className="dropdown-search-input"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {allowCustom && searchTerm && !options.some(opt => (opt.label || opt).toString().toLowerCase() === searchTerm.toLowerCase()) && (
                            <div
                                className="dropdown-option"
                                style={{ color: 'var(--primary)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                                onClick={() => handleSelect(searchTerm)}
                            >
                                + Usar "{searchTerm}"
                            </div>
                        )}
                        {options
                            .filter(option => {
                                if (!searchable || !searchTerm) return true;
                                const optLabel = (option.label || option).toString().toLowerCase();
                                return optLabel.includes(searchTerm.toLowerCase());
                            })
                            .map((option, index) => {
                                const optValue = option.value || option;
                                const optLabel = option.label || option;

                                let isSelected = false;
                                if (multiple) {
                                    isSelected = Array.isArray(value) && value.includes(optValue);
                                } else {
                                    isSelected = optValue === value;
                                }

                                const isMaxReached = multiple && maxSelections > 0 && Array.isArray(value) && value.length >= maxSelections && !isSelected;

                                return (
                                    <div
                                        key={index}
                                        className={`dropdown-option ${isSelected ? 'selected' : ''} ${isMaxReached ? 'disabled-option' : ''}`}
                                        onClick={() => {
                                            if (!isMaxReached) handleSelect(optValue);
                                        }}
                                        style={isMaxReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {multiple && (
                                                <div style={{
                                                    width: '16px', height: '16px', borderRadius: '4px',
                                                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                            )}
                                            {optLabel}
                                        </div>
                                    </div>
                                );
                            })}
                        {searchable && searchTerm && options.filter(option => {
                            const optLabel = (option.label || option).toString().toLowerCase();
                            return optLabel.includes(searchTerm.toLowerCase());
                        }).length === 0 && !allowCustom && (
                                <div className="dropdown-option" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                                    Sin resultados
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomDropdown;
