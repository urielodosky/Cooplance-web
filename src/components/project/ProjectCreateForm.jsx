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
                // Clear executionTime if not unique
                ...(value !== 'unique' ? { executionTime: '' } : { contractDurationValue: '' })
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
                clientName: user.role === 'company' ? user.companyName : `${user.firstName || user.first_name} ${user.lastName || user.last_name || ''}`.trim(),
                clientAvatar: user.avatar || user.avatar_url,
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

            await createProject(projectData);
            setLoadingStatus('¡Listo!');
            
            setTimeout(() => {
                navigate('/explore-clients');
            }, 1500);

        } catch (err) {
            console.error('Error creating project:', err);
            setFormError(`Error: ${err.message || 'Error desconocido al publicar el proyecto.'}`);
            setIsSubmitting(false);
        }
    };

    const handleNextOrSubmit = (e) => {
        e.preventDefault();

        // Step validation warnings (non-blocking for testing)
        // Check if there's any invalid state but do not `return` to block them.
        if (currentStep === 4 && user?.role !== 'company') {
            handleSubmit(e);
            return;
        } else if (currentStep === 5) {
            const invalidQuestion = questions.some(q => q.text.trim() === '' || (q.type === 'multiple' && q.options.some(opt => opt.trim() === '')));
            if (invalidQuestion && questions.length > 1) {
                const confirmOptions = window.confirm('Hay preguntas o respuestas vacías. ¿Deseas publicarlo de todos modos? Las preguntas vacías se eliminarán.');
                if (!confirmOptions) return;
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
        <div className="project-form-container glass">
            <div className="form-header-premium">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2>{user?.role === 'company' ? 'Publicar Oferta Laboral' : 'Publicar un Proyecto'}</h2>
                        <p>{user?.role === 'company' ? 'Atrae al mejor talento completando los detalles de tu vacante.' : 'Define tu proyecto y el profesional ideal se pondrá en contacto.'}</p>
                    </div>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                        {currentStep} / {user?.role === 'company' ? 5 : 4}
                    </div>
                </div>
            </div>

            {/* Stepper Indicator */}
            <div className="form-steps-indicator" style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem', marginBottom: '1.5rem' }}>
                {(user?.role === 'company' ? [
                    { id: 1, label: 'Detalles' },
                    { id: 2, label: 'Media' },
                    { id: 3, label: 'Opciones' },
                    { id: 4, label: 'Pago' },
                    { id: 5, label: 'Preguntas' }
                ] : [
                    { id: 1, label: 'Detalles' },
                    { id: 2, label: 'Media' },
                    { id: 3, label: 'Opciones' },
                    { id: 4, label: 'Pago' }
                ]).map((step, idx, arr) => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div
                            className={`step-circle ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: currentStep >= step.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                border: '2px solid',
                                borderColor: currentStep >= step.id ? 'var(--primary)' : 'var(--border)',
                                color: currentStep >= step.id ? '#fff' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '0.85rem',
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                zIndex: 2
                            }}
                        >
                            {currentStep > step.id ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : step.id}
                        </div>
                        <span className="step-label" style={{ 
                            position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                            color: currentStep >= step.id ? 'var(--text-primary)' : 'var(--text-muted)',
                            transition: 'color 0.3s'
                        }}>{step.label}</span>

                        {idx < arr.length - 1 && (
                            <div className="step-line" style={{
                                width: '60px', height: '3px',
                                background: currentStep > step.id ? 'var(--primary)' : 'var(--border)',
                                margin: '0 5px', transition: 'all 0.4s ease',
                                borderRadius: '2px'
                            }} />
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleNextOrSubmit} className="project-form" style={{ marginTop: '2rem' }}>

                {/* STEP 1: DETALLES */}
                {currentStep === 1 && (
                    <div className="step-content form-step-1 fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Conceptos Básicos</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comienza dándole un nombre y una categoría a tu búsqueda.</p>
                        </div>

                        <div className="form-group">
                            <label>Título {user?.role === 'company' ? 'de la Oferta' : 'del Proyecto'}</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="Ej. Diseño de sitio web e-commerce"
                            />
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <CustomDropdown
                                    label="Categoría Principal"
                                    options={Object.keys(serviceCategories).map(cat => ({ value: cat, label: cat }))}
                                    value={formData.category}
                                    onChange={(val) => handleDropdownChange('category', val)}
                                />
                            </div>
                            {user?.role === 'company' && (
                                <div className="form-group">
                                    <label>Vacantes Disponibles</label>
                                    <input
                                        type="number"
                                        name="vacancies"
                                        value={formData.vacancies || 1}
                                        onChange={handleChange}
                                        min="1"
                                        placeholder="1"
                                    />
                                </div>
                            )}
                        </div>

                        {formData.category && serviceCategories[formData.category] && (
                            <div className="form-group fade-in" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Subcategorías Específicas (Máx. 3)</label>
                                <div className="subcategories-grid">
                                    {Object.keys(serviceCategories[formData.category] || {}).map(sub => (
                                        <div 
                                            key={sub} 
                                            className={`subcategory-checkbox-label ${formData.subcategories.includes(sub) ? 'active' : ''}`}
                                            onClick={() => handleSubcategoryToggle(sub)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={(formData.subcategories || []).includes(sub)}
                                                readOnly
                                                disabled={!(formData.subcategories || []).includes(sub) && (formData.subcategories || []).length >= 3}
                                            />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{sub}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* SPECIALTIES SECTION [FIXED BUG] */}
                                {formData.subcategories.length > 0 && (
                                    <div className="fade-in" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                        <label style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>Habilidades Requeridas (Especialidades - Máx. 5)</label>
                                        <div className="specialties-grid">
                                            {formData.subcategories.flatMap(sub => serviceCategories[formData.category][sub] || []).map((spec, idx) => (
                                                <div 
                                                    key={`${spec}-${idx}`}
                                                    className={`specialty-item ${formData.specialties.includes(spec) ? 'active' : ''}`}
                                                    onClick={() => handleSpecialtyToggle(spec)}
                                                >
                                                    <div style={{ 
                                                        width: '18px', height: '18px', borderRadius: '4px', border: '2px solid',
                                                        borderColor: formData.specialties.includes(spec) ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: formData.specialties.includes(spec) ? 'var(--primary)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {formData.specialties.includes(spec) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                    </div>
                                                    <span>{spec}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Descripción del Trabajo</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                placeholder="Describe las responsabilidades, requisitos y cualquier detalle relevante para los candidatos..."
                            />
                        </div>

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Presupuesto y Tiempos</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Define cuánto estás dispuesto a pagar y cuándo necesitas empezar.</p>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Fecha Límite para Postular</label>
                                    <CustomDatePicker
                                        selected={formData.deadline}
                                        onChange={(val) => handleDropdownChange('deadline', val)}
                                        minDate={minDate}
                                        required={true}
                                        placeholder="Seleccionar fecha"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Inicio de Contrato</label>
                                    <CustomDatePicker
                                        selected={formData.contractStartDate || ''}
                                        onChange={(val) => handleDropdownChange('contractStartDate', val)}
                                        minDate={formData.deadline || minDate}
                                        required={true}
                                        placeholder="dd/mm/aaaa"
                                    />
                                </div>
                            </div>

                            <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>Tipo de Presupuesto</label>
                                    <CustomDropdown
                                        options={[
                                            { value: 'fixed', label: 'Fijo (No negociable)' },
                                            { value: 'negotiable', label: 'Variable (Ofertable)' }
                                        ]}
                                        value={formData.budgetType}
                                        onChange={(val) => handleDropdownChange('budgetType', val)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Frecuencia de Pago</label>
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

                            <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>Presupuesto Máximo Estimado ($)</label>
                                    <div className="price-input-wrapper">
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            required
                                            min="1000"
                                            placeholder="Mínimo 1000.00 ARS"
                                        />
                                        <span className="currency-badge">ARS</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Duración / Plazo de Ejecución</label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ flex: 1.5 }}>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'unique', label: 'Contrato Único (Días)' },
                                                    { value: 'days', label: 'Recurrente: Días' },
                                                    { value: 'weeks', label: 'Recurrente: Semanas' },
                                                    { value: 'months', label: 'Recurrente: Meses' },
                                                    { value: 'years', label: 'Recurrente: Años' }
                                                ]}
                                                value={formData.contractDurationType || 'unique'}
                                                onChange={(val) => handleDropdownChange('contractDurationType', val)}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="number"
                                                name={formData.contractDurationType === 'unique' ? 'executionTime' : 'contractDurationValue'}
                                                value={formData.contractDurationType === 'unique' ? formData.executionTime : formData.contractDurationValue}
                                                onChange={handleChange}
                                                placeholder={formData.contractDurationType === 'unique' ? "Días" : "Cant."}
                                                min="1"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group work-mode-section" style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Ubicación y Modalidad</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Elige si el trabajo requiere presencia física o puede hacerse a distancia.</p>
                            </div>
                            <div className="work-mode-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                <div
                                    className={`mode-option remote ${formData.workMode.includes('remote') ? 'active' : ''}`}
                                    onClick={() => handleModeSelect('remote')}
                                    style={{ padding: '2rem', height: 'auto', textAlign: 'center' }}
                                >
                                    <div className="mode-icon" style={{ marginBottom: '1rem', color: formData.workMode.includes('remote') ? 'var(--primary)' : 'inherit' }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Trabajo Remoto</span>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>100% digital desde cualquier lugar.</p>
                                </div>
                                <div
                                    className={`mode-option presential ${formData.workMode.includes('presential') ? 'active' : ''}`}
                                    onClick={() => handleModeSelect('presential')}
                                    style={{ padding: '2rem', height: 'auto', textAlign: 'center' }}
                                >
                                    <div className="mode-icon" style={{ marginBottom: '1rem', color: formData.workMode.includes('presential') ? 'var(--secondary)' : 'inherit' }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Trabajo Presencial</span>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>Requiere asistencia en una ubicación física.</p>
                                </div>
                            </div>
                        </div>

                        {formData.workMode.includes('presential') && (
                            <div className="form-group fade-in" style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div className="location-selection-row" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: '1.5rem'
                                }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>País</label>
                                        <CustomDropdown
                                            options={Object.keys(locations).map(country => ({ label: country, value: country }))}
                                            value={formData.country}
                                            onChange={(val) => handleLocationChange('country', val)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provincia / Estado</label>
                                        <CustomDropdown
                                            options={getProvinces().map(prov => ({ label: prov, value: prov }))}
                                            value={formData.province}
                                            onChange={(val) => handleLocationChange('province', val)}
                                            placeholder="Seleccionar..."
                                            disabled={!formData.country}
                                            searchable={true}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ciudad</label>
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
                            </div>
                        )}

                        {/* PAYMENT METHODS (MOVED FROM STEP 4) */}
                        <div className="form-group" style={{ marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Métodos de Pago Preferidos</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Selecciona cómo prefieres realizar/recibir los pagos. (Opcional)</p>
                            </div>
                            <div className="form-step-card glass" style={{ padding: '2rem', borderRadius: '20px' }}>
                                <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                    {[
                                        { id: 'paypal', label: 'PayPal' },
                                        { id: 'mercadopago', label: 'Mercado Pago' },
                                        { id: 'binance', label: 'Binance Pay' },
                                        { id: 'card', label: 'Tarjeta Bancaria' }
                                    ].map(method => (
                                        <div 
                                            key={method.id} 
                                            className={`subcategory-checkbox-label ${formData.paymentMethods.includes(method.id) ? 'active' : ''}`}
                                            onClick={() => {
                                                const current = formData.paymentMethods || [];
                                                const newMethods = current.includes(method.id) ? current.filter(m => m !== method.id) : [...current, method.id];
                                                setFormData(prev => ({ ...prev, paymentMethods: newMethods }));
                                            }}
                                            style={{ padding: '1rem' }}
                                        >
                                            <input type="checkbox" checked={formData.paymentMethods.includes(method.id)} readOnly style={{ width: '18px', height: '18px' }} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{method.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* END OF STEP 1 */}

                {/* STEP 2: MULTIMEDIA */}
                {currentStep === 2 && (
                    <div className="step-content form-step-2 fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Identidad Visual</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Agrega imágenes o videos para que tu oferta destaque del resto.</p>
                        </div>

                        <div className="form-step-card glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                            <div className="media-section">
                                <div className="media-inputs" style={{ display: 'grid', gap: '2rem' }}>
                                    {/* IMAGE INPUT */}
                                    <div className="media-group form-group">
                                        <label>Imagen de Referencia</label>
                                        <div className="media-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <button type="button" className={`media-tab ${mediaType.image === 'file' ? 'active' : ''}`} onClick={() => toggleMediaType('image', 'file')} style={{ flex: 1 }}>Subir Archivo</button>
                                            <button type="button" className={`media-tab ${mediaType.image === 'url' ? 'active' : ''}`} onClick={() => toggleMediaType('image', 'url')} style={{ flex: 1 }}>Enlace URL</button>
                                        </div>
                                        {mediaType.image === 'file' ? (
                                            <div className="file-upload-wrapper">
                                                <label className="custom-file-upload" style={{ width: '100%', padding: '2rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', display: 'block', transition: 'all 0.3s' }}>
                                                    <input type="file" name="image" accept="image/*" onChange={(e) => handleChange(e, 'file')} style={{ display: 'none' }} />
                                                    <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                    </div>
                                                    {fileNames.image ? <span className="file-name" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fileNames.image}</span> : <span style={{ color: 'var(--text-muted)' }}>Haz clic para seleccionar o soltar imagen</span>}
                                                </label>
                                            </div>
                                        ) : (
                                            <input type="url" name="imageUrl" placeholder="https://ejemplo.com/imagen.jpg" value={formData.imageUrl} onChange={handleChange} />
                                        )}
                                    </div>

                                    {/* VIDEO INPUT */}
                                    <div className="media-group form-group">
                                        <label>Video de Referencia (Opcional)</label>
                                        <div className="media-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <button type="button" className={`media-tab ${mediaType.video === 'url' ? 'active' : ''}`} onClick={() => toggleMediaType('video', 'url')} style={{ flex: 1 }}>Enlace (YouTube/Vimeo)</button>
                                            <button type="button" className={`media-tab ${mediaType.video === 'file' ? 'active' : ''}`} onClick={() => toggleMediaType('video', 'file')} style={{ flex: 1 }}>Subir Archivo</button>
                                        </div>
                                        {mediaType.video === 'file' ? (
                                            <div className="file-upload-wrapper">
                                                <label className="custom-file-upload" style={{ width: '100%', padding: '2rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                                                    <input type="file" name="video" accept="video/*" onChange={(e) => handleChange(e, 'file')} style={{ display: 'none' }} />
                                                    <div style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>
                                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                                                    </div>
                                                    {fileNames.video ? <span className="file-name" style={{ fontWeight: 600 }}>{fileNames.video}</span> : <span style={{ color: 'var(--text-muted)' }}>Haz clic para seleccionar video</span>}
                                                </label>
                                            </div>
                                        ) : (
                                            <input type="url" name="videoUrl" placeholder="https://youtube.com/watch?v=..." value={formData.videoUrl} onChange={handleChange} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                )}

                {/* STEP 3: PREGUNTAS FRECUENTES */}
                {currentStep === 3 && (
                    <div className="step-content form-step-3 fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Dudas Comunes</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ahorra tiempo respondiendo las preguntas que suelen tener los interesados.</p>
                        </div>

                        <div className="faq-section">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button type="button" onClick={addFaq} className="btn-add-faq" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Añadir FAQ
                                </button>
                            </div>
                            
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {faqs.map((faq, index) => (
                                    <div key={index} className="faq-item form-step-card glass fade-in" style={{ padding: '1.5rem', borderRadius: '16px', position: 'relative' }}>
                                        <button type="button" onClick={() => removeFaq(index)} style={{ position: 'absolute', top: '15px', right: '15px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                        <div style={{ display: 'grid', gap: '1rem', paddingRight: '2rem' }}>
                                            <input
                                                type="text"
                                                placeholder="Ej: ¿Qué tecnologías debo conocer?"
                                                value={faq.question}
                                                onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                                style={{ fontWeight: 600 }}
                                            />
                                            <textarea
                                                placeholder="Escribe la respuesta aquí..."
                                                value={faq.answer}
                                                onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                                rows="2"
                                                style={{ minHeight: '80px' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: PAGOS (COMPAÑÍAS) O RESUMEN (FREELANCERS) */}
                {currentStep === 4 && (
                    <div className="step-content form-step-4 fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{user?.role === 'company' ? 'Gestión de Oferta' : 'Finalizar Publicación'}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {user?.role === 'company' 
                                    ? 'Revisa los detalles finales antes de publicar tu vacante.' 
                                    : 'Ya casi terminamos. Revisa tu información y publica tu proyecto.'}
                            </p>
                        </div>

                        {user?.role === 'company' ? (
                            <div className="form-step-card glass" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Frecuencia de Pago</label>
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
                                    <div className="form-group">
                                        <label>Tipo de Presupuesto</label>
                                        <CustomDropdown
                                            options={[
                                                { value: 'fixed', label: 'Fijo (No negociable)' },
                                                { value: 'negotiable', label: 'Variable (Ofertable)' }
                                            ]}
                                            value={formData.budgetType}
                                            onChange={(val) => handleDropdownChange('budgetType', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="form-step-card glass" style={{ padding: '3rem', borderRadius: '24px', textAlign: 'center' }}>
                                <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>¡Todo listo!</h3>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                                    Has completado todos los pasos. Haz clic en el botón de abajo para publicar tu proyecto y empezar a recibir propuestas.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {/* END OF STEP 4 */}

                {/* STEP 5: PREGUNTAS (SOLO EMPRESAS) */}
                {currentStep === 5 && user?.role === 'company' && (
                    <div className="step-content form-step-5 fade-in">
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Entrevista Previa</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Agrega preguntas clave para identificar a los mejores candidatos desde el inicio.</p>
                        </div>

                        <div className="questions-list" style={{ display: 'grid', gap: '1.5rem' }}>
                            {questions.map((q, index) => (
                                <div key={q.id} className="question-item form-step-card glass fade-in" style={{ padding: '2rem', borderRadius: '20px', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div style={{ background: 'var(--primary)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>Pregunta {index + 1}</div>
                                        {questions.length > 1 && (
                                            <button type="button" onClick={() => removeQuestion(index)} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Remover</button>
                                        )}
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Enunciado de la Pregunta</label>
                                        <input
                                            type="text"
                                            value={q.text}
                                            onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                            placeholder="Ej: ¿Cuál es tu experiencia con despliegues en AWS?"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Tipo de Respuesta</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div 
                                                className={`subcategory-checkbox-label ${q.type === 'text' ? 'active' : ''}`}
                                                onClick={() => handleQuestionChange(index, 'type', 'text')}
                                                style={{ textAlign: 'center', justifyContent: 'center' }}
                                            >
                                                <span style={{ fontWeight: 700 }}>Texto Libre</span>
                                            </div>
                                            <div 
                                                className={`subcategory-checkbox-label ${q.type === 'multiple' ? 'active' : ''}`}
                                                onClick={() => handleQuestionChange(index, 'type', 'multiple')}
                                                style={{ textAlign: 'center', justifyContent: 'center' }}
                                            >
                                                <span style={{ fontWeight: 700 }}>Múltiple Opción</span>
                                            </div>
                                        </div>
                                    </div>

                                    {q.type === 'multiple' && (
                                        <div className="options-container fade-in" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}>Define las opciones de respuesta:</label>
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} style={{ display: 'flex', gap: '0.75rem' }}>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                                            placeholder={`Respuesta ${optIndex + 1}`}
                                                            required
                                                        />
                                                        {q.options.length > 2 && (
                                                            <button type="button" onClick={() => removeOption(index, optIndex)} style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '45px', borderRadius: '12px', cursor: 'pointer' }}>×</button>
                                                        )}
                                                    </div>
                                                ))}
                                                {q.options.length < 4 && (
                                                    <button type="button" onClick={() => addOption(index)} style={{ border: '1px dashed var(--border)', background: 'transparent', color: 'var(--primary)', padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>+ Agregar Opción</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addQuestion}
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '2rem', background: 'transparent', border: '2px dashed var(--border)', color: 'var(--text-secondary)' }}
                        >
                            + Añadir Pregunta Adicional
                        </button>
                    </div>
                )}
                {/* END OF STEP 5 */}

                {formError && (
                    <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {formError}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    {currentStep > 1 ? (
                        <button type="button" onClick={handlePrevStep} className="btn-cancel" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                            Anterior
                        </button>
                    ) : (
                        <button type="button" onClick={() => navigate('/explore-clients')} className="btn-cancel">
                            Cancelar
                        </button>
                    )}

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={isSubmitting}
                        style={{ padding: '0.8rem 2.5rem', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        {isSubmitting 
                            ? (loadingStatus || 'Procesando...') 
                            : (currentStep < (user?.role === 'company' ? 5 : 4) ? 'Siguiente' : (user?.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'))}
                    </button>
                </div>
            </form >
        </div >
    );
};

export default ProjectCreateForm;
