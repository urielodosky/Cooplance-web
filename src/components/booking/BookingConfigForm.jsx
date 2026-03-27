import React, { useMemo } from 'react';
import CustomDropdown from '../common/CustomDropdown';

const BookingConfigForm = ({ config, onChange }) => {
    // helpers to update config
    const handleSessionChange = (field, value) => {
        onChange({
            ...config,
            sessionDetails: { ...config.sessionDetails, [field]: Number(value) }
        });
    };

    const timeOptions = useMemo(() => {
        const options = [];
        const interval = config.sessionDetails?.slotDurationMinutes || 15;
        let currentTime = 0;
        
        while (currentTime < 24 * 60) {
            const h = Math.floor(currentTime / 60);
            const m = currentTime % 60;
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            options.push({ label: timeString, value: timeString });
            currentTime += interval;
        }
        
        options.push({ label: '23:59', value: '23:59' });
        return options;
    }, [config.sessionDetails?.slotDurationMinutes]);

    const handleDayToggle = (day) => {
        // If enabling a day that has no shifts, add a default shift
        let newDayConfig = { ...config.availability[day], isActive: !config.availability[day].isActive };
        if (newDayConfig.isActive && (!newDayConfig.shifts || newDayConfig.shifts.length === 0)) {
            newDayConfig.shifts = [{ start: "09:00", end: "17:00" }];
        }

        onChange({
            ...config,
            availability: {
                ...config.availability,
                [day]: newDayConfig
            }
        });
    };

    const handleShiftChange = (day, index, field, value) => {
        const newShifts = [...config.availability[day].shifts];
        newShifts[index] = { ...newShifts[index], [field]: value };
        onChange({
            ...config,
            availability: {
                ...config.availability,
                [day]: { ...config.availability[day], shifts: newShifts }
            }
        });
    };

    const addShift = (day) => {
        const currentShifts = config.availability[day].shifts || [];
        onChange({
            ...config,
            availability: {
                ...config.availability,
                [day]: { ...config.availability[day], shifts: [...currentShifts, { start: "09:00", end: "17:00" }] }
            }
        });
    };

    const removeShift = (day, index) => {
        const newShifts = config.availability[day].shifts.filter((_, i) => i !== index);
        onChange({
            ...config,
            availability: {
                ...config.availability,
                [day]: { ...config.availability[day], shifts: newShifts }
            }
        });
    };

    const daysTranslation = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
    };

    if (!config) return null;

    return (
        <div className="booking-config-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Configuración de Reservas y Turnos
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Define la duración de tus sesiones y tu disponibilidad semanal. Los clientes podrán reservar turnos dentro de estos horarios.
            </p>

            <div className="form-grid-2" style={{ marginBottom: '2rem', position: 'relative', zIndex: 200 }}>
                <div className="form-group" style={{ position: 'relative', zIndex: 201 }}>
                    <CustomDropdown 
                        label="Duración de cada sesión (minutos)"
                        options={[
                            { label: '30 min', value: 30 },
                            { label: '45 min', value: 45 },
                            { label: '1 hora (60 min)', value: 60 },
                            { label: '1.5 horas (90 min)', value: 90 },
                            { label: '2 horas (120 min)', value: 120 }
                        ]}
                        value={config.sessionDetails?.slotDurationMinutes || 60} 
                        onChange={(val) => handleSessionChange('slotDurationMinutes', val)}
                    />
                </div>
                <div className="form-group" style={{ position: 'relative', zIndex: 200 }}>
                    <CustomDropdown 
                        label="Tiempo de descanso (minutos)"
                        options={[
                            { label: 'Sin descanso', value: 0 },
                            { label: '10 min', value: 10 },
                            { label: '15 min', value: 15 },
                            { label: '30 min', value: 30 }
                        ]}
                        value={config.sessionDetails?.bufferTimeMinutes || 0} 
                        onChange={(val) => handleSessionChange('bufferTimeMinutes', val)}
                    />
                </div>
            </div>

            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Disponibilidad Semanal</h4>
            <div className="weekly-schedule" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(daysTranslation).map((day) => {
                    const dayData = config.availability?.[day] || { isActive: false, shifts: [] };
                    return (
                        <div key={day} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={dayData.isActive} 
                                    onChange={() => handleDayToggle(day)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: dayData.isActive ? 600 : 400, color: dayData.isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {daysTranslation[day]}
                                </span>
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                {dayData.isActive ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {dayData.shifts && dayData.shifts.map((shift, idx) => (
                                            <React.Fragment key={idx}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', position: 'relative', zIndex: 100 - (Object.keys(daysTranslation).indexOf(day) * 10 + idx) }}>
                                                <div style={{ width: '130px' }}>
                                                    <CustomDropdown 
                                                        options={timeOptions}
                                                        value={shift.start}
                                                        onChange={(val) => handleShiftChange(day, idx, 'start', val)}
                                                    />
                                                </div>
                                                <span style={{ color: 'var(--text-muted)' }}>a</span>
                                                <div style={{ width: '130px' }}>
                                                    <CustomDropdown 
                                                        options={timeOptions}
                                                        value={shift.end}
                                                        onChange={(val) => handleShiftChange(day, idx, 'end', val)}
                                                    />
                                                </div>
                                                <button type="button" onClick={() => removeShift(day, idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0.5rem' }} title="Quitar horario">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                            {(() => {
                                                if (!shift.start || !shift.end) return null;
                                                const getMins = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
                                                const diff = getMins(shift.end) - getMins(shift.start);
                                                const totalSlotLength = Number(config.sessionDetails.slotDurationMinutes) + Number(config.sessionDetails.bufferTimeMinutes);
                                                
                                                if (diff <= 0) {
                                                    return <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '-0.3rem', marginBottom: '0.5rem' }}>* Hora de fin debe ser posterior a inicio.</div>;
                                                } else if (diff < totalSlotLength) {
                                                    return <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '-0.3rem', marginBottom: '0.5rem' }}>* Bloque muy corto ({diff}m) para tu sesión completa ({totalSlotLength}m).</div>;
                                                } else {
                                                    const qty = Math.floor(diff / totalSlotLength);
                                                    const remainder = diff % totalSlotLength;
                                                    return (
                                                        <div style={{ color: remainder > 0 ? '#fbbf24' : '#10b981', fontSize: '0.75rem', marginTop: '-0.3rem', marginBottom: '0.5rem' }}>
                                                            {remainder > 0 ? `Entran ${qty} turno/s. Sobran ${remainder} min al final.` : `Entran exactamente ${qty} turno/s.`}
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </React.Fragment>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => addShift(day)}
                                            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', fontWeight: 600 }}
                                        >
                                            + Agregar horario
                                        </button>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', height: '100%' }}>No disponible</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BookingConfigForm;
