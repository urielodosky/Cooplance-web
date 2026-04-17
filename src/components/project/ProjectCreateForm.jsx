import React, { useState, useEffect } from 'react';
import CustomDropdown from '../common/CustomDropdown';
import CustomDatePicker from '../common/CustomDatePicker';
import '../../styles/components/ProjectCreateForm.scss';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { serviceCategories } from '../../features/services/data/categories';
import { locations } from '../../features/services/data/locations';
import { supabase } from '../../lib/supabase';
import { createProject } from '../../lib/projectService';
import { getArgentinaProvinces, getArgentinaCities } from '../../utils/locationUtils';

const ProjectCreateForm = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Get current user

    // Get today's date in local YYYY-MM-DD format
    const minDate = new Date().toLocaleDateString('en-CA');

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [formError, setFormError] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budgetType: 'fixed', // or 'range'
        budget: '',
        deadline: '',
        executionTime: '',
        imageUrl: '',
        subcategories: [], // Array of selected subcategories
        specialties: [], // Array of selected specialties
        vacancies: 1,
        paymentFrequency: 'unique',
        contractDuration: '',
        commissionPercentage: '',
        workMode: ['remote'], // Array for multi-select
        country: 'Argentina',
        province: '', // Changed to string for single selection
        city: '', // Changed to string for single selection
        location: '',
        paymentMethods: [],
        contractDurationType: 'unique', // 'unique', 'days', 'weeks', 'months', 'years'
        contractDurationValue: '',
        contractStartDate: ''
    });

    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    useEffect(() => {
        if (formData.country === 'Argentina') {
            const fetchProvinces = async () => {
                setIsLoadingLoc(true);
                const provinces = await getArgentinaProvinces();
                setArgProvinces(provinces);
                setIsLoadingLoc(false);
            };
            fetchProvinces();
        }
    }, [formData.country]);

    useEffect(() => {
        if (formData.country === 'Argentina' && formData.province) {
            const fetchCities = async () => {
                setIsLoadingLoc(true);
                // In ProjectCreateForm, province is a string. We handle it safely.
                const provinces = Array.isArray(formData.province) ? formData.province : [formData.province];
                let allCities = [];
                for (const prov of provinces) {
                    if (!prov) continue;
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
    }, [formData.province, formData.country]);

    const [faqs, setFaqs] = useState([{ question: '', answer: '' }]);

    // Step 5: Pre-interview Questions (for companies)
    const [questions, setQuestions] = useState([
        { id: Date.now(), text: '', type: 'text', options: [''] }
    ]);

    const [mediaType, setMediaType] = useState({ image: 'file', video: 'url' });
    const [fileNames, setFileNames] = useState({ image: '', video: '' });

    const handleChange = (e, type = 'text') => {
        if (type === 'file') {
            const file = e.target.files[0];
            if (file) {
                const mockUrl = URL.createObjectURL(file);
                const fieldName = e.target.name === 'image' ? 'imageUrl' : 'videoUrl';
                setFormData(prev => ({ ...prev, [fieldName]: mockUrl }));
                setFileNames(prev => ({ ...prev, [e.target.name]: file.name }));
                
                if (e.target.name === 'image') setImageFile(file);
                if (e.target.name === 'video') setVideoFile(file);
            }
        } else {
            const { name, value } = e.target;

            setFormData(prev => {
                const updates = { [name]: value };
                // Mutual exclusivity logic only for clients
                if (user?.role !== 'company') {
                    if (name === 'deadline' && value) updates.executionTime = '';
                    if (name === 'executionTime' && value) updates.deadline = '';
                }
                return { ...prev, ...updates };
            });
        }
    };

    const toggleMediaType = (field, type) => {
        setMediaType(prev => ({ ...prev, [field]: type }));
    };

    const handleDropdownChange = (name, value) => {
        if (name === 'category') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                subcategories: [],
                specialties: []
            }));
        } else if (name === 'contractDurationType') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                // Clear all duration values when switching types to prevent stale data
                executionTime: '',
                contractDurationValue: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubcategoryToggle = (sub) => {
        setFormData(prev => {
            const current = prev.subcategories || [];
            if (current.includes(sub)) {
                const newSubs = current.filter(s => s !== sub);
                // Also remove specialties belonging to this sub
                const subSpecialties = serviceCategories[prev.category]?.[sub] || [];
                const newSpecs = (prev.specialties || []).filter(spec => !subSpecialties.includes(spec));
                return { ...prev, subcategories: newSubs, specialties: newSpecs };
            } else {
                if (current.length >= 3) return prev; // Max 3
                return { ...prev, subcategories: [...current, sub] };
            }
        });
    };

    const handleSpecialtyToggle = (spec) => {
        setFormData(prev => {
            const current = prev.specialties || [];
            if (current.includes(spec)) {
                return { ...prev, specialties: current.filter(s => s !== spec) };
            } else {
                if (current.length >= 5) return prev; // Max 5 specialties
                return { ...prev, specialties: [...current, spec] };
            }
        });
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
    };

    // --- Questions Logic (Step 5) ---
    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now(), text: '', type: 'text', options: [''] }]);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index, field, value) => {
        const newQs = [...questions];
        if (field === 'type') {
            // Reset options if switching type
            newQs[index].type = value;
            newQs[index].options = value === 'multiple' ? ['', ''] : [''];
        } else {
            newQs[index][field] = value;
        }
        setQuestions(newQs);
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
        const newQs = [...questions];
        newQs[qIndex].options[optIndex] = value;
        setQuestions(newQs);
    };

    const addOption = (qIndex) => {
        const newQs = [...questions];
        newQs[qIndex].options.push('');
        setQuestions(newQs);
    };

    const removeOption = (qIndex, optIndex) => {
        const newQs = [...questions];
        newQs[qIndex].options = newQs[qIndex].options.filter((_, i) => i !== optIndex);
        setQuestions(newQs);
    };

    // Location & Mode Logic
    const handleModeSelect = (mode) => {
        let newModes;
        if (user?.role === 'company') {
            if (formData.workMode.includes(mode)) {
                newModes = formData.workMode.filter(m => m !== mode);
                if (newModes.length === 0) newModes = [mode]; // Keep at least one
            } else {
                newModes = [...formData.workMode, mode];
            }
        } else {
            newModes = [mode];
        }
        setFormData(p => ({ ...p, workMode: newModes }));
    };

    const handleLocationChange = (name, value) => {
        if (name?.target) {
            // Native Event (country select)
            const { name: fieldName, value: fieldValue } = name.target;
            setFormData(prev => ({
                ...prev,
                [fieldName]: fieldValue,
                province: '',
                city: ''
            }));
        } else {
            // Custom Call
            setFormData(prev => ({
                ...prev,
                [name]: value,
                // If country changes, reset province and city
                ...(name === 'country' ? { province: '', city: '' } : {}),
                // If province changes, reset city
                ...(name === 'province' ? { city: '' } : {})
            }));
        }
    };

    const getProvinces = () => {
        if (formData.country === 'Argentina') return argProvinces;
        return formData.country && locations[formData.country] ? Object.keys(locations[formData.country]) : [];
    };

    const getCities = () => {
        if (formData.country === 'Argentina') return argCities;
        if (formData.country && formData.province && locations[formData.country]) {
            return locations[formData.country][formData.province] || [];
        }
        return [];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        // Enhanced Validation
        if (!formData.budget || Number(formData.budget) < 1000) {
            alert('El presupuesto debe ser mayor o igual a $1000 ARS.');
            return;
        }

        if (!formData.paymentFrequency) {
            alert('Debes seleccionar una frecuencia de pago.');
            return;
        }

        if (user?.role === 'company' && (!formData.vacancies || Number(formData.vacancies) < 1)) {
            alert('La cantidad de vacantes debe ser al menos 1.');
            return;
        }

        if (formData.deadline && formData.deadline < minDate) {
            alert('La fecha límite no puede ser anterior a hoy.');
            return;
        }

        if (!user) {
            setFormError('Debes iniciar sesión para publicar un proyecto.');
            return;
        }

        setIsSubmitting(true);
        setFormError('');
        setLoadingStatus('Iniciando...');

        try {
            let finalImageUrl = formData.imageUrl;
            let finalVideoUrl = formData.videoUrl;

            // Upload Image if present
            if (mediaType.image === 'file' && imageFile) {
                setLoadingStatus('Subiendo imagen...');
                const ext = imageFile.name.split('.').pop();
                const fileName = `projects/${user.id}/${Date.now()}_img.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('service-media')
                    .upload(fileName, imageFile);
                
                if (!uploadErr) {
                    const { data: { publicUrl } } = supabase.storage.from('service-media').getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                }
            }

            // Upload Video if present
            if (mediaType.video === 'file' && videoFile) {
                setLoadingStatus('Subiendo video...');
                const ext = videoFile.name.split('.').pop();
                const fileName = `projects/${user.id}/${Date.now()}_vid.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('service-media')
                    .upload(fileName, videoFile);
                
                if (!uploadErr) {
                    const { data: { publicUrl } } = supabase.storage.from('service-media').getPublicUrl(fileName);
                    finalVideoUrl = publicUrl;
                }
            }

            setLoadingStatus('Guardando proyecto...');
            const projectData = {
                ...formData,
                clientId: user.id,
                clientName: user.role === 'company' ? user.company_name : `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                clientAvatar: user.avatar_url,
                clientRole: user.role,

                status: 'open',
                imageUrl: finalImageUrl,
                videoUrl: finalVideoUrl,
                faqs: faqs.filter(f => f.question && f.answer),
                questions: user?.role === 'company' ? questions.filter(q => q.text.trim() !== '') : [],
                location: formData.workMode.includes('presential')
                    ? (Array.isArray(formData.city) && formData.city.length > 0 ? formData.city.join(' / ') + `, ${formData.country}` : formData.country)
                    : 'Remoto',
                paymentMethods: (formData.paymentMethods && formData.paymentMethods.length > 0)
                    ? formData.paymentMethods.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
                    : null
            };

            // Consolidate contract duration
            if (formData.contractDurationType !== 'unique' && formData.contractDurationValue) {
                projectData.contractDuration = `${formData.contractDurationValue} ${formData.contractDurationType}`;
            } else {
                projectData.contractDuration = 'Pago único';
            }

            console.log('[ProjectCreateForm] Sending project data:', projectData);
            await createProject(projectData);

            setLoadingStatus('¡Listo!');
            
            setTimeout(() => {
                navigate('/explore-clients');
            }, 1500);

        } catch (err) {
            console.error('Error saving project:', err);
            const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setFormError(`Hubo un error al publicar el pedido: ${errorMessage}`);
            setIsSubmitting(false);
        }

    };

    const handleNextOrSubmit = (e) => {
        e.preventDefault();

        // Step validation warnings
        const maxSteps = user?.role === 'company' ? 4 : 3;

        if (currentStep === maxSteps) {
            if (user?.role === 'company') {
                const invalidQuestion = questions.some(q => q.text.trim() === '' || (q.type === 'multiple' && q.options.some(opt => opt.trim() === '')));
                if (invalidQuestion && questions.length > 1) {
                    const confirmOptions = window.confirm('Hay preguntas o respuestas vacías. ¿Deseas publicarlo de todos modos? Las preguntas vacías se eliminarán.');
                    if (!confirmOptions) return;
                }
            }
            handleSubmit(e);
            return;
        }
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="glass project-form-container">
            <h3>{user?.role === 'company' ? 'Publicar Oferta Laboral' : 'Publicar un Proyecto'} {initialData ? '(Edición)' : ''}</h3>
            <p className="subtitle">
                {user?.role === 'company' 
                    ? 'Atrae al mejor talento completando los detalles de tu vacante.' 
                    : 'Define tu proyecto y el profesional ideal se pondrá en contacto.'}
            </p>

            <div className="step-indicator">
                {(user?.role === 'company' ? [1, 2, 3, 4] : [1, 2, 3]).map(step => (
                    <div 
                        key={step} 
                        className={`step-dot ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
                    >
                        {step}
                    </div>
                ))}
            </div>

            <form onSubmit={handleNextOrSubmit} className="project-form" style={{ position: 'relative' }}>
                {formError && (
                    <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
                        {formError}
                    </div>
                )}

                {/* STEP 1: Información Básica y Precios */}
                {currentStep === 1 && (
                    <div className="step-content form-step-1">
                        <div className="premium-form-section">
                            <h4>Conceptos Básicos</h4>

                            <div className="form-group">
                                <label className="work-mode-label">Título del Proyecto / Oferta</label>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Ej. Diseño de sitio web e-commerce"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="work-mode-label">Descripción Detallada</label>
                                <textarea
                                    name="description"
                                    placeholder="Describe las metas, responsabilidades y requisitos del proyecto..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="10"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="work-mode-label">Modalidad de Trabajo</label>
                                <div className="work-mode-options">
                                    <div 
                                        className={`mode-option remote ${formData.workMode.includes('remote') ? 'active' : ''}`}
                                        onClick={() => handleModeSelect('remote')}
                                    >
                                        Remoto
                                    </div>
                                    <div 
                                        className={`mode-option presential ${formData.workMode.includes('presential') ? 'active' : ''}`}
                                        onClick={() => handleModeSelect('presential')}
                                    >
                                        Presencial
                                    </div>
                                </div>
                            </div>

                            {formData.workMode.includes('presential') && (
                                <div className="form-group fade-in" style={{ marginTop: '1rem' }}>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem' }}>País</label>
                                            <CustomDropdown
                                                options={Object.keys(locations).map(country => ({ label: country, value: country }))}
                                                value={formData.country}
                                                onChange={(val) => handleLocationChange('country', val)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem' }}>Provincia</label>
                                            <CustomDropdown
                                                options={getProvinces().map(prov => ({ label: prov, value: prov }))}
                                                value={formData.province}
                                                onChange={(val) => handleLocationChange('province', val)}
                                                placeholder="Seleccionar..."
                                                disabled={!formData.country}
                                                searchable={true}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label style={{ fontSize: '0.85rem' }}>Ciudad</label>
                                        <CustomDropdown
                                            options={getCities().map(city => ({ label: city, value: city }))}
                                            value={formData.city}
                                            onChange={(val) => handleLocationChange('city', val)}
                                            placeholder="Seleccionar..."
                                            disabled={!formData.province || isLoadingLoc}
                                            searchable={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="premium-form-section" style={{ marginTop: '2rem' }}>
                            <h4>Presupuesto y Tiempos</h4>
                            
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="work-mode-label">Tipo de Presupuesto</label>
                                    <CustomDropdown
                                        options={[
                                            { value: 'fixed', label: 'Estimado Fijo' },
                                            { value: 'negotiable', label: 'Variable (Ofertable)' }
                                        ]}
                                        value={formData.budgetType}
                                        onChange={(val) => handleDropdownChange('budgetType', val)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="work-mode-label">Frecuencia de Pago</label>
                                    <CustomDropdown
                                        options={[
                                            { value: 'unique', label: 'Pago Único' },
                                            { value: 'daily', label: 'Diario' },
                                            { value: 'weekly', label: 'Semanal' },
                                            { value: 'monthly', label: 'Mensual' }
                                        ]}
                                        value={formData.paymentFrequency || 'unique'}
                                        onChange={(val) => handleDropdownChange('paymentFrequency', val)}
                                    />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="work-mode-label">Presupuesto Estimado ($)</label>
                                    <div className="price-input-wrapper">
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            required
                                            min="1000"
                                            placeholder="Mínimo 1000"
                                        />
                                        <span className="currency-badge">ARS</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="work-mode-label">Plazo de Ejecución</label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1.5 }}>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'unique', label: 'Única vez' },
                                                    { value: 'days', label: 'Días' },
                                                    { value: 'weeks', label: 'Semanas' },
                                                    { value: 'months', label: 'Meses' },
                                                    { value: 'years', label: 'Años' }
                                                ]}
                                                value={formData.contractDurationType || 'unique'}
                                                onChange={(val) => handleDropdownChange('contractDurationType', val)}
                                            />
                                        </div>
                                        {formData.contractDurationType && formData.contractDurationType !== 'unique' && (
                                            <div style={{ flex: 1 }} className="fade-in">
                                                <input
                                                    type="number"
                                                    name="contractDurationValue"
                                                    value={formData.contractDurationValue}
                                                    onChange={handleChange}
                                                    placeholder="Cant."
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="work-mode-label">Fecha de Inicio Estimada</label>
                                    <CustomDatePicker
                                        selectedDate={formData.contractStartDate}
                                        onChange={(date) => setFormData(prev => ({ ...prev, contractStartDate: date }))}
                                        placeholder="Seleccionar fecha"
                                        minDate={minDate}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="work-mode-label">Fecha Límite (Deadline)</label>
                                    <CustomDatePicker
                                        selectedDate={formData.deadline}
                                        onChange={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                                        placeholder="Seleccionar límite"
                                        minDate={formData.contractStartDate || minDate}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="work-mode-label">Métodos de Pago Preferidos</label>
                                <div className="category-grid">
                                    {[
                                        { id: 'bank', label: 'Transferencia Bancaria' },
                                        { id: 'mercadopago', label: 'Mercado Pago' },
                                        { id: 'usdt', label: 'USDT (Cripto)' },
                                        { id: 'paypal', label: 'PayPal (USD)' },
                                        { id: 'cash', label: 'Efectivo' }
                                    ].map(method => (
                                        <div 
                                            key={method.id}
                                            className={`category-option ${formData.paymentMethods.includes(method.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                const current = formData.paymentMethods || [];
                                                const newMethods = current.includes(method.id) 
                                                    ? current.filter(m => m !== method.id)
                                                    : [...current, method.id];
                                                setFormData({ ...formData, paymentMethods: newMethods });
                                            }}
                                        >
                                            {method.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: MULTIMEDIA */}
                {currentStep === 2 && (
                    <div className="step-content form-step-2 fade-in">
                        <div className="premium-form-section">
                            <h4>Material Multimedia</h4>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem', marginBottom: '1.5rem' }}>Adjunta una imagen representativa y un video para captar la atención de los profesionales.</p>

                            <div className="form-group">
                                <label className="work-mode-label">Imagen Destacada</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <button type="button" onClick={() => toggleMediaType('image', 'file')} className={`category-option ${mediaType.image === 'file' ? 'selected' : ''}`} style={{ flex: 1 }}>Subir Archivo</button>
                                    <button type="button" onClick={() => toggleMediaType('image', 'url')} className={`category-option ${mediaType.image === 'url' ? 'selected' : ''}`} style={{ flex: 1 }}>URL de Imagen</button>
                                </div>
                                {mediaType.image === 'file' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                        <input type="file" name="image" accept="image/*" onChange={(e) => handleChange(e, 'file')} style={{ display: 'none' }} id="img-upload" />
                                        <label htmlFor="img-upload" style={{ cursor: 'pointer', background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '8px', color: 'white', fontWeight: 600 }}>Seleccionar Imagen</label>
                                        <span style={{ color: 'var(--text-secondary)' }}>{fileNames.image || 'Sin archivo seleccionado (JPG/PNG)'}</span>
                                    </div>
                                ) : (
                                    <input type="text" name="imageUrl" placeholder="Enlace de imagen (ej. https://...)" value={formData.imageUrl} onChange={handleChange} />
                                )}
                            </div>

                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="work-mode-label">Video de Presentación</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <button type="button" onClick={() => toggleMediaType('video', 'file')} className={`category-option ${mediaType.video === 'file' ? 'selected' : ''}`} style={{ flex: 1 }}>Subir Archivo</button>
                                    <button type="button" onClick={() => toggleMediaType('video', 'url')} className={`category-option ${mediaType.video === 'url' ? 'selected' : ''}`} style={{ flex: 1 }}>YouTube / Vimeo URL</button>
                                </div>
                                {mediaType.video === 'file' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                        <input type="file" name="video" accept="video/*" onChange={(e) => handleChange(e, 'file')} style={{ display: 'none' }} id="vid-upload" />
                                        <label htmlFor="vid-upload" style={{ cursor: 'pointer', background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '8px', color: 'white', fontWeight: 600 }}>Seleccionar Video</label>
                                        <span style={{ color: 'var(--text-secondary)' }}>{fileNames.video || 'Sin archivo seleccionado'}</span>
                                    </div>
                                ) : (
                                    <input type="text" name="videoUrl" placeholder="Enlace de video (YouTube/Vimeo)" value={formData.videoUrl} onChange={handleChange} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: EXTRAS / FAQ */}
                {currentStep === 3 && (
                    <div className="step-content form-step-3 fade-in">
                        <div className="premium-form-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h4>Dudas Comunes (FAQ)</h4>
                                <button type="button" onClick={addFaq} style={{ background: 'none', border: '1px solid var(--secondary)', color: 'var(--secondary)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>+ Agregar Pregunta</button>
                            </div>
                            
                            {faqs.map((faq, index) => (
                                <div key={index} style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                                    <button type="button" onClick={() => removeFaq(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Pregunta</label>
                                        <input type="text" placeholder="Ej. ¿Necesitás disponibilidad horaria específica?" value={faq.question} onChange={(e) => handleFaqChange(index, 'question', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Respuesta</label>
                                        <textarea placeholder="Ej. Sí, requerimos al menos 2 horas diarias para reuniones..." value={faq.answer} onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} rows="3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 4: PREGUNTAS (Companies only) */}
                {currentStep === 4 && user?.role === 'company' && (
                    <div className="step-content form-step-4 fade-in">
                        <div className="premium-form-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h4>Preguntas de Entrevista</h4>
                                <button type="button" onClick={addQuestion} style={{ background: 'none', border: '1px solid var(--secondary)', color: 'var(--secondary)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>+ Nueva Pregunta</button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '-1rem', marginBottom: '2rem' }}>Define preguntas que los postulantes deben responder al aplicar. Esto te ayudará a filtrar mejor el talento.</p>

                            {questions.map((q, qIndex) => (
                                <div key={q.id} style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                                    <button type="button" onClick={() => removeQuestion(qIndex)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                    
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem' }}>Texto de la Pregunta</label>
                                            <input type="text" placeholder="Ej. ¿Cuántos años de experiencia tenés en React?" value={q.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} required />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.85rem' }}>Tipo de Respuesta</label>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'text', label: 'Texto Libre' },
                                                    { value: 'multiple', label: 'Opción Múltiple' }
                                                ]}
                                                value={q.type}
                                                onChange={(val) => handleQuestionChange(qIndex, 'type', val)}
                                            />
                                        </div>
                                    </div>

                                    {q.type === 'multiple' && (
                                        <div style={{ marginTop: '1.5rem', paddingLeft: '1rem' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Opciones:</label>
                                            {q.options.map((opt, optIndex) => (
                                                <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <input type="text" placeholder={`Opción ${optIndex + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)} required />
                                                    <button type="button" onClick={() => removeOption(qIndex, optIndex)} style={{ background: 'none', border: 'none', color: '#ef4444' }}>×</button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => addOption(qIndex)} style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Añadir opción</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FORM ACTIONS */}
                <div className="form-actions" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    {currentStep > 1 ? (
                        <button type="button" onClick={handlePrevStep} className="category-option" style={{ minWidth: '120px' }}>
                            Anterior
                        </button>
                    ) : (
                        <button type="button" onClick={() => navigate('/explore-clients')} className="category-option" style={{ minWidth: '120px' }}>
                            Cancelar
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        type="submit"
                        className="category-option selected"
                        style={{ minWidth: '180px', fontWeight: 800 }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting 
                            ? (loadingStatus || 'Procesando...') 
                            : (currentStep < (user?.role === 'company' ? 4 : 3) ? 'Siguiente Paso' : (user?.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'))}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectCreateForm;
