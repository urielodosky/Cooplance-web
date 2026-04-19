import React, { useState, useEffect } from 'react';
import CustomDropdown from '../common/CustomDropdown';
import CustomDatePicker from '../common/CustomDatePicker';
import '../../styles/components/ProjectCreateForm.scss';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { serviceCategories } from '../../features/services/data/categories';
import { locations } from '../../features/services/data/locations';
import { supabase } from '../../lib/supabase';
import { createProject, updateProject, getProjectsByClient } from '../../lib/projectService';
import { getArgentinaProvinces, getArgentinaCities } from '../../utils/locationUtils';

const ProjectCreateForm = ({ onCancel, initialData }) => {
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
        ...initialData,
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        budgetType: initialData?.budgetType || 'fixed', // or 'range'
        budget: initialData?.budget || '',
        deadline: initialData?.deadline || '',
        executionTime: initialData?.executionTime || '',
        images: initialData?.images || (initialData?.imageUrl ? [initialData.imageUrl] : []),
        videos: initialData?.videos || (initialData?.videoUrl ? [{ type: 'url', src: initialData.videoUrl }] : []),
        subcategories: initialData?.subcategories || [], // Array of selected subcategories
        specialties: initialData?.specialties || [], // Array of selected specialties
        vacancies: initialData?.vacancies || 1,
        paymentFrequency: initialData?.paymentFrequency || 'unique',
        contractDuration: initialData?.contractDuration || '',
        commissionPercentage: initialData?.commissionPercentage || '',
        workMode: initialData?.workMode || ['remote'], // Array for multi-select
        country: initialData?.country || 'Argentina',
        province: initialData?.province || '', // Changed to string for single selection
        city: initialData?.city || '', // Changed to string for single selection
        location: initialData?.location || '',
        paymentMethods: initialData?.paymentMethods ? Object.keys(initialData.paymentMethods).filter(k => initialData.paymentMethods[k]) : [],
        contractDurationType: initialData?.contractDurationType || 'days', // default to days for relative duration
        contractDurationValue: initialData?.contractDurationValue || '',
        contractStartDate: initialData?.contractStartDate || '',
        deadlineType: initialData?.deadlineType || 'fixed' // 'fixed' for specific date, 'duration' for relative time
    });

    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    const [faqs, setFaqs] = useState(initialData?.faqs || [{ question: '', answer: '' }]);
    
    // Level-based publication limit check on mount (for new projects only)
    useEffect(() => {
        if (!user || initialData?.id) return;

        const checkLimits = async () => {
            try {
                const currentLevel = user.level || 1;
                const maxProjects = currentLevel >= 5 ? 5 : currentLevel;
                const existingProjects = await getProjectsByClient(user.id);
                const openProjectsCount = existingProjects.filter(p => p.status === 'open').length;

                if (openProjectsCount >= maxProjects) {
                    alert(`Has alcanzado tu límite de ${maxProjects} publicaciones para el Nivel ${currentLevel}.\n\nPara publicar un nuevo pedido, primero debes eliminar o esperar a que expiren los anteriores.`);
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Error checking limits on mount:', err);
            }
        };

        checkLimits();
    }, [user, initialData, navigate]);

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

    // Step 5: Pre-interview Questions (for companies)
    const [questions, setQuestions] = useState(initialData?.questions || [
        { id: Date.now(), text: '', type: 'text', options: [''] }
    ]);

    const [mediaType, setMediaType] = useState({ image: 'file', video: 'url' });
    const [fileNames, setFileNames] = useState({ image: '', video: '' });

    const handleAddImages = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentImages = formData.images || [];
        const remaining = 5 - currentImages.length;
        if (remaining <= 0) {
            alert('Puedes subir hasta 5 imágenes.');
            return;
        }

        const newImages = files.slice(0, remaining).map(file => ({
            type: 'file',
            src: URL.createObjectURL(file),
            file: file
        }));
        
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...newImages] }));
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleAddVideo = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if ((formData.videos || []).length >= 2) {
            alert('Puedes agregar hasta 2 videos.');
            return;
        }

        const videoUrl = URL.createObjectURL(file);
        setFormData(prev => ({
            ...prev,
            videos: [...(prev.videos || []), { type: 'file', src: videoUrl, name: file.name, file }]
        }));
    };

    const handleAddVideoUrl = () => {
        if ((formData.videos || []).length >= 2) {
            alert('Puedes agregar hasta 2 videos.');
            return;
        }
        const url = prompt('Ingresa la URL del video (YouTube, Vimeo, etc.):');
        if (url) {
            setFormData(prev => ({
                ...prev,
                videos: [...(prev.videos || []), { type: 'url', src: url }]
            }));
        }
    };

    const handleRemoveVideo = (index) => {
        setFormData(prev => ({
            ...prev,
            videos: prev.videos.filter((_, i) => i !== index)
        }));
    };

    const handleChange = (e, type = 'text') => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            // Mutual exclusivity logic only for clients
            if (user?.role !== 'company') {
                if (name === 'deadline' && value) updates.contractDurationValue = '';
                if (name === 'contractDurationValue' && value) updates.deadline = '';
            }
            return { ...prev, ...updates };
        });
    };

    const toggleMediaType = (field, type) => {
        setMediaType(prev => ({ ...prev, [field]: type }));
    };

    const handleDropdownChange = (name, value) => {
        setFormData(prev => {
            let next = { ...prev, [name]: value };
            
            // Logic for business payment frequency vs duration
            if (name === 'paymentFrequency') {
                if (value === 'unique') {
                    next.contractDurationType = 'unique';
                    next.contractDurationValue = '1';
                } else if (value !== 'commission' && prev.contractDurationType === 'unique') {
                    next.contractDurationType = 'days';
                    next.contractDurationValue = '';
                }
            }

            // Category reset logic
            if (name === 'category') {
                next.subcategories = [];
                next.specialties = [];
            }

            // Duration type reset logic
            if (name === 'contractDurationType') {
                next.contractDurationValue = '';
            }

            return next;
        });
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
                // Replace if already has 1 (User friendly limit enforcement)
                return { ...prev, subcategories: [sub], specialties: [] };
            }
        });
    };

    const handleSpecialtyToggle = (spec) => {
        setFormData(prev => {
            const current = prev.specialties || [];
            if (current.includes(spec)) {
                return { ...prev, specialties: current.filter(s => s !== spec) };
            } else {
                if (current.length >= 3) return prev; // Max 3 specialties
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

    // --- Questions Logic (Step 4) ---
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

        // Validation logic
        if (!formData.budget || Number(formData.budget) < 1000) {
            alert('El presupuesto debe ser mayor o igual a $1000 ARS.');
            return;
        }

        if (!user) {
            setFormError('Debes iniciar sesión para publicar un proyecto.');
            return;
        }

        setIsSubmitting(true);
        setFormError('');
        setLoadingStatus('Iniciando...');

        // Mandatory duration validation for companies
        if (user?.role === 'company') {
            const freq = formData.paymentFrequency;
            const type = formData.contractDurationType;
            const val = Number(formData.contractDurationValue);

            if (freq !== 'unique' && freq !== 'commission') {
                let minDays = 0;
                if (freq === 'daily') minDays = 1;
                if (freq === 'weekly') minDays = 7;
                if (freq === 'biweekly') minDays = 15;
                if (freq === 'monthly') minDays = 30;

                let currentDays = val;
                if (type === 'weeks') currentDays = val * 7;
                if (type === 'months') currentDays = val * 30;
                if (type === 'years') currentDays = val * 365;

                if (currentDays < minDays) {
                    const messages = {
                        daily: 'Diario: mínimo 1 día.',
                        weekly: 'Semanal: mínimo 7 días o 1 semana.',
                        biweekly: 'Quincenal: mínimo 15 días o 2 semanas.',
                        monthly: 'Mensual: mínimo 30 días o 1 mes.'
                    };
                    setFormError(`La duración del contrato no cumple el mínimo para la frecuencia seleccionada: ${messages[freq]}`);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        // Level-based publication limit check (for new projects only)
        if (!initialData?.id) {
            const currentLevel = user.level || 1;
            const maxProjects = currentLevel >= 5 ? 5 : currentLevel;
            
            try {
                setLoadingStatus('Verificando límites...');
                const existingProjects = await getProjectsByClient(user.id);
                const openProjectsCount = existingProjects.filter(p => p.status === 'open').length;

                if (openProjectsCount >= maxProjects) {
                    setFormError(`Límite alcanzado: Tu Nivel ${currentLevel} permite hasta ${maxProjects} publicaciones activas. Borra un proyecto anterior para publicar uno nuevo.`);
                    setIsSubmitting(false);
                    return;
                }
            } catch (err) {
                console.warn('Could not verify limits, proceeding with caution...', err);
            }
        }

        try {
            setLoadingStatus('Subiendo archivos...');
            
            // Helper function to upload media
            const uploadMedia = async (mediaList, bucket) => {
                const uploadedUrls = [];
                for (const item of mediaList) {
                    if (item.type === 'file' && item.file) {
                        const fileExt = item.file.name.split('.').pop();
                        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                        const filePath = `${user.id}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from(bucket)
                            .upload(filePath, item.file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(filePath);
                            
                        uploadedUrls.push(publicUrl);
                    } else if (typeof item === 'string') {
                        uploadedUrls.push(item);
                    } else if (item.src && item.type !== 'file') {
                        uploadedUrls.push(item.src);
                    } else if (item.src && item.type === 'file' && !item.file) {
                        // case for existing social/blob urls that might have been loaded from initialData
                        uploadedUrls.push(item.src);
                    }
                }
                return uploadedUrls;
            };

            const finalizedImages = await uploadMedia(formData.images || [], 'project-images');
            const finalizedVideos = await uploadMedia(formData.videos || [], 'project-videos');

            setLoadingStatus('Guardando proyecto...');
            const projectData = {
                ...formData,
                clientId: user.id,
                clientName: user.role === 'company' ? user.company_name : `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
                clientAvatar: user.avatar_url,
                clientRole: user.role,
                status: 'open',
                imageUrl: finalizedImages.length > 0 ? finalizedImages[0] : null,
                images: finalizedImages,
                videos: finalizedVideos.map(v => ({ type: v.startsWith('http') ? 'url' : 'file', src: v })),
                videoUrl: finalizedVideos.length > 0 ? finalizedVideos[0] : null,
                faqs: faqs.filter(f => f.question && f.answer),
                questions: user?.role === 'company' ? questions.filter(q => q.text.trim() !== '') : [],
                location: formData.workMode.includes('presential')
                    ? (Array.isArray(formData.city) && formData.city.length > 0 ? formData.city.join(' / ') + `, ${formData.country}` : formData.country)
                    : 'Remoto',
                paymentMethods: (formData.paymentMethods && formData.paymentMethods.length > 0)
                    ? formData.paymentMethods.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
                    : null,
                expirationDate: formData.deadlineType === 'fixed' ? formData.deadline : null,
                deadlineType: formData.deadlineType
            };

            // Handle duration and deadlines based on deadlineType
            if (formData.deadlineType === 'duration' && formData.contractDurationValue) {
                projectData.contractDuration = `${formData.contractDurationValue} ${formData.contractDurationType}`;
                projectData.deadline = null; // Ensure fixed deadline is null if duration-based
            } else if (formData.deadlineType === 'fixed') {
                projectData.contractDuration = 'Fecha fija';
                // formData.deadline is already picked up
            }

            // Cleanup frequency for clients
            if (user?.role !== 'company') {
                projectData.paymentFrequency = 'unique';
            }


            if (initialData?.id) {
                await updateProject(initialData.id, projectData);
                setLoadingStatus('Actualizado con éxito');
            } else {
                await createProject(projectData);
                setLoadingStatus('¡Listo!');
            }

            setTimeout(() => {
                navigate('/explore-clients');
            }, 1500);

        } catch (err) {
            console.error('Error saving project:', err);
            setFormError(`Hubo un error al publicar el pedido: ${err.message}`);
            setIsSubmitting(false);
        }
    };

    const handleNextOrSubmit = (e) => {
        e.preventDefault();
        const maxSteps = 4;

        if (currentStep === maxSteps) {
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
                {[1, 2, 3, 4].map(step => (
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

                {/* STEP 1: Básica y Precios */}
                {currentStep === 1 && (
                    <div className="step-content form-step-1">
                        <div className="premium-form-section">
                            <h4>Conceptos Básicos</h4>
                            <div className="form-group">
                                <label className="work-mode-label">Título del Proyecto / Oferta</label>
                                <input name="title" type="text" placeholder="Ej. Diseño de sitio web e-commerce" value={formData.title} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="work-mode-label">Descripción Detallada</label>
                                <textarea name="description" placeholder="Describe las metas, responsabilidades y requisitos..." value={formData.description} onChange={handleChange} rows="10" required />
                            </div>

                            {/* CATEGORY SELECTION */}
                            <div className="form-group">
                                <label className="work-mode-label">Categoría del Proyecto</label>
                                <CustomDropdown 
                                    options={Object.keys(serviceCategories).map(cat => ({ label: cat, value: cat }))} 
                                    value={formData.category} 
                                    onChange={(val) => handleDropdownChange('category', val)} 
                                    placeholder="Selecciona Categoría..."
                                />
                            </div>

                            {/* SUBCATEGORY SELECTION */}
                            {formData.category && (
                                <div className="form-group fade-in">
                                    <label className="work-mode-label">Subcategorías (Max 1)</label>
                                    <div className="category-grid">
                                        {Object.keys(serviceCategories[formData.category] || {}).map(sub => (
                                            <div 
                                                key={sub} 
                                                className={`category-option ${(formData.subcategories || []).includes(sub) ? 'selected' : ''}`}
                                                onClick={() => handleSubcategoryToggle(sub)}
                                            >
                                                {sub}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SPECIALTIES SELECTION */}
                            {formData.category && (formData.subcategories || []).length > 0 && (
                                <div className="form-group fade-in">
                                    <label className="work-mode-label">Especialidades (Max 3)</label>
                                    <div className="category-grid">
                                        {(formData.subcategories || []).flatMap(sub => (serviceCategories[formData.category] || {})[sub] || []).map(spec => (
                                            <div 
                                                key={spec} 
                                                className={`category-option ${(formData.specialties || []).includes(spec) ? 'selected' : ''}`}
                                                onClick={() => handleSpecialtyToggle(spec)}
                                            >
                                                {spec}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="work-mode-label">Modalidad de Trabajo</label>
                                <div className="work-mode-options">
                                    <div className={`mode-option remote ${formData.workMode.includes('remote') ? 'active' : ''}`} onClick={() => handleModeSelect('remote')}>Remoto</div>
                                    <div className={`mode-option presential ${formData.workMode.includes('presential') ? 'active' : ''}`} onClick={() => handleModeSelect('presential')}>Presencial</div>
                                </div>
                            </div>
                            {formData.workMode.includes('presential') && (
                                <div className="form-group fade-in" style={{ marginTop: '1rem' }}>
                                    <div className="form-grid-2">
                                        <CustomDropdown options={Object.keys(locations).map(c => ({ label: c, value: c }))} value={formData.country} onChange={(val) => handleLocationChange('country', val)} />
                                        <CustomDropdown options={getProvinces().map(p => ({ label: p, value: p }))} value={formData.province} onChange={(val) => handleLocationChange('province', val)} placeholder="Provincia..." searchable />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <CustomDropdown options={getCities().map(c => ({ label: c, value: c }))} value={formData.city} onChange={(val) => handleLocationChange('city', val)} placeholder="Ciudad..." searchable disabled={!formData.province || isLoadingLoc} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="premium-form-section" style={{ marginTop: '2rem' }}>
                            <h4>Presupuesto y Tiempos</h4>
                            
                            {user?.role === 'company' ? (
                                <>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="work-mode-label">Tipo de Presupuesto</label>
                                            <CustomDropdown options={[{ value: 'fixed', label: 'Est. Fijo' }, { value: 'negotiable', label: 'Estimado' }]} value={formData.budgetType} onChange={(v) => handleDropdownChange('budgetType', v)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="work-mode-label">Frecuencia de Pago</label>
                                            <CustomDropdown 
                                                options={[
                                                    { value: 'unique', label: 'Pago Único' }, 
                                                    { value: 'daily', label: 'Diario' }, 
                                                    { value: 'weekly', label: 'Semanal' }, 
                                                    { value: 'biweekly', label: 'Quincenal' }, 
                                                    { value: 'monthly', label: 'Mensual' },
                                                    { value: 'commission', label: 'Comisión por Ventas' }
                                                ]} 
                                                value={formData.paymentFrequency} 
                                                onChange={(v) => handleDropdownChange('paymentFrequency', v)} 
                                            />
                                        </div>
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="work-mode-label">
                                                {formData.paymentFrequency === 'commission' ? 'Porcentaje de comisión (%)' : 'Presupuesto ($ ARS)'}
                                            </label>
                                            <input type="number" name="budget" value={formData.budget} onChange={handleChange} required min={formData.paymentFrequency === 'commission' ? "1" : "1000"} max={formData.paymentFrequency === 'commission' ? "100" : undefined} />
                                        </div>
                                        <div className="form-group">
                                            <label className="work-mode-label">Vacantes</label>
                                            <input type="number" name="vacancies" value={formData.vacancies} onChange={handleChange} min="1" required />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="form-group">
                                    <label className="work-mode-label">Presupuesto Estimado ($ ARS)</label>
                                    <input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="Ej. 50000" required min="1000" />
                                </div>
                            )}


                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="work-mode-label">{user?.role === 'company' ? 'Duración del Contrato' : 'Plazo de Entrega del Proyecto'}</label>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <button 
                                        type="button" 
                                        className={`category-option ${formData.deadlineType === 'fixed' ? 'selected' : ''}`}
                                        onClick={() => setFormData(p => ({ ...p, deadlineType: 'fixed', contractDurationValue: '' }))}
                                        style={{ flex: 1 }}
                                    >
                                        Fecha Fija
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`category-option ${formData.deadlineType === 'duration' ? 'selected' : ''}`}
                                        onClick={() => setFormData(p => ({ ...p, deadlineType: 'duration', deadline: '' }))}
                                        style={{ flex: 1 }}
                                    >
                                        Plazo tras aceptación
                                    </button>
                                </div>

                                {formData.deadlineType === 'fixed' ? (
                                    <CustomDatePicker 
                                        selected={formData.deadline} 
                                        onChange={(v) => handleDropdownChange('deadline', v)} 
                                        minDate={minDate}
                                        placeholder="Selecciona la fecha de entrega"
                                    />
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="number" 
                                            name="contractDurationValue" 
                                            value={formData.contractDurationValue} 
                                            onChange={handleChange} 
                                            placeholder="Ej: 5" 
                                            style={{ flex: 1 }} 
                                            required 
                                        />
                                        <CustomDropdown 
                                            options={[
                                                { value: 'days', label: 'Días' }, 
                                                { value: 'weeks', label: 'Semanas' }, 
                                                { value: 'months', label: 'Meses' }
                                            ]} 
                                            value={formData.contractDurationType} 
                                            onChange={(v) => handleDropdownChange('contractDurationType', v)} 
                                            style={{ flex: 1 }} 
                                        />
                                    </div>
                                )}
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    {formData.deadlineType === 'duration' 
                                        ? 'El profesional deberá terminar el trabajo en este tiempo una vez aceptado el pedido.' 
                                        : 'Fecha límite estricta para la entrega del trabajo final.'}
                                </p>
                            </div>
                        </div>


                    </div>
                )}

                {/* STEP 2: MULTIMEDIA */}
                {currentStep === 2 && (
                    <div className="step-content form-step-2 fade-in">
                        <div className="premium-form-section">
                            <h4>Material Multimedia</h4>
                            
                            {/* IMAGES SECTION */}
                            <div className="media-upload-section" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label className="work-mode-label" style={{ margin: 0 }}>📷 Imágenes ({formData.images?.length || 0}/5)</label>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>La primera será la portada</span>
                                </div>
                                
                                <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                    {formData.images?.map((img, index) => (
                                        <div key={index} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1/1', border: '1px solid var(--border)' }}>
                                            <img src={img} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveImage(index)} 
                                                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}
                                            >
                                                ×
                                            </button>
                                            {index === 0 && (
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '10px', textAlign: 'center', padding: '2px 0', fontWeight: 'bold' }}>
                                                    PORTADA
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!formData.images || formData.images.length < 5) && (
                                        <label style={{ 
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                            aspectRatio: '1/1', border: '2px dashed var(--border)', borderRadius: '12px', 
                                            cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)' 
                                        }} className="category-option">
                                            <input type="file" accept="image/*" multiple onChange={handleAddImages} style={{ display: 'none' }} />
                                            <span style={{ fontSize: '24px', marginBottom: '4px' }}>+</span>
                                            <span style={{ fontSize: '12px' }}>Agregar</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* VIDEOS SECTION */}
                            <div className="media-upload-section">
                                <label className="work-mode-label" style={{ marginBottom: '1rem', display: 'block' }}>🎬 Videos ({formData.videos?.length || 0}/2)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <button type="button" onClick={() => document.getElementById('video-upload-input').click()} className="category-option" style={{ flex: 1, padding: '0.8rem' }}>Subir Archivo</button>
                                    <button type="button" onClick={handleAddVideoUrl} className="category-option" style={{ flex: 1, padding: '0.8rem' }}>Vincular URL</button>
                                    <input id="video-upload-input" type="file" accept="video/*" onChange={handleAddVideo} style={{ display: 'none' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {formData.videos?.map((vid, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{vid.name || (vid.type === 'url' ? 'Video Externo' : 'Video Local')}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vid.type === 'url' ? vid.src.substring(0, 30) + '...' : 'Archivo de video'}</div>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveVideo(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Máximo 1 minuto por video. Formatos sugeridos: MP4, WebM.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: PREGUNTAS POSIBLES */}
                {currentStep === 3 && (
                    <div className="step-content form-step-3 fade-in">
                        <div className="premium-form-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h4>Preguntas posibles</h4>
                                <button type="button" onClick={addFaq} className="category-option" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>+ Agregar Pregunta</button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {faqs.map((faq, index) => (
                                    <div key={index} style={{ 
                                        padding: '1.5rem', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '16px', 
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFaq(index)} 
                                            style={{ 
                                                position: 'absolute', top: '1rem', right: '1rem', 
                                                background: 'rgba(239, 68, 68, 0.1)', border: 'none', 
                                                color: '#ef4444', borderRadius: '50%', width: '28px', height: '28px', 
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                            }}
                                        >
                                            ×
                                        </button>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pregunta</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ej: ¿Qué incluye el servicio?" 
                                                value={faq.question} 
                                                onChange={(e) => handleFaqChange(index, 'question', e.target.value)} 
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Respuesta</label>
                                            <textarea 
                                                placeholder="Describe la respuesta detalladamente..." 
                                                value={faq.answer} 
                                                onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} 
                                                rows="3" 
                                            />
                                        </div>
                                    </div>
                                ))}
                                {faqs.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                                        No has agregado preguntas todavía. Ayudan a los usuarios a resolver dudas frecuentes.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* STEP 4: FINALIZACIÓN */}
                {currentStep === 4 && (
                    <div className="step-content form-step-4 fade-in">
                        {user?.role === 'company' && (
                            <div className="premium-form-section" style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h4>Preguntas de Entrevista</h4>
                                    <button type="button" onClick={addQuestion} className="category-option" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>+ Nueva</button>
                                </div>
                                {questions.map((q, qIndex) => (
                                    <div key={q.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', position: 'relative' }}>
                                        <button type="button" onClick={() => removeQuestion(qIndex)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#ef4444' }}>×</button>
                                        <input type="text" placeholder="Pregunta para el postulante" value={q.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} />
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <CustomDropdown options={[{ value: 'text', label: 'Texto Libre' }, { value: 'multiple', label: 'Selección' }]} value={q.type} onChange={(v) => handleQuestionChange(qIndex, 'type', v)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="premium-form-section">
                            <h4>Métodos de Pago Preferidos</h4>
                            <p className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Selecciona cómo prefieres concretar el pago de este proyecto.</p>
                            <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                {[
                                    { id: 'paypal', label: 'PayPal' },
                                    { id: 'mercadopago', label: 'Mercado Pago' },
                                    { id: 'binance', label: 'Binance Pay' },
                                    { id: 'card', label: 'Tarjeta (Plataforma)' }
                                ].map(method => (
                                    <div 
                                        key={method.id}
                                        className={`category-option ${formData.paymentMethods.includes(method.id) ? 'selected' : ''}`}
                                        onClick={() => {
                                            const current = formData.paymentMethods || [];
                                            const newMethods = current.includes(method.id) ? current.filter(m => m !== method.id) : [...current, method.id];
                                            setFormData({ ...formData, paymentMethods: newMethods });
                                        }}
                                        style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 600 }}
                                    >
                                        {method.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="form-actions" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    {currentStep > 1 ? <button type="button" onClick={handlePrevStep} className="category-option" style={{ minWidth: '120px' }}>Anterior</button> : <button type="button" onClick={() => navigate('/explore-clients')} className="category-option" style={{ minWidth: '120px' }}>Cancelar</button>}
                    <button type="submit" className="category-option selected" style={{ minWidth: '180px', fontWeight: 800 }} disabled={isSubmitting}>
                        {isSubmitting ? (loadingStatus || 'Procesando...') : (currentStep < 4 ? 'Siguiente Paso' : 'Publicar')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectCreateForm;
