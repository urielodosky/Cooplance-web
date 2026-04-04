import React, { useState, useEffect } from 'react';
import { getAvailableSlots } from '../../utils/bookingEngine';

const BookingPicker = ({ bookingConfig, existingBookings = [], onSelect, maxSlots = 1 }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedBookings, setSelectedBookings] = useState([]); // Array of {date, time}
    const [weekOffset, setWeekOffset] = useState(0);

    // Initial date 
    useEffect(() => {
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, []);

    // Reset selections when maxSlots changes
    useEffect(() => {
        setSelectedBookings([]);
        onSelect(null, null);
    }, [maxSlots]);

    // Generate dates for current view (7 days at a time, Monday to Sunday)
    const generateDates = () => {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDay = today.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() + diffToMonday);
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + (weekOffset * 7) + i);
            dates.push(d);
        }
        return dates;
    };

    const dates = generateDates();

    useEffect(() => {
        if (selectedDate) {
            const slots = getAvailableSlots(selectedDate, bookingConfig, existingBookings);
            setAvailableSlots(slots);
        } else {
            setAvailableSlots([]);
        }
    }, [selectedDate, bookingConfig, existingBookings]);

    const isSlotSelected = (date, time) => {
        return selectedBookings.some(b => b.date === date && b.time === time);
    };

    const handleTimeSelect = (timeStr) => {
        if (maxSlots <= 1) {
            // Single selection mode (original behavior)
            setSelectedBookings([{ date: selectedDate, time: timeStr }]);
            onSelect(selectedDate, timeStr);
        } else {
            // Multi-selection mode
            const existing = selectedBookings.find(b => b.date === selectedDate && b.time === timeStr);
            if (existing) {
                // Deselect
                const updated = selectedBookings.filter(b => !(b.date === selectedDate && b.time === timeStr));
                setSelectedBookings(updated);
                onSelect(updated.length > 0 ? updated : null, null);
            } else if (selectedBookings.length < maxSlots) {
                // Add selection
                const updated = [...selectedBookings, { date: selectedDate, time: timeStr }];
                setSelectedBookings(updated);
                onSelect(updated, null);
            }
        }
    };

    if (!bookingConfig || !bookingConfig.requiresBooking) return null;

    return (
        <div className="booking-picker glass" style={{ padding: '1.5rem', borderRadius: '12px', marginTop: '1.5rem', border: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <h3 style={{ marginBottom: '0.6rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Reservar Turno
            </h3>

            {/* Multi-slot indicator */}
            {maxSlots > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    padding: '0.5rem 0.7rem',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    fontSize: '0.8rem',
                    color: 'var(--primary)',
                    fontWeight: 600
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {selectedBookings.length} / {maxSlots} sesiones seleccionadas
                </div>
            )}
            
            <div className="horizontal-date-picker" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <label style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                        {dates.length > 0 ? (
                            dates[0].getMonth() === dates[6].getMonth() 
                                ? dates[0].toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                : `${dates[0].toLocaleDateString('es-AR', { month: 'short' })} - ${dates[6].toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}`
                        ) : 'Selecciona una fecha'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0} style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', cursor: weekOffset === 0 ? 'not-allowed' : 'pointer', opacity: weekOffset === 0 ? 0.3 : 1, color: 'white' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.3rem', width: '100%', overflowX: 'hidden' }}>
                    {dates.map((d, i) => {
                        const dateStr = d.toISOString().split('T')[0];
                        const isSelected = selectedDate === dateStr;
                        const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' });
                        const dayNum = d.getDate();
                        
                        const todayObj = new Date();
                        todayObj.setHours(0,0,0,0);
                        const isToday = d.getTime() === todayObj.getTime();
                        const isPast = d < todayObj;
                        
                        let hasAvailableSlots = false;
                        if (!isPast) {
                            const daySlots = getAvailableSlots(dateStr, bookingConfig, existingBookings);
                            hasAvailableSlots = daySlots.some(slot => !slot.isBooked);
                        }

                        const isActiveUI = hasAvailableSlots && !isPast;

                        // Show dot if any bookings on this date
                        const bookingsOnDay = selectedBookings.filter(b => b.date === dateStr).length;

                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={isPast}
                                onClick={() => !isPast && setSelectedDate(dateStr)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    padding: '0.5rem 0',
                                    borderRadius: '8px',
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: isSelected ? 'var(--primary)' : (isActiveUI ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'),
                                    color: isSelected ? 'white' : (isActiveUI ? 'var(--text-primary)' : 'rgba(255,255,255,0.2)'),
                                    cursor: isPast ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isPast ? 0.3 : (hasAvailableSlots ? (d.getDay() === 0 || d.getDay() === 6 ? 0.8 : 1) : 0.5),
                                    position: 'relative'
                                }}
                            >
                                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', fontWeight: isSelected ? 600 : 400 }}>{dayName}</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', textDecoration: isActiveUI ? 'none' : 'line-through' }}>{dayNum}</span>
                                {bookingsOnDay > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        color: 'white',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>{bookingsOnDay}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedDate && (
                <div className="slots-container" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Horarios disponibles para el <strong style={{ color: 'var(--primary)' }}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                    </label>
                    
                    {availableSlots.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                            {availableSlots.map(slot => {
                                const isThisSlotSelected = isSlotSelected(selectedDate, slot.time);
                                const isFull = selectedBookings.length >= maxSlots && !isThisSlotSelected;
                                return (
                                    <button
                                        key={slot.time}
                                        type="button"
                                        onClick={() => !slot.isBooked && !isFull && handleTimeSelect(slot.time)}
                                        disabled={slot.isBooked || isFull}
                                        style={{
                                            position: 'relative',
                                            padding: '0.6rem',
                                            borderRadius: '8px',
                                            border: slot.isBooked ? '1px dashed rgba(255,255,255,0.1)' : (isThisSlotSelected ? '1px solid var(--primary)' : '1px solid var(--border)'),
                                            background: slot.isBooked ? 'transparent' : (isThisSlotSelected ? 'var(--primary)' : (isFull ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)')),
                                            color: slot.isBooked ? 'rgba(255,255,255,0.3)' : (isThisSlotSelected ? 'white' : (isFull ? 'var(--text-muted)' : 'var(--text-primary)')),
                                            cursor: (slot.isBooked || isFull) ? 'not-allowed' : 'pointer',
                                            fontWeight: isThisSlotSelected ? 600 : 500,
                                            transition: 'all 0.2s ease',
                                            fontSize: '0.95rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textDecoration: slot.isBooked ? 'line-through' : 'none',
                                            opacity: isFull ? 0.4 : 1
                                        }}
                                        title={slot.isBooked ? 'Turno ya dado' : (isFull ? 'Máximo de sesiones alcanzado' : 'Disponible')}
                                    >
                                        {slot.time}
                                        {slot.isBooked && <span style={{ fontSize: '0.6rem', marginTop: '2px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Ocupado</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: '#fbbf24', fontSize: '0.9rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            No hay turnos disponibles para esta fecha.
                        </p>
                    )}
                </div>
            )}

            {/* Summary of selected bookings in multi mode */}
            {maxSlots > 1 && selectedBookings.length > 0 && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', marginBottom: '0.4rem', display: 'block' }}>
                        Sesiones seleccionadas:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {selectedBookings.map((b, i) => (
                            <span key={i} style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}>
                                {new Date(b.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} {b.time}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = selectedBookings.filter((_, idx) => idx !== i);
                                        setSelectedBookings(updated);
                                        onSelect(updated.length > 0 ? updated : null, null);
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0', fontSize: '0.9rem', lineHeight: 1 }}
                                >×</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPicker;
