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
            // Reset subcategories when category changes
            setFormData(prev => ({
                ...prev,
                [name]: value,
                subcategories: []
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
                return { ...prev, subcategories: current.filter(s => s !== sub) };
            } else {
                if (current.length >= 3) return prev; // Max 3
                return { ...prev, subcategories: [...current, sub] };
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
        <div className="glass project-form-container">
            <h2>{user?.role === 'company' ? 'Publicar una Oferta Laboral' : 'Publicar un Proyecto'}</h2>

            {/* Stepper Indicator */}
            <div className="form-steps-indicator" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                {(user?.role === 'company' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((step, idx, arr) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                            className={`step-circle ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                            style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                background: currentStep >= step ? 'var(--primary)' : 'transparent',
                                border: '2px solid',
                                borderColor: currentStep >= step ? 'var(--primary)' : 'var(--border)',
                                color: currentStep >= step ? '#fff' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '0.9rem',
                                transition: 'all 0.3s'
                            }}
                        >
                            {step}
                        </div>
                        {idx < arr.length - 1 && (
                            <div className="step-line" style={{
                                width: '40px', height: '2px',
                                background: currentStep > step ? 'var(--primary)' : 'var(--border)',
                                margin: '0 10px', transition: 'all 0.3s'
                            }} />
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={handleNextOrSubmit} className="project-form">

                {/* STEP 1: DETALLES */}
                {currentStep === 1 && (
                    <div className="step-content form-step-1 fade-in">
                        <h4>Paso 1: Detalles {user?.role === 'company' ? 'de la Oferta' : 'del Proyecto'}</h4>

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

                        <div className="form-group">
                            <CustomDropdown
                                label="Categoría"
                                options={Object.keys(serviceCategories).map(cat => ({ value: cat, label: cat }))}
                                value={formData.category}
                                onChange={(val) => handleDropdownChange('category', val)}
                            />
                        </div>

                        {formData.category && serviceCategories[formData.category] && (
                            <div className="form-group fade-in">
                                <label>Subcategorías (Máx. 3)</label>
                                <div className="subcategories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {Object.keys(serviceCategories[formData.category] || {}).map(sub => (
                                        <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                            <input
                                                type="checkbox"
                                                checked={(formData.subcategories || []).includes(sub)}
                                                onChange={() => handleSubcategoryToggle(sub)}
                                                disabled={!(formData.subcategories || []).includes(sub) && (formData.subcategories || []).length >= 3}
                                            />
                                            {sub}
                                        </label>
                                    ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                                    Seleccionado: {(formData.subcategories || []).length}/3
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                placeholder="Describe los detalles de tu proyecto..."
                            />
                        </div>

                        {user?.role === 'company' && (
                            <>
                                <div className="form-grid-2">
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
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                            Elegir alguna de las dos opciones (Obligatorio):
                        </div>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label style={{ marginBottom: 0 }}>Fecha Límite {user?.role === 'company' && ' para Postular'}</label>
                                    <div className="help-icon-wrapper">
                                        <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                        <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                            {user?.role === 'company' ? 'fecha limite para enviar postulaciones' : 'Para qué fecha debe estar listo el trabajo.'}
                                        </div>
                                    </div>
                                </div>
                                <CustomDatePicker
                                    selected={formData.deadline}
                                    onChange={(val) => handleDropdownChange('deadline', val)}
                                    minDate={minDate}
                                    required={true}
                                    disabled={user?.role !== 'company' && !!formData.executionTime}
                                    placeholder="Sin fecha límite"
                                />
                            </div>

                            {/* IF COMPANY -> SHOW START DATE NEXT TO DEADLINE. IF CLIENT -> SHOW EXECUTION TIME OR DEADLINE MUTUALLY EXCLUSIVE */}
                            {user?.role === 'company' ? (
                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <label style={{ marginBottom: 0 }}>Inicio de Contrato</label>
                                        <div className="help-icon-wrapper">
                                            <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                            <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                                cuando comenzara el contrato de trabajo
                                            </div>
                                        </div>
                                    </div>
                                    <CustomDatePicker
                                        selected={formData.contractStartDate || ''}
                                        onChange={(val) => handleDropdownChange('contractStartDate', val)}
                                        minDate={formData.deadline || minDate}
                                        required={true}
                                        placeholder="dd/mm/aaaa"
                                    />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <label style={{ marginBottom: 0 }}>Plazo de Ejecución (Días)</label>
                                        <div className="help-icon-wrapper">
                                            <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                            <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                                Cuántos días luego de empezado el proyecto debe terminarse el mismo.
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        name="executionTime"
                                        value={formData.executionTime}
                                        onChange={handleChange}
                                        placeholder="Ej. 7"
                                        min="1"
                                        disabled={!!formData.deadline}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label style={{ marginBottom: 0 }}>Tipo de Presupuesto</label>
                                    <div className="help-icon-wrapper">
                                        <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                        <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                            <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.85rem' }}>
                                                <li style={{ marginBottom: '0.3rem' }}><strong>Fijo:</strong> El precio es definitivo (debe ser mayor a 0). No se permite regateo.</li>
                                                <li><strong>Variable:</strong> Inicia en 0 o más. Los freelancers pueden ofertar un costo diferente que deberás aprobar.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <CustomDropdown
                                    options={[
                                        { value: 'fixed', label: 'Fijo' },
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

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label>Presupuesto Máximo Estimado ($)</label>
                             <div className="price-input-wrapper">
                                <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    required
                                    min="1000"
                                    placeholder="Mínimo 1000.00"
                                />
                                <span className="currency-badge">ARS</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                * El presupuesto mínimo aceptado es de $1000 ARS.
                            </div>
                        </div>

                        {user?.role === 'company' && (
                            <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>Duración del Contrato</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'unique', label: 'Único' },
                                                    { value: 'days', label: 'Día/s' },
                                                    { value: 'weeks', label: 'Semana/s' },
                                                    { value: 'months', label: 'Mes/es' },
                                                    { value: 'years', label: 'Año/s' }
                                                ]}
                                                value={formData.contractDurationType || 'unique'}
                                                onChange={(val) => handleDropdownChange('contractDurationType', val)}
                                            />
                                        </div>
                                        <input
                                            type="number"
                                            name="contractDurationValue"
                                            value={formData.contractDurationValue || ''}
                                            onChange={handleChange}
                                            placeholder="Cantidad"
                                            min="1"
                                            disabled={formData.contractDurationType === 'unique'}
                                            style={{
                                                flex: 1,
                                                opacity: formData.contractDurationType === 'unique' ? 0.5 : 1,
                                                cursor: formData.contractDurationType === 'unique' ? 'not-allowed' : 'text'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <label style={{ marginBottom: 0 }}>Plazo de Ejecución (Días)</label>
                                        <div className="help-icon-wrapper">
                                            <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                            <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                                Cuántos días durará el trabajo si el contrato es Único.
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        name="executionTime"
                                        value={formData.executionTime}
                                        onChange={handleChange}
                                        placeholder="Ej. 7"
                                        min="1"
                                        disabled={formData.contractDurationType !== 'unique'}
                                        required={formData.contractDurationType === 'unique'}
                                        style={{
                                            opacity: formData.contractDurationType !== 'unique' ? 0.5 : 1,
                                            cursor: formData.contractDurationType !== 'unique' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-group work-mode-section" style={{ marginTop: '2rem' }}>
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
                                    <label className="work-mode-label" style={{ marginBottom: 0 }}>Ubicación Física del Proyecto</label>
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
                                            Seleccioná el país, provincia y ciudad donde se llevará a cabo el proyecto.
                                        </div>
                                    </div>
                                    <style>{`.tooltip-container:hover .tooltip-text { opacity: 1 !important; visibility: visible !important; }`}</style>
                                </div>

                                <div className="location-selection-row" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: '1rem', 
                                    marginTop: '1rem',
                                    marginBottom: '1rem' 
                                }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>País</label>
                                        <CustomDropdown
                                            options={Object.keys(locations).map(country => ({ label: country, value: country }))}
                                            value={formData.country}
                                            onChange={(val) => handleLocationChange('country', val)}
                                            placeholder="Seleccionar País"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provincia / Estado</label>
                                        <CustomDropdown
                                            options={getProvinces().map(prov => ({ label: prov, value: prov }))}
                                            value={formData.province}
                                            onChange={(val) => handleLocationChange('province', val)}
                                            placeholder={formData.country ? "Seleccionar..." : "Primero elige país"}
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
                                            placeholder={formData.province ? (isLoadingLoc ? "Cargando..." : "Seleccionar...") : "Primero elige provincia"}
                                            disabled={!formData.province || isLoadingLoc}
                                            searchable={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {/* END OF STEP 1 */}

                {/* STEP 2: MULTIMEDIA */}
                {currentStep === 2 && (
                    <div className="step-content form-step-2 fade-in">
                        <h4>Paso 2: Multimedia</h4>

                        <div className="media-section" style={{ marginTop: '1rem' }}>
                            <div className="media-inputs">

                                {/* IMAGE INPUT */}
                                <div className="media-group">
                                    <label className="media-label">Imagen de Referencia</label>
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
                                    <label className="media-label">Video de Referencia (Opcional)</label>
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

                    </div >
                )}

                {/* STEP 3: PREGUNTAS FRECUENTES */}
                {
                    currentStep === 3 && (
                        <div className="step-content form-step-3 fade-in">
                            <div className="faq-section" style={{ marginTop: '0rem' }}>
                                <div className="faq-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4>Paso 3: Preguntas Frecuentes</h4>
                                    <button type="button" onClick={addFaq} className="btn-add-faq" style={{ background: 'transparent', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s' }}>+ Agregar Pregunta</button>
                                </div>
                                {faqs.map((faq, index) => (
                                    <div key={index} className="faq-item" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Pregunta"
                                            value={faq.question}
                                            onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                            className="faq-input"
                                            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' }}
                                        />
                                        <textarea
                                            placeholder="Respuesta"
                                            value={faq.answer}
                                            onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                            rows="2"
                                            className="faq-textarea"
                                            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', resize: 'vertical' }}
                                        />
                                        <button type="button" onClick={() => removeFaq(index)} className="btn-remove-faq" style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Eliminar</button>
                                    </div>
                                ))}
                            </div>
                            {/* END OF STEP 3 */}
                        </div>
                    )
                }

                {/* STEP 4: PAGOS */}
                {
                    currentStep === 4 && (
                        <div className="step-content form-step-4 fade-in">
                            <h4>Paso 4: Pagos</h4>

                            <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
                                {user?.role === 'company' && (
                                    <>
                                        <div className="form-group">
                                            <label>Frecuencia de Pago</label>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'unique', label: 'Pago Único' },
                                                    { value: 'daily', label: 'Diario' },
                                                    { value: 'weekly', label: 'Semanal' },
                                                    { value: 'biweekly', label: 'Quincenal' },
                                                    { value: 'monthly', label: 'Mensual' },
                                                    { value: 'commission', label: 'Comisión' }
                                                ]}
                                                value={formData.paymentFrequency || 'unique'}
                                                onChange={(val) => handleDropdownChange('paymentFrequency', val)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <label style={{ marginBottom: 0 }}>Tipo de Presupuesto</label>
                                                <div className="help-icon-wrapper">
                                                    <span className="help-icon" style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>?</span>
                                                    <div className="help-tooltip" style={{ width: '250px', bottom: '100%', left: '50%', transform: 'translateX(-50%)' }}>
                                                        <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.85rem' }}>
                                                            <li style={{ marginBottom: '0.3rem' }}><strong>Fijo:</strong> El precio es definitivo (debe ser mayor a 0). No se permite regateo.</li>
                                                            <li><strong>Variable:</strong> Inicia en 0 o más. Los freelancers pueden ofertar un costo diferente que deberás aprobar.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'fixed', label: 'Fijo' },
                                                    { value: 'negotiable', label: 'Variable (Ofertable)' }
                                                ]}
                                                value={formData.budgetType}
                                                onChange={(val) => handleDropdownChange('budgetType', val)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label>
                                                {formData.paymentFrequency === 'commission' ? 'Porcentaje de Comisión (%)' : 'Presupuesto Inicial ($)'}
                                            </label>
                                            {formData.paymentFrequency === 'commission' ? (
                                                <input
                                                    type="number"
                                                    name="commissionPercentage"
                                                    value={formData.commissionPercentage || ''}
                                                    onChange={handleChange}
                                                    placeholder="Ej. 10"
                                                    min="0"
                                                    max="100"
                                                />
                                            ) : (
                                                <div className="price-input-wrapper">
                                                    <input
                                                        type="number"
                                                        name="budget"
                                                        value={formData.budget}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="0.00"
                                                    />
                                                    <span className="currency-badge">ARS</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* PAYMENT METHODS SELECTION */}
                            <div className="payment-methods-section" style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>Métodos de Pago Preferidos</label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Selecciona cómo prefieres pagar al freelancer. Si no seleccionas ninguno, se mostrará como "A convenir" o abierto a todos.
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
                        </div>
                    )
                }
                {/* END OF STEP 4 */}

                {/* STEP 5: PREGUNTAS (SOLO EMPRESAS) */}
                {
                    currentStep === 5 && user?.role === 'company' && (
                        <div className="step-content form-step-5 fade-in">
                            <h4>Paso 5: Preguntas de Entrevista Previa</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Agrega preguntas que los candidatos deberán responder al postularse. Esto te ayudará a filtrar perfiles más rápido.
                            </p>

                            <div className="questions-list">
                                {questions.map((q, index) => (
                                    <div key={q.id} className="question-item glass" style={{ padding: '1.5rem', marginBottom: '1rem', borderRadius: '8px', position: 'relative' }}>
                                        {questions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(index)}
                                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                                title="Eliminar pregunta"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        )}

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Pregunta {index + 1}</label>
                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                                placeholder="Ej: ¿Cuántos años de experiencia tienes con React?"
                                                required
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Tipo de Respuesta</label>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name={`q-type-${q.id}`}
                                                        value="text"
                                                        checked={q.type === 'text'}
                                                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                                                        style={{ accentColor: 'var(--primary)' }}
                                                    />
                                                    Texto Libre
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name={`q-type-${q.id}`}
                                                        value="multiple"
                                                        checked={q.type === 'multiple'}
                                                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                                                        style={{ accentColor: 'var(--primary)' }}
                                                    />
                                                    Múltiple Opción
                                                </label>
                                            </div>
                                        </div>

                                        {q.type === 'multiple' && (
                                            <div className="options-container" style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Opciones:</label>
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                                            placeholder={`Opción ${optIndex + 1}`}
                                                            style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                                            required
                                                        />
                                                        {q.options.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOption(index, optIndex)}
                                                                style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                X
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {q.options.length < 5 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addOption(index)}
                                                        style={{ fontSize: '0.85rem', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.5rem' }}
                                                    >
                                                        + Añadir Opción
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addQuestion}
                                style={{
                                    width: '100%',
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.95rem',
                                    fontWeight: '500'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Añadir Otra Pregunta
                            </button>
                        </div>
                    )
                }
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
