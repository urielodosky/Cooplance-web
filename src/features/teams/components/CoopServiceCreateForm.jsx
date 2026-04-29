import React, { useState, useEffect } from 'react';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { processGamificationRules, calculateCommission } from '../../../utils/gamification';
import { serviceCategories, bookingCategories } from '../../services/data/categories';
import { locations } from '../../services/data/locations';
import universitiesData from '../../services/data/universidades_limpias.json';
import CustomDropdown from '../../../components/common/CustomDropdown';
import BookingConfigForm from '../../../components/booking/BookingConfigForm';
import { useBadgeNotification } from '../../../context/BadgeNotificationContext';
import '../../../styles/components/ServiceCreateForm.scss';

const CoopServiceCreateForm = ({ onCancel, teamId, initialData, dashboardMembers }) => {
    const { addServiceToTeam } = useTeams();
    const { user } = useAuth();
    const { refreshBadges } = useBadgeNotification();

    const [hasPackages, setHasPackages] = useState(initialData?.hasPackages || false);
    const [mediaType, setMediaType] = useState(initialData?.mediaType || { image: 'file', video: 'url' });
    const [formError, setFormError] = useState('');

    // --- Participant Election State ---
    const [participantMode, setParticipantMode] = useState(initialData?.participantMode || 'all'); // 'all', 'fixed', 'variable'
    const [fixedParticipants, setFixedParticipants] = useState(initialData?.fixedParticipants || []);

    const { teams } = useTeams();
    const activeTeam = teams.find(t => t.id === teamId);

    const [teamMembersDetails, setTeamMembersDetails] = useState([]);

    useEffect(() => {
        if (activeTeam) {
            const membersToMap = dashboardMembers || activeTeam.members || [];
            const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
            const details = membersToMap.map(member => {
                const memberId = member.user_id;
                const userDetail = storedUsers.find(u => u.id === memberId || u.id === member.id);
                if (userDetail) {
                    return { ...userDetail, role: member.role, id: userDetail.id, level: member.level || userDetail.level };
                }
                // Fallback for mocked or fake members injected by Dashboard
                return { ...member, id: memberId, level: member.level || 1 };
            }).filter(Boolean);

            console.log('ACTIVE TEAM MEMBERS:', activeTeam.members);
            console.log('TEAM MEMBERS DETAILS:', details);
            console.log('ALL USERS:', storedUsers);

            // Ensure founder is in the list even if not explicitly in `members` array
            if (activeTeam.founderId && !details.some(d => d.id === activeTeam.founderId)) {
                const founderDetail = storedUsers.find(u => u.id === activeTeam.founderId);
                if (founderDetail) {
                    details.unshift({ ...founderDetail, role: 'owner' });
                }
            }

            setTeamMembersDetails(details);
        }
    }, [activeTeam, dashboardMembers]);

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        category: initialData?.category || '',
        subcategory: (typeof initialData?.subcategory === 'string') ? initialData?.subcategory : '',
        specialties: initialData?.specialties || (Array.isArray(initialData?.subcategory) ? initialData?.subcategory : []),
        workMode: initialData?.workMode || ['remote'],
        price: initialData?.price || '',
        description: initialData?.description || '',
        deliveryTime: initialData?.deliveryTime || '',
        revisions: initialData?.revisions || '',
        imageUrl: initialData?.image || '',
        videoUrl: initialData?.video || '',
        portfolioUrl: initialData?.portfolioUrl || '',
        location: initialData?.location || '',
        country: initialData?.country || '',
        province: initialData?.province || '',
        city: initialData?.city || '',
        paymentMethods: initialData?.paymentMethods || [],
        professionalLicense: initialData?.professionalLicense || '',
        professionalBody: initialData?.professionalBody || '',
        bookingConfig: initialData?.bookingConfig || {
            requiresBooking: false,
            sessionDetails: { slotDurationMinutes: 60, bufferTimeMinutes: 0 },
            availability: {
                monday: { isActive: true, shifts: [{ start: "09:00", end: "17:00" }] },
                tuesday: { isActive: true, shifts: [{ start: "09:00", end: "17:00" }] },
                wednesday: { isActive: true, shifts: [{ start: "09:00", end: "17:00" }] },
                thursday: { isActive: true, shifts: [{ start: "09:00", end: "17:00" }] },
                friday: { isActive: true, shifts: [{ start: "09:00", end: "17:00" }] },
                saturday: { isActive: false, shifts: [] },
                sunday: { isActive: false, shifts: [] }
            }
        },
        ...initialData
    });

    const [tags, setTags] = useState(initialData?.tags || []);
    const [tagInput, setTagInput] = useState('');

    const [fileNames, setFileNames] = useState({
        image: initialData?.image ? 'Imagen actual' : '',
        video: initialData?.video ? 'Video actual' : ''
    });

    const [servicePackages, setServicePackages] = useState(initialData?.packages || [
        { name: 'Básico', price: '', description: '', deliveryTime: '', revisions: '', sessions: 1 },
        { name: 'Estándar', price: '', description: '', deliveryTime: '', revisions: '', sessions: 2 },
        { name: 'Premium', price: '', description: '', deliveryTime: '', revisions: '', sessions: 3 }
    ]);

    const [faqs, setFaqs] = useState(initialData?.faqs || [{ question: '', answer: '' }]);

// Helper for Net Earnings
const calculateNet = (price) => {
    if (!price) return '0.00';
    const num = parseFloat(price);
    // Use user level to calculate commission dynamically
    const rate = calculateCommission(user?.level || 1) / 100;
    return isNaN(num) ? '0.00' : (num * (1 - rate)).toFixed(2);
};

const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // Cascading resets
        if (name === 'country') {
            newData.province = '';
            newData.city = '';
        } else if (name === 'province') {
            newData.city = '';
        }
        return newData;
    });
};

const getProvinces = () => formData.country && locations[formData.country] ? Object.keys(locations[formData.country]) : [];
const getCities = () => formData.country && formData.province && locations[formData.country][formData.province] ? locations[formData.country][formData.province] : [];

    const isSessionBased = ['Educación y Estilo de Vida', 'Profesionales Matriculados', 'Negocios y Administración'].includes(formData.category) ||
        bookingCategories.includes(formData.category) ||
        (typeof formData.subcategory === 'string' && (
            formData.subcategory.toLowerCase().includes('tutoría') ||
            formData.subcategory.toLowerCase().includes('coaching')
        ));


    const categorySupportsBooking = bookingCategories.includes(formData.category) ||
        bookingCategories.includes(formData.subcategory) ||
        (Array.isArray(formData.specialties) && formData.specialties.some(s => bookingCategories.includes(s)));

const prevCategorySupportsBooking = React.useRef(categorySupportsBooking);

useEffect(() => {
    if (categorySupportsBooking !== prevCategorySupportsBooking.current) {
        prevCategorySupportsBooking.current = categorySupportsBooking;
        setFormData(prev => ({
            ...prev,
            bookingConfig: {
                ...prev.bookingConfig,
                requiresBooking: categorySupportsBooking
            }
        }));
    }
}, [categorySupportsBooking]);

const handleCategoryChange = (val) => {
    setFormData(prev => ({
        ...prev,
        category: val,
        subcategory: '',
        specialties: []
    }));
};

const handleSubcategoryChange = (val) => {
    setFormData(prev => ({ ...prev, subcategory: val, specialties: [] }));
};

const handleSelectOption = (name, value) => {
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        if (name === 'category') newData.subcategory = [];
        return newData;
    });
};

const handleChange = (e, type = 'text') => {
    if (type === 'file') {
        const file = e.target.files[0];
        if (file) {
            const mockUrl = URL.createObjectURL(file);
            const fieldName = e.target.name === 'image' ? 'imageUrl' : 'videoUrl';
            setFormData({ ...formData, [fieldName]: mockUrl });
            setFileNames({ ...fileNames, [e.target.name]: file.name });
        }
    } else {
        // Price validation - prevent negative
        if (e.target.name === 'price') {
            const val = parseFloat(e.target.value);
            if (val < 0) {
                setFormData({ ...formData, [e.target.name]: '0' });
                return;
            }
        }
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }
};

    const handlePackageChange = (tier, field, value) => {
        if (field === 'price' || field === 'sessions') {
            const val = parseFloat(value);
            if (val < 0) return;
        }
        setServicePackages(prev => prev.map((pkg, i) => i === tier ? { ...pkg, [field]: value } : pkg));
    };

    const handleTutoringPlanChange = (index, field, value) => {
        const newPlans = [...servicePackages]; // Assuming tutoringPlans is now servicePackages
        newPlans[index][field] = value;
        setServicePackages(newPlans);
    };

    const addTutoringPlan = () => {
        if (servicePackages.length < 5) {
            setServicePackages([...servicePackages, { name: `Plan ${servicePackages.length + 1}`, sessions: 1, price: '', description: '' }]);
        }
    };

    const removeTutoringPlan = (index) => {
        if (servicePackages.length > 2) {
            setServicePackages(servicePackages.filter((_, i) => i !== index));
        }
    };

const handleFaqChange = (index, field, value) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
};

const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
};

const removeFaq = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
}

const handleModeSelect = (mode) => {
    let newModes;
    if (formData.workMode.includes(mode)) {
        newModes = formData.workMode.filter(m => m !== mode);
    } else {
        newModes = [...formData.workMode, mode];
    }
    setFormData({ ...formData, workMode: newModes });
}

const toggleMediaType = (field, type) => {
    setMediaType({ ...mediaType, [field]: type });
}

// Tag Handlers
const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const trimmedInput = tagInput.trim();
        if (trimmedInput && tags.length < 5 && !tags.includes(trimmedInput)) {
            setTags([...tags, trimmedInput]);
            setTagInput('');
        }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        setTags(tags.slice(0, -1));
    }
};

const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
};

const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(''); // reset errors

    if (formData.bookingConfig?.requiresBooking) {
        const { slotDurationMinutes, bufferTimeMinutes } = formData.bookingConfig.sessionDetails;
        const totalSlotLength = Number(slotDurationMinutes) + Number(bufferTimeMinutes);

        let hasActiveDays = false;
        for (const [day, data] of Object.entries(formData.bookingConfig.availability)) {
            if (data.isActive) {
                hasActiveDays = true;
                if (!data.shifts || data.shifts.length === 0) {
                    setFormError(`Debes agregar al menos un horario en el día activo (${day}).`);
                    return;
                }
                for (const shift of data.shifts) {
                    if (!shift.start || !shift.end) {
                        setFormError(`Por favor completa los rangos de horas.`);
                        return;
                    }
                    const getMins = (time) => time.split(':').map(Number)[0] * 60 + time.split(':').map(Number)[1];
                    const startMins = getMins(shift.start);
                    const endMins = getMins(shift.end);

                    if (startMins >= endMins) {
                        setFormError(`El horario de fin debe ser posterior al de inicio (${shift.start} a ${shift.end}).`);
                        return;
                    }

                    const diff = endMins - startMins;
                    if (diff < totalSlotLength) {
                        setFormError(`El bloque de ${shift.start} a ${shift.end} en ${day} (${diff}m) es muy corto para abarcar una sesión completa (${totalSlotLength}m).`);
                        return;
                    }
                }
            }
        }
        if (!hasActiveDays) {
            setFormError('Debes tener al menos un día activo en tu disponibilidad para ofrecer reservas.');
            return;
        }
    }

    if (formData.category === 'Profesionales Matriculados' && !formData.professionalBody?.trim()) {
        setFormError('El Colegio Universitario / Jurisdicción es obligatorio.');
        return;
    }

    if (!formData.subcategory?.trim()) {
        setFormError('Debes seleccionar una subcategoría para tu servicio.');
        return;
    }

    const finalServiceData = {
        ...formData,
        id: initialData?.id || Date.now(),
        price: hasPackages ? servicePackages[0].price : formData.price,
        packages: hasPackages ? servicePackages : null,
        hasPackages: hasPackages,
        isSessionBased: isSessionBased,
        faqs: faqs.filter(f => f.question && f.answer),
        owner_id: user.id,
        team_id: teamId,
        tags: tags,
        image_url: formData.imageUrl,
        video_url: formData.videoUrl,
        bookingConfig: formData.bookingConfig?.requiresBooking ? formData.bookingConfig : null,
        freelancerId: user.id,
        freelancerName: initialData?.freelancerName || user.firstName || user.username || user.companyName,
        level: initialData?.level || user.level || 1,
        image: formData.imageUrl,
        video: formData.videoUrl,
        mediaType: mediaType,
        date: initialData?.date || new Date().toISOString(),
        country: formData.country,
        province: formData.province,
        city: formData.city,
        professionalLicense: formData.category === 'Profesionales Matriculados' ? formData.professionalLicense : null,
        professionalBody: formData.category === 'Profesionales Matriculados' ? formData.professionalBody : null,
        location: formData.workMode.includes('presential')
            ? `${formData.city}, ${formData.province}, ${formData.country}`
            : 'Remoto',
        paymentMethods: (formData.paymentMethods && formData.paymentMethods.length > 0)
            ? formData.paymentMethods.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
            : null, // Null implies "All/Default"
        participantMode: participantMode,
        fixedParticipants: participantMode === 'fixed' ? fixedParticipants : []
    };

    if (initialData) {
        // updateTeamService(teamId, finalServiceData);
        alert('¡Servicio de Equipo actualizado con éxito!');
    } else {
            addServiceToTeam(teamId, finalServiceData)
                .then(() => {
                    alert('¡Servicio de Equipo publicado con éxito!');
                    if (refreshBadges) refreshBadges();
                    onCancel();
                })
            .catch(err => alert("Error: " + err.message));
        return;
    }
    onCancel();
};

const showSchedule = ['Coaching y Tutorias', 'Crecimiento Personal y Pasatiempos'].includes(formData.category);
const showFileFormats = ['Artes Gráficas y Diseño', 'Video y Animación', 'Música y Audio'].includes(formData.category);

return (
    <div className="glass service-form-container">
        <h3>Nuevo Servicio</h3>
        <form onSubmit={handleSubmit} className="service-form">

            {formError && (
                <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {formError}
                </div>
            )}

            <input type="text" name="title" placeholder="Título del servicio (ej. Diseño de logo profesional)" onChange={handleChange} required />

            <div className="tags-input-container">
                <div className="tags-wrapper">
                    {tags.map((tag, index) => (
                        <span key={index} className="tag-chip">
                            {tag}
                            <button type="button" onClick={() => removeTag(index)} className="tag-remove">×</button>
                        </span>
                    ))}

                    {tags.length < 5 && (
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder={tags.length === 0 ? "Etiquetas (Enter para agregar)" : ""}
                            className="tag-input-field"
                        />
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="tags-help">Ej: logo, minimalista, branding (Presiona Enter)</span>
                    <span style={{ fontSize: '0.8rem', color: tags.length >= 5 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {tags.length}/5
                    </span>
                </div>
            </div>

            {/* CATEGORY SELECTION */}
            <div className="category-section">
                <label className="category-label">Categoría del Servicio</label>
                <div style={{ marginBottom: '1rem' }}>
                    <CustomDropdown
                        options={(activeTeam?.categories || []).map(cat => ({ label: cat, value: cat }))}
                        value={formData.category}
                        onChange={handleCategoryChange}
                        placeholder="Selecciona una de las categorías de tu Coop"
                    />
                </div>

                {/* SUBCATEGORY SELECTION */}
                {formData.category && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="category-label">Subcategoría</label>
                        <CustomDropdown
                            options={Object.keys(serviceCategories[formData.category] || {}).map(sub => ({ label: sub, value: sub }))}
                            value={formData.subcategory || ''}
                            onChange={handleSubcategoryChange}
                            placeholder="Selecciona una Subcategoría"
                        />
                    </div>
                )}

                {/* SPECIALTIES GRID */}
                {formData.category && formData.subcategory && (
                    <div className="subcategory-wrapper">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="category-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                                Especialidades en {formData.subcategory}
                            </label>
                            <span style={{ fontSize: '0.8rem', color: (formData.specialties?.length || 0) >= 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                                {(formData.specialties?.length || 0)}/3 Seleccionadas
                            </span>
                        </div>

                        <div className="category-grid">
                            {(serviceCategories[formData.category]?.[formData.subcategory] || []).map(spec => {
                                const isSelected = (formData.specialties || []).includes(spec);
                                return (
                                    <div
                                        key={spec}
                                        className={`category-option ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                            const current = formData.specialties || [];
                                            let newSpecs;
                                            if (current.includes(spec)) {
                                                newSpecs = current.filter(s => s !== spec);
                                            } else {
                                                if (current.length >= 3) return; // Limit reached
                                                newSpecs = [...current, spec];
                                            }
                                            handleSelectOption('specialties', newSpecs);
                                        }}
                                    >
                                        {spec}
                                    </div>
                                );
                            })}
                        </div>
                        {(formData.specialties?.length || 0) === 0 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                * Selecciona al menos una especialidad.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {formData.category === 'Profesionales Matriculados' && (
                <div className="form-group" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <h5 style={{ margin: 0, color: '#ef4444' }}>Credenciales Profesionales (CRÍTICO)</h5>
                    </div>
                    <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>N° de Matrícula Profesional</label>
                            <input type="text" name="professionalLicense" placeholder="Ej. MN 123456" value={formData.professionalLicense || ''} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>Colegio Universitario / Jurisdicción</label>
                            <CustomDropdown
                                options={universitiesData.map(uni => ({ label: uni.name, value: uni.name }))}
                                value={formData.professionalBody}
                                onChange={(val) => handleSelectOption('professionalBody', val)}
                                placeholder="Ej. Escribí tu universidad o colegio..."
                                searchable={true}
                                allowCustom={true}
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.8rem', margin: '0.8rem 0 0 0' }}>
                        * Esta información es obligatoria y será verificada por soporte. Proveer datos falsos resultará en la suspensión permanente de tu cuenta.
                    </p>
                </div>
            )}

            {/* WORK MODE SELECTION */}
            <div className="work-mode-section">
                <label className="work-mode-label">Modalidad de Trabajo</label>
                <div className="work-mode-options">
                    <div
                        className={`mode-option remote ${formData.workMode.includes('remote') ? 'active' : ''}`}
                        onClick={() => handleModeSelect('remote')}
                    >
                        <div className="mode-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                                <path d="M10 9l2 2 2-2"></path>
                            </svg>
                        </div>
                        <span>Remoto</span>
                    </div>
                    <div
                        className={`mode-option presential ${formData.workMode.includes('presential') ? 'active' : ''}`}
                        onClick={() => handleModeSelect('presential')}
                    >
                        <div className="mode-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21h18" />
                                <path d="M5 21V7l8-4 8 4v14" />
                                <path d="M8 21v-9a4 4 0 1 1 8 0v9" />
                            </svg>
                        </div>
                        <span>Presencial</span>
                    </div>
                </div>
            </div>

            {formData.workMode.includes('presential') && (
                <div className="location-fields" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                    <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Ubicación del Servicio</label>
                    <div className="form-row-3">
                        <div className="select-wrapper">
                            <select
                                name="country"
                                value={formData.country || ''}
                                onChange={handleLocationChange}
                                className="native-select"
                                required={formData.workMode.includes('presential')}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Selecciona País</option>
                                {Object.keys(locations).map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        <div className="select-wrapper">
                            <select
                                name="province"
                                value={formData.province || ''}
                                onChange={handleLocationChange}
                                className="native-select"
                                disabled={!formData.country}
                                required={formData.workMode.includes('presential')}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Provincia / Estado</option>
                                {getProvinces().map(prov => (
                                    <option key={prov} value={prov}>{prov}</option>
                                ))}
                            </select>
                        </div>

                        <div className="select-wrapper">
                            <select
                                name="city"
                                value={formData.city || ''}
                                onChange={handleLocationChange}
                                className="native-select"
                                disabled={!formData.province}
                                required={formData.workMode.includes('presential')}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Ciudad</option>
                                {getCities().map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {categorySupportsBooking && (
                <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <input
                            type="checkbox"
                            id="requiresBookingToggle"
                            checked={formData.bookingConfig?.requiresBooking || false}
                            onChange={(e) => {
                                setFormData(prev => ({
                                    ...prev,
                                    bookingConfig: {
                                        ...prev.bookingConfig,
                                        requiresBooking: e.target.checked
                                    }
                                }));
                            }}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <label htmlFor="requiresBookingToggle" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
                            Habilitar sistema de turnos y calendario
                        </label>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '2.1rem', marginBottom: 0 }}>
                        Tus clientes podrán reservar horarios específicos. Desactivalo si preferís coordinar los horarios de las sesiones manualmente por chat.
                    </p>
                </div>
            )}

            {categorySupportsBooking && formData.bookingConfig?.requiresBooking && (
                <BookingConfigForm
                    config={formData.bookingConfig}
                    onChange={(newConfig) => setFormData({ ...formData, bookingConfig: newConfig })}
                />
            )}

            <div className="packages-toggle" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <input
                    type="checkbox"
                    id="usePackages"
                    checked={hasPackages}
                    onChange={(e) => setHasPackages(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                />
                <label htmlFor="usePackages" style={{ fontWeight: 500, fontSize: '1.05rem', cursor: 'pointer' }}>Activar Paquetes</label>
            </div>

            {hasPackages && (
                <div className="tutoring-plans-section">
                    <div className="packages-grid">
                        {servicePackages.map((plan, index) => (
                            <div key={index} className="package-column relative">
                                {servicePackages.length > 1 && (
                                    <button type="button" className="remove-plan-btn" onClick={() => {
                                        const newPlans = servicePackages.filter((_, i) => i !== index);
                                        setServicePackages(newPlans);
                                    }} title="Quitar plan">×</button>
                                )}
                                <input
                                    type="text"
                                    className="plan-name-input"
                                    value={plan.name}
                                    maxLength={10}
                                    onChange={(e) => {
                                        const newPlans = [...servicePackages];
                                        newPlans[index].name = e.target.value;
                                        setServicePackages(newPlans);
                                    }}
                                    placeholder="Nombre del Plan"
                                />
                                <div className="package-field">
                                    <label>Precio Total</label>
                                    <div className="price-input-wrapper">
                                        <input
                                            type="number"
                                            value={plan.price}
                                            onChange={(e) => {
                                                const newPlans = [...servicePackages];
                                                newPlans[index].price = e.target.value;
                                                setServicePackages(newPlans);
                                            }}
                                            required
                                        />
                                        <span className="currency-badge">ARS</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Recibes: ${calculateNet(plan.price)}
                                    </div>
                                </div>

                                {isSessionBased ? (
                                    <div className="package-field">
                                        <label>Cantidad de Sesiones</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={plan.sessions}
                                            onChange={(e) => {
                                                const newPlans = [...servicePackages];
                                                newPlans[index].sessions = e.target.value;
                                                setServicePackages(newPlans);
                                            }}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="package-field">
                                            <label>Entrega (días)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={plan.deliveryTime}
                                                onChange={(e) => {
                                                    const newPlans = [...servicePackages];
                                                    newPlans[index].deliveryTime = e.target.value;
                                                    setServicePackages(newPlans);
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="package-field">
                                            <label>Revisiones</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={plan.revisions}
                                                onChange={(e) => {
                                                    const newPlans = [...servicePackages];
                                                    newPlans[index].revisions = e.target.value;
                                                    setServicePackages(newPlans);
                                                }}
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="package-field">
                                    <label>Resumen / Descripción</label>
                                    <textarea
                                        rows="3"
                                        value={plan.description}
                                        onChange={(e) => {
                                            const newPlans = [...servicePackages];
                                            newPlans[index].description = e.target.value;
                                            setServicePackages(newPlans);
                                        }}
                                        placeholder="Ej: Incluye..."
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                        {servicePackages.length < 5 && (
                            <button type="button" className="add-package-card" onClick={() => {
                                setServicePackages([...servicePackages, {
                                    name: `Plan ${servicePackages.length + 1}`,
                                    price: '',
                                    description: '',
                                    deliveryTime: 1,
                                    revisions: 0,
                                    sessions: 1
                                }]);
                            }}>
                                <span>+</span>
                                <p>Agregar plan</p>
                            </button>
                        )}
                    </div>
                </div>
            )}
            {!hasPackages && (
                <>
                    <div className="form-row-pricing">
                        <div className="price-group">
                            <label className="field-label">Precio del Servicio</label>
                            <div className="price-input-wrapper">
                                <input type="number" name="price" placeholder="5000" value={formData.price} onChange={handleChange} required />
                                <span className="currency-badge">ARS</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                Recibes: ${calculateNet(formData.price)}
                            </div>
                        </div>

                        {!isSessionBased && (
                            <>
                                <div className="form-group-field">
                                    <label className="field-label">Días de Entrega</label>
                                    <input type="number" name="deliveryTime" min="1" placeholder="3" value={formData.deliveryTime} onChange={handleChange} required />
                                </div>
                                <div className="form-group-field">
                                    <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        Revisiones
                                        <div className="help-icon-wrapper" style={{ position: 'relative' }}>
                                            <div className="help-icon">?</div>
                                            <div className="help-tooltip" style={{ width: '200px' }}>
                                                Cantidad de veces que se permiten modificaciones una vez entregado.
                                            </div>
                                        </div>
                                    </label>
                                    <input type="number" name="revisions" placeholder="2" value={formData.revisions} onChange={handleChange} required />
                                </div>
                            </>
                        )}
                    </div>
                    <textarea name="description" placeholder={"Describe detalladamente qué ofreces en este servicio..."} rows="4" value={formData.description} onChange={handleChange} required />
                </>
            )}

            {(showSchedule || showFileFormats) && (
                <div className="form-row-2">
                    {showSchedule && (
                        <>
                            <input type="text" name="availableDays" placeholder="Días Disponibles (ej. Lun-Vie)" onChange={handleChange} />
                            <input type="text" name="hours" placeholder="Horas por sesión / Horarios" onChange={handleChange} />
                        </>
                    )}
                    {showFileFormats && (
                        <input type="text" name="fileFormats" placeholder="Formatos de entrega (ej. AI, PDF, JPG)" onChange={handleChange} style={{ gridColumn: showSchedule ? 'auto' : '1 / -1' }} />
                    )}
                </div>
            )}

            {/* PAYMENT METHODS SELECTION */}
            <div className="payment-methods-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Métodos de Pago Aceptados</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Selecciona los métodos que aceptas para este servicio. Si no seleccionas ninguno, se asumirá que aceptas <strong>todos</strong> los disponibles en tu perfil.
                </p>
                <div className="checkbox-group" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                        { id: 'paypal', label: 'PayPal' },
                        { id: 'mercadopago', label: 'Mercado Pago' },
                        { id: 'binance', label: 'Binance Pay' },
                        { id: 'card', label: 'Tarjeta (Plataforma)' }
                    ].map(method => (
                        <label key={method.id} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                                type="checkbox"
                                checked={(formData.paymentMethods || []).includes(method.id)}
                                onChange={() => {
                                    const current = formData.paymentMethods || [];
                                    let newMethods;
                                    if (current.includes(method.id)) {
                                        newMethods = current.filter(m => m !== method.id);
                                    } else {
                                        newMethods = [...current, method.id];
                                    }
                                    setFormData(prev => ({ ...prev, paymentMethods: newMethods }));
                                }}
                                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                            />
                            {method.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className="media-section">
                <h4>Multimedia</h4>
                <div className="media-inputs">

                    {/* IMAGE INPUT */}
                    <div className="media-group">
                        <label className="media-label">Imagen de Portada</label>
                        <div className="media-tabs">
                            <button type="button" className={`media-tab ${mediaType.image === 'file' ? 'active' : ''}`} onClick={() => toggleMediaType('image', 'file')}>Subir Archivo</button>
                            <button type="button" className={`media-tab ${mediaType.image === 'url' ? 'active' : ''}`} onClick={() => toggleMediaType('image', 'url')}>Enlace URL</button>
                        </div>
                        {mediaType.image === 'file' ? (
                            <label className="custom-file-upload">
                                <input type="file" name="image" accept="image/*" onChange={(e) => handleChange(e, 'file')} />
                                {fileNames.image ? <span className="file-name">{fileNames.image}</span> : 'Seleccionar Imagen'}
                            </label>
                        ) : (
                            <input type="url" name="imageUrl" placeholder="https://..." value={formData.imageUrl} onChange={handleChange} />
                        )}
                    </div>

                    {/* VIDEO INPUT */}
                    <div className="media-group">
                        <label className="media-label">Video Promocional (Opcional)</label>
                        <div className="media-tabs">
                            <button type="button" className={`media-tab ${mediaType.video === 'url' ? 'active' : ''}`} onClick={() => toggleMediaType('video', 'url')}>Enlace URL (YouTube/Vimeo)</button>
                            <button type="button" className={`media-tab ${mediaType.video === 'file' ? 'active' : ''}`} onClick={() => toggleMediaType('video', 'file')}>Subir Archivo</button>
                        </div>
                        {mediaType.video === 'file' ? (
                            <label className="custom-file-upload">
                                <input type="file" name="video" accept="video/*" onChange={(e) => handleChange(e, 'file')} />
                                {fileNames.video ? <span className="file-name">{fileNames.video}</span> : 'Seleccionar Video'}
                            </label>
                        ) : (
                            <input type="url" name="videoUrl" placeholder="https://..." value={formData.videoUrl} onChange={handleChange} />
                        )}
                    </div>



                </div>
            </div>

            <div className="participants-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Participantes del Servicio</h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Define cómo se asignarán los miembros del equipo cuando un cliente contrate este servicio.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <button
                        type="button"
                        className={`btn-secondary ${participantMode === 'all' ? 'active' : ''}`}
                        style={{
                            flex: 1, minWidth: '150px',
                            background: participantMode === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                            color: participantMode === 'all' ? '#fff' : 'var(--text-primary)',
                            borderColor: participantMode === 'all' ? 'var(--primary)' : 'var(--border)',
                            borderRadius: '8px',
                            padding: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => setParticipantMode('all')}
                    >
                        Todos (Equipo completo)
                    </button>
                    <button
                        type="button"
                        className={`btn-secondary ${participantMode === 'fixed' ? 'active' : ''}`}
                        style={{
                            flex: 1, minWidth: '150px',
                            background: participantMode === 'fixed' ? 'var(--primary)' : 'var(--bg-card)',
                            color: participantMode === 'fixed' ? '#fff' : 'var(--text-primary)',
                            borderColor: participantMode === 'fixed' ? 'var(--primary)' : 'var(--border)',
                            borderRadius: '8px',
                            padding: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => setParticipantMode('fixed')}
                    >
                        Elección Fija
                    </button>
                    <button
                        type="button"
                        className={`btn-secondary ${participantMode === 'variable' ? 'active' : ''}`}
                        style={{
                            flex: 1, minWidth: '150px',
                            background: participantMode === 'variable' ? 'var(--primary)' : 'var(--bg-card)',
                            color: participantMode === 'variable' ? '#fff' : 'var(--text-primary)',
                            borderColor: participantMode === 'variable' ? 'var(--primary)' : 'var(--border)',
                            borderRadius: '8px',
                            padding: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => setParticipantMode('variable')}
                    >
                        Elección Variable
                    </button>
                </div>

                {participantMode === 'fixed' && activeTeam && (
                    <div style={{ animation: 'fadeIn 0.3s ease', padding: '1.2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Selecciona qué miembros estarán siempre asignados a este servicio fijo:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem', className: 'custom-scrollbar' }}>
                            {teamMembersDetails.map(member => (
                                <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'var(--bg-card-hover)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: fixedParticipants.includes(member.id) ? '1px solid var(--primary)' : '1px solid var(--border)', boxShadow: fixedParticipants.includes(member.id) ? '0 0 10px rgba(99, 102, 241, 0.15)' : 'none' }} className="member-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={fixedParticipants.includes(member.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFixedParticipants(prev => [...prev, member.id]);
                                            else setFixedParticipants(prev => prev.filter(id => id !== member.id));
                                        }}
                                        style={{ accentColor: 'var(--primary)', width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                            {member.username ? member.username.substring(0, 1).toUpperCase() : '?'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{member.username}</span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>{member.role === 'owner' || member.role === 'founder' ? 'Fundador' : member.role === 'admin' ? 'Admin' : 'Miembro'}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Nvl. {member.level || 1}</span>
                                                {member.id === activeTeam.founderId && member.role !== 'owner' && member.role !== 'founder' && (
                                                    <span style={{ fontSize: '0.75rem', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Fundador</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {fixedParticipants.length === 0 && (
                            <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '1rem 0 0 0' }}>* Debes seleccionar al menos un participante fijo.</p>
                        )}
                    </div>
                )}
                {participantMode === 'all' && (
                    <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.9rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Todos los miembros actuales formarán parte de este servicio.
                    </div>
                )}
                {participantMode === 'variable' && (
                    <div style={{ padding: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', color: '#8b5cf6', fontSize: '0.9rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '6px' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Los participantes se seleccionarán manualmente cada vez que este servicio sea contratado.
                    </div>
                )}
            </div>

            <div className="faq-section">
                <div className="faq-header">
                    <h4>Preguntas Frecuentes</h4>
                    <button type="button" onClick={addFaq} className="btn-add-faq">+ Agregar Pregunta</button>
                </div>
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <input
                            type="text"
                            placeholder="Pregunta"
                            value={faq.question}
                            onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                            className="faq-input"
                        />
                        <textarea
                            placeholder="Respuesta"
                            value={faq.answer}
                            onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                            rows="2"
                            className="faq-textarea"
                        />
                        <button type="button" onClick={() => removeFaq(index)} className="btn-remove-faq">Eliminar</button>
                    </div>
                ))}
            </div>

            <div className="form-actions">
                <button type="submit" className="btn-primary">Publicar Servicio</button>
                <button type="button" onClick={onCancel} className="btn-cancel">Cancelar</button>
            </div>
        </form>
    </div>
);
};

export default CoopServiceCreateForm;
