import React, { useState, useEffect, useRef } from 'react';
import '../../styles/components/CustomDatePicker.scss';

const CustomDatePicker = ({ 
    selected, 
    onChange, 
    label, 
    minDate, 
    maxDate, 
    required = false,
    placeholder = "Seleccionar fecha",
    className = '',
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('days'); // 'days', 'years'
    
    // Safety check for initialization
    const getInitialDate = () => {
        if (!selected) return new Date();
        const d = new Date(selected);
        return isNaN(d.getTime()) ? new Date() : d;
    };
    
    const [viewDate, setViewDate] = useState(getInitialDate());
    const dropdownRef = useRef(null);

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateSelect = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Normalize to local ISO date string YYYY-MM-DD
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const date = String(newDate.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${date}`);
        setIsOpen(false);
        setViewMode('days');
    };

    const handleYearSelect = (year) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setViewMode('days');
    };

    const changeMonth = (offset) => {
        const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(nextDate);
    };

    // Calculate days for the grid
    const daysInMonth = getDaysInMonth(viewDate.getMonth(), viewDate.getFullYear());
    const firstDay = getFirstDayOfMonth(viewDate.getMonth(), viewDate.getFullYear());
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        
        const isSelected = selected === dateStr;
        const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
        const isToday = new Date().toISOString().split('T')[0] === dateStr;

        days.push(
            <button
                key={d}
                type="button"
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => !isDisabled && handleDateSelect(d)}
                disabled={isDisabled}
            >
                {d}
            </button>
        );
    }

    // Year selection range (Current - 100 to Current + 10)
    const currentYear = new Date().getFullYear();
    const years = [];
    // Show a range of years centered around the current viewDate
    const startYear = viewDate.getFullYear() - 10;
    for (let i = 0; i < 20; i++) {
        years.push(startYear + i);
    }

    const formatDisplayDate = (isoDate) => {
        if (!isoDate) return "";
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className={`custom-date-picker-wrapper ${className}`} ref={dropdownRef} style={style}>
            {label && <label className="datepicker-label">{label} {required && <span className="required">*</span>}</label>}
            <div 
                className={`datepicker-input glass ${isOpen ? 'active' : ''}`} 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setViewMode('days');
                } }
            >
                <span className={selected ? 'value' : 'placeholder'}>
                    {selected ? formatDisplayDate(selected) : placeholder}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>

            {isOpen && (
                <div className="datepicker-dropdown glass fade-in">
                    <div className="calendar-header">
                        <button type="button" onClick={() => {
                            if (viewMode === 'days') changeMonth(-1);
                            else setViewDate(new Date(viewDate.getFullYear() - 20, viewDate.getMonth(), 1));
                        }} className="nav-btn">‹</button>
                        
                        <div className="header-labels">
                            {viewMode === 'days' ? (
                                <>
                                    <span className="month-label">{monthNames[viewDate.getMonth()]}</span>
                                    <button 
                                        type="button"
                                        className="year-btn"
                                        onClick={() => setViewMode('years')}
                                    >
                                        {viewDate.getFullYear()} ▾
                                    </button>
                                </>
                            ) : (
                                <span className="view-label">Seleccionar Año</span>
                            )}
                        </div>

                        <button type="button" onClick={() => {
                            if (viewMode === 'days') changeMonth(1);
                            else setViewDate(new Date(viewDate.getFullYear() + 20, viewDate.getMonth(), 1));
                        }} className="nav-btn">›</button>
                    </div>

                    {viewMode === 'days' ? (
                        <>
                            <div className="calendar-weekdays">
                                {daysOfWeek.map(d => <div key={d} className="weekday">{d}</div>)}
                            </div>

                            <div className="calendar-grid">
                                {days}
                            </div>
                        </>
                    ) : (
                        <div className="years-grid">
                            {Array.from({ length: 20 }, (_, i) => {
                                const y = viewDate.getFullYear() - 10 + i;
                                return (
                                    <button
                                        key={y}
                                        type="button"
                                        className={`year-item ${viewDate.getFullYear() === y ? 'active' : ''}`}
                                        onClick={() => handleYearSelect(y)}
                                    >
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
