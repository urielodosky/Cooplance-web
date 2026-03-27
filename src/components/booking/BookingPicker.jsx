import React, { useState, useEffect } from 'react';
import { getAvailableSlots } from '../../utils/bookingEngine';

const BookingPicker = ({ bookingConfig, existingBookings = [], onSelect }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);

    // Initial date 
    useEffect(() => {
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, []);

    // Generate dates for current view (7 days at a time, Monday to Sunday)
    const generateDates = () => {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // reset time
        
        // Find Monday of the current week
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
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
            setSelectedTime(''); // Reset time when date changes
            onSelect(null, null); // Clear selection in parent
        } else {
            setAvailableSlots([]);
        }
    }, [selectedDate, bookingConfig, existingBookings]);

    const handleTimeSelect = (timeStr) => {
        setSelectedTime(timeStr);
        onSelect(selectedDate, timeStr);
    };

    if (!bookingConfig || !bookingConfig.requiresBooking) return null;

    return (
        <div className="booking-picker glass" style={{ padding: '1.5rem', borderRadius: '12px', marginTop: '1.5rem', border: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Reservar Turno
            </h3>
            
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
                        
                        // Check availability for this specific day
                        let hasAvailableSlots = false;
                        if (!isPast) {
                            const daySlots = getAvailableSlots(dateStr, bookingConfig, existingBookings);
                            hasAvailableSlots = daySlots.some(slot => !slot.isBooked);
                        }

                        // Also gray out if not active or in the past
                        const isActiveUI = hasAvailableSlots && !isPast; 

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
                                    flex: 1, // Let it shrink and grow to fit exactly 7 days
                                    padding: '0.5rem 0',
                                    borderRadius: '8px',
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: isSelected ? 'var(--primary)' : (isActiveUI ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'),
                                    color: isSelected ? 'white' : (isActiveUI ? 'var(--text-primary)' : 'rgba(255,255,255,0.2)'),
                                    cursor: isPast ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isPast ? 0.3 : (hasAvailableSlots ? (d.getDay() === 0 || d.getDay() === 6 ? 0.8 : 1) : 0.5) // Dim unavailable days heavily
                                }}
                            >
                                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', fontWeight: isSelected ? 600 : 400 }}>{dayName}</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', textDecoration: isActiveUI ? 'none' : 'line-through' }}>{dayNum}</span>
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
                            {availableSlots.map(slot => (
                                <button
                                    key={slot.time}
                                    type="button"
                                    onClick={() => !slot.isBooked && handleTimeSelect(slot.time)}
                                    disabled={slot.isBooked}
                                    style={{
                                        position: 'relative',
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        border: slot.isBooked ? '1px dashed rgba(255,255,255,0.1)' : (selectedTime === slot.time ? '1px solid var(--primary)' : '1px solid var(--border)'),
                                        background: slot.isBooked ? 'transparent' : (selectedTime === slot.time ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                                        color: slot.isBooked ? 'rgba(255,255,255,0.3)' : (selectedTime === slot.time ? 'white' : 'var(--text-primary)'),
                                        cursor: slot.isBooked ? 'not-allowed' : 'pointer',
                                        fontWeight: selectedTime === slot.time ? 600 : 500,
                                        transition: 'all 0.2s ease',
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textDecoration: slot.isBooked ? 'line-through' : 'none'
                                    }}
                                    title={slot.isBooked ? 'Turno ya dado' : 'Disponible'}
                                >
                                    {slot.time}
                                    {slot.isBooked && <span style={{ fontSize: '0.6rem', marginTop: '2px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Ocupado</span>}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#fbbf24', fontSize: '0.9rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            No hay turnos disponibles para esta fecha.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default BookingPicker;
