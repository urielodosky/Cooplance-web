import React, { useState, useEffect } from 'react';
import { useServices } from '../context/ServiceContext';
import { useAuth } from '../../auth/context/AuthContext';
import { processGamificationRules, calculateCommission } from '../../../utils/gamification';
import { serviceCategories } from '../data/categories';
import { locations } from '../data/locations';
import CustomDropdown from '../../../components/common/CustomDropdown';
import '../../../styles/components/ServiceCreateForm.scss';

const ServiceCreateForm = ({ onCancel, initialData }) => {
    const { addService, updateService } = useServices();
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    const handleNextStep = () => { if (currentStep < totalSteps) setCurrentStep(currentStep + 1); };
    const handlePrevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    const [hasPackages, setHasPackages] = useState(initialData?.hasPackages || false);
    const [mediaType, setMediaType] = useState(initialData?.mediaType || { image: 'file', video: 'url' });

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        category: initialData?.category || '',
        subcategory: initialData?.subcategory || [],
        workMode: initialData?.workMode || ['remote'],
        price: initialData?.price || '',
        description: initialData?.description || '',
        deliveryTime: initialData?.deliveryTime || '',
        revisions: initialData?.revisions || '',
        imageUrl: initialData?.image || '',
        videoUrl: initialData?.video || '',
        portfolioUrl: initialData?.portfolioUrl || '',
        location: initialData?.location || '',
        country: initialData?.country || 'Argentina',
        province: initialData?.province || [],
        city: initialData?.city || [],
        paymentMethods: initialData?.paymentMethods || [],
        ...initialData
    });

    const [tags, setTags] = useState(initialData?.tags || []);
    const [tagInput, setTagInput] = useState('');

    const [fileNames, setFileNames] = useState({
        image: initialData?.image ? 'Imagen actual' : '',
        video: initialData?.video ? 'Video actual' : ''
    });

    const [packages, setPackages] = useState(initialData?.packages || {
        basic: { price: '', description: '', deliveryTime: '', revisions: '' },
        standard: { price: '', description: '', deliveryTime: '', revisions: '' },
        premium: { price: '', description: '', deliveryTime: '', revisions: '' }
    });

    const [faqs, setFaqs] = useState(initialData?.faqs || [{ question: '', answer: '' }]);

    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    useEffect(() => {
        if (formData.country === 'Argentina') {
            const fetchProvinces = async () => {
                try {
                    setIsLoadingLoc(true);
                    const res = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=nombre&max=100');
                    const data = await res.json();
                    const names = data.provincias.map(p => p.nombre).sort();
                    setArgProvinces(names);
                } catch (error) {
                    console.error("Error fetching provinces:", error);
                } finally {
                    setIsLoadingLoc(false);
                }
            };
            fetchProvinces();
        }
    }, [formData.country]);

    useEffect(() => {
        if (formData.country === 'Argentina' && formData.province && formData.province.length > 0) {
            const fetchCities = async () => {
                try {
                    setIsLoadingLoc(true);
                    let allCities = [];
                    // Fetch cities for each selected province
                    for (const prov of formData.province) {
                        const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre,provincia.nombre&max=1000`);
                        const data = await res.json();
                        // Append province name to city name to distinguish them when multiple provinces are selected
                        const cityNames = data.localidades.map(m => `${m.nombre} (${m.provincia.nombre})`);
                        allCities = [...allCities, ...cityNames];
                    }

                    const names = [...new Set(allCities)].sort();
                    setArgCities(names);
                } catch (error) {
                    console.error("Error fetching cities:", error);
                } finally {
                    setIsLoadingLoc(false);
                }
            };
            fetchCities();
        } else {
            setArgCities([]);
        }
    }, [formData.province, formData.country]);

    // Helper for Net Earnings
    const calculateNet = (price) => {
        if (!price) return '0.00';
        const num = parseFloat(price);
        // Use user level to calculate commission dynamically
        const rate = calculateCommission(user?.level || 1) / 100;
        return isNaN(num) ? '0.00' : (num * (1 - rate)).toFixed(2);
    };

    const handleLocationChange = (name, value) => {
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // Cascading resets
            if (name === 'country') {
                newData.province = [];
                newData.city = [];
            } else if (name === 'province') {
                // Remove cities that belong to unselected provinces
                if (Array.isArray(prev.province) && Array.isArray(value) && value.length < prev.province.length) {
                    const removedProv = prev.province.find(p => !value.includes(p));
                    if (removedProv && Array.isArray(newData.city)) {
                        newData.city = newData.city.filter(c => !c.endsWith(`(${removedProv})`));
                    }
                }
            }
            return newData;
        });
    };

    const getProvinces = () => {
        if (formData.country === 'Argentina') return argProvinces;
        return formData.country && locations[formData.country] ? Object.keys(locations[formData.country]) : [];
    };

    const getCities = () => {
        if (formData.country === 'Argentina') return argCities;
        return formData.country && formData.province && locations[formData.country][formData.province] ? locations[formData.country][formData.province] : [];
    };

    const handleCategoryChange = (val) => {
        setFormData(prev => ({ ...prev, category: val, subcategory: [] }));
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
        if (field === 'price') {
            const val = parseFloat(value);
            if (val < 0) {
                setPackages(prev => ({
                    ...prev,
                    [tier]: { ...prev[tier], [field]: '0' }
                }));
                return;
            }
        }
        setPackages(prev => ({
            ...prev,
            [tier]: { ...prev[tier], [field]: value }
        }));
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

    const handleNextOrSubmit = (e) => {
        e.preventDefault();

        // Native HTML5 validation will have already passed if we are here.
        if (currentStep === 3) {
            const hasEmptyFaqs = faqs.some(f => !f.question.trim() || !f.answer.trim());
            if (hasEmptyFaqs) {
                alert('Por favor, completa todas las preguntas y respuestas frecuentes (o elimínalas si están vacías).');
                return;
            }
        }

        if (currentStep < totalSteps) {
            handleNextStep();
            return;
        }

        const finalServiceData = {
            ...formData,
            id: initialData?.id || Date.now(),
            price: hasPackages ? packages.basic.price : formData.price,
            tags: tags,
            packages: hasPackages ? packages : null,
            hasPackages: hasPackages,
            faqs: faqs.filter(f => f.question && f.answer),
            freelancerId: user.id,
            freelancerName: initialData?.freelancerName || user.firstName || user.username || user.companyName,
            level: initialData?.level || user.level || 1,
            image: formData.imageUrl,
            video: formData.videoUrl,
            mediaType: mediaType,
            level: initialData?.level || user.level || 1,
            image: formData.imageUrl,
            video: formData.videoUrl,
            mediaType: mediaType,
            date: initialData?.date || new Date().toISOString(),
            country: formData.country,
            province: formData.province,
            city: formData.city,
            location: formData.workMode.includes('presential')
                ? `${formData.city}, ${formData.province}, ${formData.country}`
                : 'Remoto',
            paymentMethods: (formData.paymentMethods && formData.paymentMethods.length > 0)
                ? formData.paymentMethods.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
                : null // Null implies "All/Default"
        };

        if (initialData) {
            updateService(finalServiceData);
            alert('¡Servicio actualizado con éxito!');
        } else {
            addService(finalServiceData);
            alert('¡Servicio publicado con éxito!');
        }
        onCancel();
    };

    const showSchedule = ['Coaching y Tutorias', 'Crecimiento Personal y Pasatiempos'].includes(formData.category);
    const showFileFormats = ['Artes Gráficas y Diseño', 'Video y Animación', 'Música y Audio'].includes(formData.category);

    return (
        <div className="glass service-form-container">
            <h3>Nuevo Servicio {initialData ? '(Edición)' : ''}</h3>

            <div className="step-indicator">
                {[1, 2, 3, 4].map(step => (
                    <div key={step} className={`step-dot ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}>
                        {step}
                    </div>
                ))}
            </div>

            <form onSubmit={handleNextOrSubmit} className="service-form mt-4">

                {currentStep === 1 && (
                    <div className="step-content form-step-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h4>Paso 1: Información Básica y Precios</h4>

                        <div className="form-group">
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Título del Servicio</label>
                            <input type="text" name="title" placeholder="Ej. Diseño de logo profesional" value={formData.title} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Descripción Detallada</label>
                            <textarea name="description" placeholder="Describe qué incluye y qué ofreces en este servicio" rows="5" value={formData.description || ''} onChange={handleChange} required />
                        </div>

                        <div className="form-group tags-input-container">
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Etiquetas (Presiona Enter)</label>
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
                                        placeholder={tags.length === 0 ? "Ej: logo, diseño, branding" : ""}
                                        className="tag-input-field"
                                    />
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                <span className="tags-help">Mejora tu visibilidad en las búsquedas</span>
                                <span style={{ fontSize: '0.8rem', color: tags.length >= 5 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                    {tags.length}/5
                                </span>
                            </div>
                        </div>

                        {/* CATEGORY SELECTION */}
                        <div className="form-group category-section" style={{ marginBottom: 0 }}>
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Categoría del Servicio</label>
                            <div style={{ marginBottom: '1rem' }}>
                                <CustomDropdown
                                    options={Object.keys(serviceCategories).map(cat => ({ label: cat, value: cat }))}
                                    value={formData.category}
                                    onChange={handleCategoryChange}
                                    placeholder="Selecciona una Categoría Principal"
                                />
                            </div>

                            {/* SUBCATEGORY GRID */}
                            {formData.category && (
                                <div className="subcategory-wrapper">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label className="category-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                                            Especialidad en {formData.category}
                                        </label>
                                        <span style={{ fontSize: '0.8rem', color: (formData.subcategory?.length || 0) >= 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
                                            {(formData.subcategory?.length || 0)}/3 Seleccionadas
                                        </span>
                                    </div>

                                    <div className="category-grid">
                                        {serviceCategories[formData.category].map(sub => {
                                            const isSelected = Array.isArray(formData.subcategory)
                                                ? formData.subcategory.includes(sub)
                                                : formData.subcategory === sub;

                                            return (
                                                <div
                                                    key={sub}
                                                    className={`category-option ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        const current = Array.isArray(formData.subcategory) ? formData.subcategory : [];
                                                        let newSubs;
                                                        if (current.includes(sub)) {
                                                            newSubs = current.filter(s => s !== sub);
                                                        } else {
                                                            if (current.length >= 3) return; // Limit reached
                                                            newSubs = [...current, sub];
                                                        }
                                                        handleSelectOption('subcategory', newSubs);
                                                    }}
                                                >
                                                    {sub}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(formData.subcategory?.length || 0) === 0 && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem' }}>
                                            * Selecciona al menos una especialidad antes de continuar.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group pricing-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div className="packages-toggle" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    id="usePackages"
                                    checked={hasPackages}
                                    onChange={(e) => setHasPackages(e.target.checked)}
                                    style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                                />
                                <label htmlFor="usePackages" style={{ fontWeight: 500, fontSize: '1.05rem', cursor: 'pointer' }}>Activar Paquetes (Básico, Estándar, Premium)</label>
                            </div>

                            {hasPackages ? (
                                <div className="packages-grid">
                                    {['basic', 'standard', 'premium'].map(tier => (
                                        <div key={tier} className="package-column">
                                            <h5 style={{ textTransform: 'capitalize', textAlign: 'center', marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                                {tier === 'basic' ? 'Básico' : tier === 'standard' ? 'Estándar' : 'Premium'}
                                            </h5>

                                            <div className="package-field">
                                                <label>Precio</label>
                                                <div className="price-input-wrapper">
                                                    <input
                                                        type="number"
                                                        min="100"
                                                        value={packages[tier].price}
                                                        onChange={(e) => handlePackageChange(tier, 'price', e.target.value)}
                                                        required
                                                    />
                                                    <span className="currency-badge">ARS</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    Recibes: ${calculateNet(packages[tier].price)}
                                                </div>
                                            </div>
                                            <div className="package-field">
                                                <label>Entrega (días)</label>
                                                <input type="number" min="1" value={packages[tier].deliveryTime} onChange={(e) => handlePackageChange(tier, 'deliveryTime', e.target.value)} required />
                                            </div>
                                            <div className="package-field">
                                                <label style={{ display: 'flex', alignItems: 'center' }}>
                                                    Revisiones
                                                    <div className="help-icon-wrapper">
                                                        <div className="help-icon">?</div>
                                                        <div className="help-tooltip">
                                                            Cantidad de veces que se permiten modificaciones o arreglos una vez entregado el servicio.
                                                        </div>
                                                    </div>
                                                </label>
                                                <input type="number" value={packages[tier].revisions} onChange={(e) => handlePackageChange(tier, 'revisions', e.target.value)} required />
                                            </div>
                                            <div className="package-field">
                                                <label>Resumen de entregable</label>
                                                <textarea rows="3" value={packages[tier].description} onChange={(e) => handlePackageChange(tier, 'description', e.target.value)} required />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="form-row-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                                        <div>
                                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Precio</label>
                                            <div className="price-input-wrapper">
                                                <input type="number" name="price" min="100" placeholder="Ej: 5000" value={formData.price || ''} onChange={handleChange} required />
                                                <span className="currency-badge">ARS</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                Recibes: ${calculateNet(formData.price || 0)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Entrega (Días)</label>
                                            <input type="number" name="deliveryTime" min="1" placeholder="Ej: 3" value={formData.deliveryTime || ''} onChange={handleChange} required style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                                                <label className="work-mode-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Revisiones</label>
                                                <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', overflow: 'visible' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '16px', height: '16px', borderRadius: '50%',
                                                        border: '1.5px solid var(--text-muted)', color: 'var(--text-muted)',
                                                        fontSize: '10px', fontWeight: 700, lineHeight: 1, flexShrink: 0
                                                    }}>?</span>
                                                    <div style={{
                                                        position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
                                                        padding: '0.5rem 0.8rem', background: '#0f172a',
                                                        color: '#fff', fontSize: '0.75rem', borderRadius: '6px', width: '200px',
                                                        textAlign: 'center', zIndex: 9999, opacity: 0, visibility: 'hidden',
                                                        transition: 'all 0.2s', border: '1px solid var(--border)',
                                                        boxShadow: '0 8px 20px rgba(0,0,0,0.4)', pointerEvents: 'none',
                                                        whiteSpace: 'normal'
                                                    }} className="tooltip-text">
                                                        Cantidad de veces que se permiten modificaciones una vez entregado el servicio.
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="number" name="revisions" placeholder="Ej: 2" value={formData.revisions || ''} onChange={handleChange} required style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* WORK MODE SELECTION */}
                        <div className="form-group work-mode-section">
                            <label className="work-mode-label" style={{ marginBottom: '0.8rem', display: 'block', fontSize: '1.05rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>Modalidad de Trabajo</label>
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
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                    </div>
                                    <span>Presencial</span>
                                </div>
                            </div>
                        </div>

                        {formData.workMode.includes('presential') && (
                            <div className="form-group location-fields" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <label className="work-mode-label" style={{ marginBottom: 0 }}>Ubicación Física del Servicio</label>
                                    <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', overflow: 'visible' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '16px', height: '16px', borderRadius: '50%',
                                            border: '1.5px solid var(--text-muted)', color: 'var(--text-muted)',
                                            fontSize: '10px', fontWeight: 700, lineHeight: 1, flexShrink: 0
                                        }}>?</span>
                                        <div className="tooltip-text" style={{
                                            position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
                                            padding: '0.5rem 0.8rem', background: '#0f172a',
                                            color: '#fff', fontSize: '0.75rem', borderRadius: '6px', width: '220px',
                                            textAlign: 'center', zIndex: 9999, opacity: 0, visibility: 'hidden',
                                            transition: 'all 0.2s', border: '1px solid var(--border)',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.4)', pointerEvents: 'none', whiteSpace: 'normal'
                                        }}>
                                            Podes elegir hasta 3 provincias y hasta 5 ciudades por provincia. Seleccioná una provincia y se desplegará su selector de ciudades.
                                        </div>
                                    </div>
                                    <style>{`.tooltip-container:hover .tooltip-text { opacity: 1 !important; visibility: visible !important; }`}</style>
                                </div>

                                {/* Province selector - single dropdown */}
                                {(!formData.province || formData.province.length < 3) && (
                                    <CustomDropdown
                                        options={getProvinces()
                                            .filter(p => !formData.province?.includes(p))
                                            .map(prov => ({ label: prov, value: prov }))}
                                        value={null}
                                        onChange={(val) => {
                                            if (val && (!formData.province || !formData.province.includes(val))) {
                                                handleLocationChange('province', [...(formData.province || []), val]);
                                            }
                                        }}
                                        placeholder={`+ Agregar provincia (${formData.province?.length || 0}/3)`}
                                        searchable={true}
                                    />
                                )}

                                {/* One row per selected province with city selector next to it */}
                                {formData.province && formData.province.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                        {formData.province.map(prov => {
                                            const provCities = (formData.city || []).filter(c => c.endsWith(`(${prov})`));
                                            const provCityOptions = argCities
                                                .filter(c => c.endsWith(`(${prov})`))
                                                .map(c => ({ label: c.replace(` (${prov})`, ''), value: c }));
                                            return (
                                                <div key={prov} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', alignItems: 'start' }}>
                                                    {/* Province name & remove button */}
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                                    <circle cx="12" cy="10" r="3"></circle>
                                                                </svg>
                                                                {prov}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLocationChange('province', formData.province.filter(p => p !== prov))}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', transition: 'color 0.2s' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                                title="Quitar provincia"
                                                            >
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                            </button>
                                                        </div>
                                                        {/* City chips for this province */}
                                                        {provCities.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                                {provCities.map(city => (
                                                                    <span key={city} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--text-primary)', padding: '0.25rem 0.55rem', borderRadius: '100px', fontSize: '0.75rem' }}>
                                                                        {city.replace(` (${prov})`, '')}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleLocationChange('city', (formData.city || []).filter(c => c !== city))}
                                                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', display: 'flex', transition: 'color 0.2s' }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                                        >
                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* City selector for this province */}
                                                    <div>
                                                        {isLoadingLoc ? (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Cargando ciudades...</span>
                                                        ) : (
                                                            <CustomDropdown
                                                                options={provCityOptions.filter(co => !provCities.includes(co.value))}
                                                                value={provCities}
                                                                onChange={(val) => {
                                                                    const otherCities = (formData.city || []).filter(c => !c.endsWith(`(${prov})`));
                                                                    handleLocationChange('city', [...otherCities, ...val]);
                                                                }}
                                                                placeholder={`Ciudad de ${prov.split(' ')[0]}... (Max 5)`}
                                                                searchable={true}
                                                                multiple={true}
                                                                maxSelections={5}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {(showSchedule || showFileFormats) && (
                            <div className="form-row-2 form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                {showSchedule && (
                                    <>
                                        <div>
                                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>Días Disponibles</label>
                                            <input type="text" name="availableDays" placeholder="Ej. Lun-Vie 9hs a 18hs" value={formData.availableDays || ''} onChange={handleChange} />
                                        </div>
                                        <div>
                                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>Horas por sesión</label>
                                            <input type="text" name="hours" placeholder="Ej. 1 hora por encuentro" value={formData.hours || ''} onChange={handleChange} />
                                        </div>
                                    </>
                                )}
                                {showFileFormats && (
                                    <div style={{ gridColumn: showSchedule ? 'auto' : '1 / -1' }}>
                                        <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem' }}>Formatos de Entrega</label>
                                        <input type="text" name="fileFormats" placeholder="Ej. AI, PDF, JPG, PNG" value={formData.fileFormats || ''} onChange={handleChange} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* END OF STEP 1 */}
                    </div>
                )}

                {/* STEP 2: MULTIMEDIA */}
                {currentStep === 2 && (
                    <div className="step-content form-step-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h4>Paso 2: Multimedia</h4>
                        <div className="media-section" style={{ marginTop: '0' }}>
                            <div className="media-inputs">
                                {/* IMAGE INPUT */}
                                <div className="media-group">
                                    <label className="media-label">Imagen de Portada (Opcional)</label>
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
                    </div>
                )}

                {/* STEP 3: FAQ */}
                {currentStep === 3 && (
                    <div className="step-content form-step-3" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="faq-header" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0 }}>Paso 3: Preguntas Frecuentes</h4>
                            <button type="button" onClick={addFaq} className="btn-add-faq" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border)' }}>+ Agregar Pregunta</button>
                        </div>
                        <div className="faq-section" style={{ marginTop: '0' }}>
                            {faqs.map((faq, index) => (
                                <div key={index} className="faq-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Pregunta (Ej. ¿Qué incluye este servicio?)"
                                        value={faq.question}
                                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                        className="faq-input"
                                        style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    />
                                    <textarea
                                        placeholder="Respuesta"
                                        value={faq.answer}
                                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                        rows="2"
                                        className="faq-textarea"
                                        style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }}
                                    />
                                    <button type="button" onClick={() => removeFaq(index)} className="btn-remove-faq" style={{ color: '#ff6b6b', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 0' }}>Eliminar Pregunta</button>
                                </div>
                            ))}
                            {faqs.length === 0 && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>Añadir preguntas ayuda a tus clientes a decidir más rápido.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 4: PAYMENTS */}
                {currentStep === 4 && (
                    <div className="step-content form-step-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h4>Paso 4: Pagos y Publicación</h4>
                        <div className="payment-methods-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '1.1rem' }}>Métodos de Pago Aceptados</label>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Selecciona los métodos que aceptas para este servicio. Si no seleccionas ninguno, se asumirá que aceptas <strong>todos</strong> los configurados en tu billetera.
                            </p>
                            <div className="checkbox-group" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'paypal', label: 'PayPal' },
                                    { id: 'mercadopago', label: 'Mercado Pago' },
                                    { id: 'binance', label: 'Binance Pay' },
                                    { id: 'card', label: 'Tarjeta (Plataforma)' }
                                ].map(method => (
                                    <label key={method.id} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                                            style={{ accentColor: 'var(--primary)', width: '20px', height: '20px' }}
                                        />
                                        <span style={{ fontWeight: '500' }}>{method.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    {currentStep > 1 && (
                        <button type="button" onClick={handlePrevStep} className="btn-cancel" style={{ padding: '0.8rem 1.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                            Anterior
                        </button>
                    )}

                    {currentStep < totalSteps ? (
                        <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2.5rem', fontWeight: 'bold' }}>
                            Siguiente
                        </button>
                    ) : (
                        <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2.5rem', fontWeight: 'bold' }}>
                            {initialData ? 'Actualizar Servicio' : 'Publicar Servicio'}
                        </button>
                    )}

                    <button type="button" onClick={onCancel} className="btn-cancel" style={{ marginLeft: 'auto', padding: '0.8rem 1.5rem' }}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ServiceCreateForm;
