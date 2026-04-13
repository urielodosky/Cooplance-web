import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useServices } from '../context/ServiceContext';
import { useAuth } from '../../auth/context/AuthContext';
import { processGamificationRules, calculateCommission } from '../../../utils/gamification';
import { serviceCategories, bookingCategories } from '../data/categories';
import { locations } from '../data/locations';
import universitiesData from '../data/universidades_limpias.json';
import CustomDropdown from '../../../components/common/CustomDropdown';
import BookingConfigForm from '../../../components/booking/BookingConfigForm';
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [formError, setFormError] = useState('');

    // Multi-media state
    const [images, setImages] = useState(() => {
        if (initialData?.images && initialData.images.length > 0) return initialData.images;
        if (initialData?.image) return [initialData.image];
        return [];
    });
    const [videos, setVideos] = useState(() => {
        if (initialData?.videos && initialData.videos.length > 0) return initialData.videos;
        if (initialData?.video) return [{ src: initialData.video, type: initialData?.mediaType?.video || 'url' }];
        return [];
    });

    const [formData, setFormData] = useState({
        ...initialData,
        title: initialData?.title || '',
        category: initialData?.category || '',
        subcategory: (typeof initialData?.subcategory === 'string') ? initialData?.subcategory : '',
        specialties: initialData?.specialties || (Array.isArray(initialData?.subcategory) ? initialData?.subcategory : []),
        workMode: initialData?.workMode || ['remote'],
        price: initialData?.price || '',
        description: initialData?.description || '',
        deliveryTime: initialData?.deliveryTime || '',
        revisions: initialData?.revisions || '',
        imageUrl: initialData?.imageUrl || '',
        videoUrl: initialData?.videoUrl || '',
        country: initialData?.country || 'Argentina',
        province: initialData?.province || [],
        city: initialData?.city || [],
        paymentMethods: initialData?.paymentMethods ? Object.keys(initialData.paymentMethods).filter(k => initialData.paymentMethods[k]) : [],
        portfolioUrl: initialData?.portfolioUrl || '',
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
        }
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

    const isSessionBased = ['Educación y Estilo de Vida', 'Profesionales Matriculados', 'Negocios y Administración'].includes(formData.category) ||
        bookingCategories.includes(formData.category) ||
        (typeof formData.subcategory === 'string' && (
            formData.subcategory.toLowerCase().includes('tutoría') ||
            formData.subcategory.toLowerCase().includes('coaching')
        ));

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
            // Legacy single file - no longer used for images/videos, kept for compatibility
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const fieldName = e.target.name === 'image' ? 'imageUrl' : 'videoUrl';
                    setFormData({ ...formData, [fieldName]: reader.result });
                    setFileNames({ ...fileNames, [e.target.name]: file.name });
                };
                reader.readAsDataURL(file);
            }
        } else {
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

    // Compress image using canvas to stay within localStorage limits
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 600;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > MAX_SIZE) { h = h * MAX_SIZE / w; w = MAX_SIZE; } }
                    else { if (h > MAX_SIZE) { w = w * MAX_SIZE / h; h = MAX_SIZE; } }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // Multi-image handler with compression
    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 5) {
            setFormError(`Máximo 5 imágenes. Ya tenés ${images.length}.`);
            setTimeout(() => setFormError(''), 3000);
            return;
        }
        for (const file of files) {
            const compressed = await compressImage(file);
            setImages(prev => {
                if (prev.length >= 5) return prev;
                return [...prev, compressed];
            });
        }
        e.target.value = '';
    };

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // Multi-video handler - uses blob URLs (not base64) to avoid quota issues
    const handleAddVideo = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (videos.length >= 2) {
            setFormError('Máximo 2 videos.');
            setTimeout(() => setFormError(''), 3000);
            return;
        }

        const videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        const objectUrl = URL.createObjectURL(file);
        videoEl.src = objectUrl;
        videoEl.onloadedmetadata = () => {
            if (videoEl.duration > 60) {
                URL.revokeObjectURL(objectUrl);
                setFormError(`El video dura ${Math.round(videoEl.duration)}s. Máximo permitido: 60 segundos.`);
                setTimeout(() => setFormError(''), 4000);
                return;
            }
            // Store as blob URL and include file object for Supabase upload
            setVideos(prev => [...prev, { src: objectUrl, type: 'file', name: file.name, file: file, duration: Math.round(videoEl.duration) }]);
        };
        e.target.value = '';
    };

    const handleAddVideoUrl = () => {
        if (videos.length >= 2) {
            setFormError('Máximo 2 videos.');
            setTimeout(() => setFormError(''), 3000);
            return;
        }
        const url = prompt('Ingresá la URL del video (YouTube o Vimeo):');
        if (url && url.trim()) {
            setVideos(prev => [...prev, { src: url.trim(), type: 'url', name: 'Video URL' }]);
        }
    };

    const handleRemoveVideo = (index) => {
        setVideos(prev => prev.filter((_, i) => i !== index));
    };

    const handlePackageChange = (tier, field, value) => {
        if (field === 'price' || field === 'sessions') {
            const val = parseFloat(value);
            if (val < 0) return;
        }
        setPackages(prev => ({
            ...prev,
            [tier]: { ...prev[tier], [field]: value }
        }));
    };

    const handleTutoringPlanChange = (index, field, value) => {
        const newPlans = [...tutoringPlans];
        newPlans[index][field] = value;
        setTutoringPlans(newPlans);
    };

    const addTutoringPlan = () => {
        if (tutoringPlans.length < 5) {
            setTutoringPlans([...tutoringPlans, { name: `Plan ${tutoringPlans.length + 1}`, sessions: 1, price: '', description: '' }]);
        }
    };

    const removeTutoringPlan = (index) => {
        if (tutoringPlans.length > 2) {
            setTutoringPlans(tutoringPlans.filter((_, i) => i !== index));
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

    const handleNextOrSubmit = async (e) => {
        e.preventDefault();

        setFormError(''); // reset errors

        if (currentStep === 1 && !formData.subcategory?.trim()) {
            setFormError('Debes seleccionar una subcategoría para tu servicio.');
            return;
        }

        if (currentStep === 1 && formData.category === 'Profesionales Matriculados' && !formData.professionalBody?.trim()) {
            setFormError('El Colegio Universitario / Jurisdicción es obligatorio.');
            return;
        }

        if (currentStep === 1 && formData.bookingConfig?.requiresBooking) {
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

        // ── FINAL SUBMIT ──
        setIsSubmitting(true);
        setFormError('');
        setLoadingStatus('Iniciando...');

        if (!user) {
            setFormError('No estás autenticado. Por favor, inicia sesión para publicar tu servicio.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Upload images to Supabase Storage
            const imageUrls = [];
            for (let i = 0; i < images.length; i++) {
                setLoadingStatus(`Subiendo imagen ${i + 1}/${images.length}...`);
                const img = images[i];
                if (img.startsWith('data:')) {
                    // Base64 → upload to Storage
                    const response = await fetch(img);
                    const blob = await response.blob();
                    const fileName = `${user.id}/${Date.now()}_${i}.jpg`;
                    const { error: uploadErr } = await supabase.storage
                        .from('service-media')
                        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
                    if (uploadErr) {
                        console.error('Upload error:', uploadErr);
                        // Fallback: keep base64
                        imageUrls.push(img);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('service-media')
                            .getPublicUrl(fileName);
                        imageUrls.push(publicUrl);
                    }
                } else {
                    // Already a URL (editing existing service)
                    imageUrls.push(img);
                }
            }

            // Upload Videos to Supabase Storage
            const finalVideos = [];
            for (let i = 0; i < videos.length; i++) {
                setLoadingStatus(`Subiendo video ${i + 1}/${videos.length}...`);
                const vid = videos[i];
                if (vid.type === 'url') {
                    finalVideos.push(vid);
                } else if (vid.type === 'file' && vid.file) {
                    const ext = vid.file.name.split('.').pop();
                    const fileName = `${user.id}/video_${Date.now()}_${i}.${ext}`;
                    const { error: uploadErr } = await supabase.storage
                        .from('service-media')
                        .upload(fileName, vid.file, { contentType: vid.file.type, upsert: true });

                    if (uploadErr) {
                        console.error('Upload video error:', uploadErr);
                        throw new Error(`Fallo al subir el video: ${uploadErr.message}`);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('service-media')
                            .getPublicUrl(fileName);
                        finalVideos.push({ src: publicUrl, type: 'file', name: 'Video subido' });
                    }
                } else if (vid.type === 'file' && !vid.file) {
                    // editing existing file video
                    finalVideos.push(vid);
                }
            }

            const finalServiceData = {
                ...formData,
                id: initialData?.id || undefined,
                price: hasPackages
                    ? servicePackages[0].price
                    : formData.price,
                tags: tags,
                packages: hasPackages ? servicePackages : null,
                hasPackages: hasPackages,
                isSessionBased: isSessionBased,
                faqs: faqs.filter(f => f.question && f.answer),
                freelancerId: user.id,
                freelancerName: initialData?.freelancerName || user.first_name || user.username || user.company_name,
                level: initialData?.level || user.level || 1,
                images: imageUrls,
                image: imageUrls[0] || formData.imageUrl || null,
                videos: finalVideos,
                video: finalVideos[0]?.src || formData.videoUrl || null,
                mediaType: mediaType,
                bookingConfig: formData.bookingConfig?.requiresBooking ? formData.bookingConfig : null,
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
                    : null,
                participantMode: participantMode,
                fixedParticipants: participantMode === 'fixed' ? fixedParticipants : []
            };

            setLoadingStatus('Guardando servicio...');
            if (initialData) {
                await updateService(finalServiceData);
                setSuccessMessage('¡Servicio actualizado con éxito!');
            } else {
                await addService(finalServiceData);
                setSuccessMessage('¡Servicio publicado con éxito!');
            }
            
            setLoadingStatus('¡Listo!');
            
            // Navegar después de 2 segundos
            setTimeout(() => {
                onCancel();
            }, 2000);
        } catch (err) {
            console.error('Error saving service:', err);
            setFormError(`Error: ${err.message || JSON.stringify(err)}`);
            setIsSubmitting(false);
        }
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

            {successMessage && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'var(--bg-card)', zIndex: 10, display: 'flex', 
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{successMessage}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Redirigiendo a tu panel...</p>
                </div>
            )}

            <form onSubmit={handleNextOrSubmit} className="service-form mt-4" style={{ position: 'relative' }}>

                {formError && (
                    <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {formError}
                    </div>
                )}

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

                            {/* SUBCATEGORY SELECTION */}
                            {formData.category && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="work-mode-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Subcategoría</label>
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
                                            const isSelected = Array.isArray(formData.specialties)
                                                ? formData.specialties.includes(spec)
                                                : false;

                                            return (
                                                <div
                                                    key={spec}
                                                    className={`category-option ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        const current = Array.isArray(formData.specialties) ? formData.specialties : [];
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
                                        <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem' }}>
                                            * Selecciona al menos una especialidad antes de continuar.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {formData.category === 'Profesionales Matriculados' && (
                            <div className="form-group" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
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

                        <div className="form-group pricing-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                                <div className="form-row-pricing" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
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
                                    {!isSessionBased && (
                                        <>
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
                                        </>
                                    )}
                                </div>
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
                        
                        {/* IMAGES SECTION */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    📷 Imágenes del Servicio
                                </label>
                                <span style={{ fontSize: '0.85rem', color: images.length >= 5 ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {images.length}/5
                                </span>
                            </div>

                            {/* Image Preview Grid */}
                            {images.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {images.map((img, index) => (
                                        <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: index === 0 ? '2px solid var(--primary)' : '1px solid var(--border)', aspectRatio: '1' }}>
                                            <img src={img} alt={`Imagen ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {index === 0 && (
                                                <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>PORTADA</span>
                                            )}
                                            <button type="button" onClick={() => handleRemoveImage(index)} style={{
                                                position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', lineHeight: 1
                                            }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {images.length < 5 && (
                                <label style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '2rem', border: '2px dashed var(--border)', borderRadius: '10px', cursor: 'pointer',
                                    background: 'rgba(99, 102, 241, 0.03)', transition: 'all 0.2s', minHeight: images.length === 0 ? '120px' : '60px'
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.03)'; }}
                                >
                                    <input type="file" accept="image/*" multiple onChange={handleAddImages} style={{ display: 'none' }} />
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {images.length === 0 ? 'Click o arrastrá imágenes aquí' : `Agregar más (${5 - images.length} restantes)`}
                                    </span>
                                </label>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>La primera imagen será la portada del servicio.</p>
                        </div>

                        {/* VIDEOS SECTION */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    🎬 Videos del Servicio
                                </label>
                                <span style={{ fontSize: '0.85rem', color: videos.length >= 2 ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {videos.length}/2
                                </span>
                            </div>

                            {/* Video Previews */}
                            {videos.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {videos.map((vid, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            {vid.type === 'file' ? (
                                                <video src={vid.src} style={{ width: '120px', height: '68px', objectFit: 'cover', borderRadius: '6px', background: '#000' }} />
                                            ) : (
                                                <div style={{ width: '120px', height: '68px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                </div>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                    {vid.type === 'url' ? 'Video externo (URL)' : (vid.name || `Video ${index + 1}`)}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {vid.type === 'url' ? vid.src.substring(0, 40) + '...' : `${vid.duration || '?'}s`}
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveVideo(index)} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Quitar</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {videos.length < 2 && (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <label style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                        padding: '1.2rem', border: '2px dashed var(--border)', borderRadius: '10px', cursor: 'pointer',
                                        background: 'rgba(99, 102, 241, 0.03)', transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        <input type="file" accept="video/*" onChange={handleAddVideo} style={{ display: 'none' }} />
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Subir Video</span>
                                    </label>
                                    <button type="button" onClick={handleAddVideoUrl} style={{
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                        padding: '1.2rem', border: '2px dashed var(--border)', borderRadius: '10px', cursor: 'pointer',
                                        background: 'rgba(99, 102, 241, 0.03)', transition: 'all 0.2s', color: 'var(--text-muted)', fontSize: '0.8rem'
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                        URL de YouTube/Vimeo
                                    </button>
                                </div>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>Máximo 1 minuto por video. Formatos: MP4, WebM.</p>
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

                {formError && (
                    <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginTop: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {formError}
                    </div>
                )}

                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
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
                        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '0.8rem 2.5rem', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}>
                            {isSubmitting ? (loadingStatus || 'Procesando...') : (initialData ? 'Actualizar Servicio' : 'Publicar Servicio')}
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
