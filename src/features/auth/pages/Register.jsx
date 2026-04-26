import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomDropdown from '../../../components/common/CustomDropdown';
import CustomDatePicker from '../../../components/common/CustomDatePicker';
import { getArgentinaProvinces, getArgentinaCities } from '../../../utils/locationUtils';
import '../../../styles/pages/Register.scss';

const Register = () => {
    const [searchParams] = useSearchParams();
    const [role, setRole] = useState('freelancer');
    const [fileError, setFileError] = useState(null);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB Limit for local storage safety

    // V38: Safety shield for unmounted components
    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const STORAGE_KEY = 'cooplance_register_draft';

    // Sync role from query param on mount
    useEffect(() => {
        const queryRole = searchParams.get('role')?.toLowerCase();
        if (queryRole) {
            // Map common synonyms for more flexibility
            if (queryRole === 'client' || queryRole === 'comprador' || queryRole === 'compras' || queryRole === 'clientes' || queryRole === 'buyer') {
                setRole('buyer');
            } else if (queryRole === 'empresa' || queryRole === 'company' || queryRole === 'empresas') {
                setRole('company');
            } else if (queryRole === 'freelancer' || queryRole === 'talento' || queryRole === 'freelancers') {
                setRole('freelancer');
            }
        }
    }, [searchParams]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register, user, checkUserExists } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        birthDate: '',
        email: '',
        phone: '',
        bio: '',
        location: '',
        workMode: 'remote',
        companyName: '',
        responsibleFirstName: '',
        responsibleLastName: '',
        username: '',
        password: '',
        confirmPassword: '',
        documentType: 'dni',
        dni: '',
        documentFile: '',
        gender: 'male', // Default gender
        country: 'Argentina',
        currency: 'ARS',
        emailVerified: false,
        phoneVerified: false,
        termsAccepted: false,
        cuil_cuit: '', // NEW: For companies
        parentEmail: '', // V27: For minors
        cvFile: '', // Base64 string for CV image
        profileImage: '', // Base64 string for Profile Image
        province: '', // for companies location
        city: '' // for companies location
    });

    const [documentFileName, setDocumentFileName] = useState('');
    const [cvFileName, setCvFileName] = useState('');
    const [profileImageName, setProfileImageName] = useState('');
    const [calculatedAge, setCalculatedAge] = useState(null);
    const [invalidYear, setInvalidYear] = useState(false);
    const [parentValidationError, setParentValidationError] = useState(null); // V27: Parental validation error
    const [isValidatingParent, setIsValidatingParent] = useState(false); // V27: Validation state

    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    // --- FORM PERSISTENCE LOGIC (MOBILE SYNC) ---
    // 1. Load draft on Mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.role) setRole(draft.role);
                if (draft.formData) {
                    setFormData(prev => ({
                        ...prev,
                        ...draft.formData,
                        // Security: Never recover passwords from storage
                        password: '',
                        confirmPassword: ''
                    }));

                    // Recover file names only (not blobs)
                    if (draft.filenames) {
                        if (draft.filenames.document) setDocumentFileName(draft.filenames.document);
                        if (draft.filenames.cv) setCvFileName(draft.filenames.cv);
                        if (draft.filenames.profile) setProfileImageName(draft.filenames.profile);
                    }

                    // Recalculate age if birthDate exists
                    if (draft.formData.birthDate) {
                        const age = calculateAge(draft.formData.birthDate);
                        setCalculatedAge(age);
                    }
                }
            } catch (err) {
                console.error("Error loading register draft:", err);
            }
        }
    }, []);

    // 2. Sync changes to LocalStorage
    useEffect(() => {
        const syncDraft = () => {
            // We exclude passwords and blobs for security and storage limits
            const { password, confirmPassword, cvFile, profileImage, documentFile, ...safeFormData } = formData;
            const draft = {
                role,
                formData: safeFormData,
                filenames: {
                    document: documentFileName,
                    cv: cvFileName,
                    profile: profileImageName
                },
                updatedAt: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        };

        const timeoutId = setTimeout(syncDraft, 1000); // Debounce to avoid excessive writes
        return () => clearTimeout(timeoutId);
    }, [formData, role, documentFileName, cvFileName, profileImageName]);

    useEffect(() => {
        if (formData.country === 'Argentina' && role === 'company') {
            const fetchProvinces = async () => {
                setIsLoadingLoc(true);
                const provinces = await getArgentinaProvinces();
                if (isMounted.current) {
                    setArgProvinces(provinces);
                    setIsLoadingLoc(false);
                }
            };
            fetchProvinces();
        }
    }, [formData.country, role]);

    useEffect(() => {
        if (formData.country === 'Argentina' && formData.province && role === 'company') {
            const fetchCities = async () => {
                setIsLoadingLoc(true);
                // Strip the province name from the city format "City (Province)" if needed, 
                // but getArgentinaCities handles the full format.
                const cities = await getArgentinaCities(formData.province);
                if (isMounted.current) {
                    setArgCities(cities);
                    setIsLoadingLoc(false);
                }
            };
            fetchCities();
        } else {
            setArgCities([]);
        }
    }, [formData.province, formData.country, role]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // DNI Validation: Only numbers
        if (name === 'dni') {
            if (value && !/^\d+$/.test(value)) return;
        }

        setFormData({ ...formData, [name]: value });

        // Calculate age when birthDate changes
        if (name === 'birthDate' && value) {
            const birthYear = new Date(value).getFullYear();
            const currentYear = new Date().getFullYear();

            if (birthYear < 1920 || birthYear > currentYear) {
                setInvalidYear(true);
                setCalculatedAge(null);
            } else {
                setInvalidYear(false);
                const age = calculateAge(value);
                setCalculatedAge(age);
            }
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDocumentFileName(file.name);
            // For now, we only store the name for the ID document as per original logic
            // In a real app, this should also be readAsDataURL or uploaded
            setFormData({ ...formData, documentFile: file.name });
        }
    };

    // Helper: Compress Image to reduce Base64 size (Quota Fix)
    const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.6) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG with reduced quality
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => {
                    console.warn("Could not load image for compression, using original.", err);
                    resolve(event.target.result); // Fallback to original if load fails (e.g. unknown format)
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleCvChange = async (e) => {
        const file = e.target.files[0];
        setFileError(null);

        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setFileError(`El archivo "${file.name}" es demasiado grande (Máx: 2MB). Por favor, usa una imagen más liviana.`);
                e.target.value = ''; // Reset input
                return;
            }

            setCvFileName(file.name);
            try {
                const compressed = await compressImage(file);
                setFormData(prev => ({ ...prev, cvFile: compressed }));
            } catch (err) {
                console.error("CV Compression error:", err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, cvFile: reader.result }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleProfileImageChange = async (e) => {
        const file = e.target.files[0];
        setFileError(null);

        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setFileError(`La imagen de perfil "${file.name}" excede los 2MB limitantes. Intenta con una imagen optimizada.`);
                e.target.value = ''; // Reset
                return;
            }

            setProfileImageName(file.name);
            try {
                const compressed = await compressImage(file);
                setFormData(prev => ({ ...prev, profileImage: compressed }));
            } catch (err) {
                console.error("Profile image compression error:", err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, profileImage: reader.result }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || isLoadingLoc || isValidatingParent) return;
        setParentValidationError(null);

        // Required Fields Basic Check
        if (role === 'company') {
            if (!formData.companyName) { alert("El nombre de la empresa es obligatorio."); return; }
            if (!formData.responsibleFirstName || !formData.responsibleLastName) { alert("El nombre y apellido del responsable son obligatorios."); return; }
            if (!formData.cuil_cuit) { alert("El CUIT/CUIL de la empresa es obligatorio."); return; }
        } else {
            if (!formData.username) { alert("El nombre de usuario es obligatorio."); return; }
            if (!formData.firstName || !formData.lastName) { alert("Nombre y Apellido son obligatorios."); return; }
        }

        const isBioRequired = role !== 'buyer';
        if (isBioRequired) {
            if (!formData.bio || formData.bio.trim().length < 15) {
                alert("La biografía es obligatoria y debe tener al menos 15 caracteres.");
                return;
            }
        } else if (formData.bio && formData.bio.trim().length > 0 && formData.bio.trim().length < 15) {
            alert("Si decides incluir una biografía, esta debe tener al menos 15 caracteres.");
            return;
        }

        // V27/V38: Parental Validation for Minors (16-17)
        if (calculatedAge !== null && calculatedAge >= 16 && calculatedAge < 18) {
            // Mandatory for freelancers
            if (role === 'freelancer' && !formData.parentEmail) {
                setParentValidationError("El email del padre/tutor es obligatorio para freelancers menores de 18 años.");
                alert("Se requiere el email de un adulto responsable.");
                return;
            }

            // Optional but recommended for buyers - only validate if provided
            if (formData.parentEmail) {
                setIsValidatingParent(true);
                setLoading(true);
                const parentResult = await validateParent(formData.parentEmail);
                setIsValidatingParent(false);

                if (!parentResult.valid) {
                    setParentValidationError(parentResult.error);
                    alert(`Error de Tutor: ${parentResult.error}`);
                    setLoading(false);
                    return;
                }
                // Save parentId for registration payload
                formData.parentId = parentResult.parentId;
            }
        }

        // Password validation
        if (formData.password !== formData.confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }
        if (formData.password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        // Age validation
        if (role !== 'company' && formData.birthDate) {
            const birthYear = new Date(formData.birthDate).getFullYear();
            const currentYear = new Date().getFullYear();

            if (birthYear < 1920 || birthYear > currentYear) {
                alert("Por favor ingresa una fecha de nacimiento válida.");
                return;
            }

            const age = calculateAge(formData.birthDate);
            if (role === 'freelancer' && age < 16) {
                alert("Debes tener al menos 16 años para registrarte como freelancer.");
                return;
            }
            if (role === 'buyer' && age < 14) {
                alert("Debes tener al menos 14 años para registrarte como cliente.");
                return;
            }
        }

        if (role === 'freelancer' && (!formData.dni || formData.dni.length < 6)) {
            alert("Por favor ingresa un número de DNI / Documento válido.");
            return;
        }

        if (!formData.email) {
            alert("El correo electrónico es obligatorio.");
            return;
        }

        if (!formData.termsAccepted) {
            alert("Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.");
            return;
        }

        const cleanUsername = formData.username ? formData.username.trim() : '';
        if (role !== 'company' && cleanUsername.length < 3) {
            alert("El nombre de usuario debe tener al menos 3 caracteres.");
            return;
        }

        setLoading(true);
        console.log(" [REGISTER] Iniciando proceso de registro...");

        // Watchdog: Force loading to false after 30s if everything hangs
        const loadingWatchdog = setTimeout(() => {
            if (isMounted.current) {
                console.warn(" [REGISTER] Watchdog activado: El proceso de registro ha excedido los 30s.");
                setLoading(false);
            }
        }, 30000);

        try {
            // Check for duplicate fields in Database (V30: Expanded uniqueness)
            console.log(" [REGISTER] Comprobando disponibilidad de datos únicos...");
            const { exists, field } = await checkUserExists({
                username: role !== 'company' ? cleanUsername : undefined,
                companyName: role === 'company' ? formData.companyName : undefined,
                email: formData.email,
                dni: role === 'freelancer' ? formData.dni : undefined,
                cuil_cuit: role === 'company' ? formData.cuil_cuit : undefined,
                phone: formData.phone || undefined
            });

            if (exists) {
                console.log(` [REGISTER] Conflicto detectado: ${field} ya existe.`);
                let errorMsg = "El usuario ya existe.";
                if (field === 'username') errorMsg = "El nombre de usuario ya está registrado.";
                if (field === 'company_name') errorMsg = "Ese nombre de empresa ya está registrado.";
                if (field === 'email') errorMsg = "El correo electrónico ya está registrado.";
                if (field === 'dni') errorMsg = "El DNI ya se encuentra registrado con otra cuenta.";
                if (field === 'cuil_cuit') errorMsg = "El CUIT/CUIL ya se encuentra registrado con otra cuenta.";
                if (field === 'phone') errorMsg = "El número de teléfono ya está en uso.";

                alert(errorMsg);
                clearTimeout(loadingWatchdog);
                if (isMounted.current) setLoading(false);
                return;
            }

            const { sanitizeText } = await import('../../../utils/security');
            const registrationData = {
                ...formData,
                firstName: sanitizeText(formData.firstName),
                lastName: sanitizeText(formData.lastName),
                companyName: sanitizeText(formData.companyName),
                responsibleFirstName: sanitizeText(formData.responsibleFirstName),
                responsibleLastName: sanitizeText(formData.responsibleLastName),
                bio: sanitizeText(formData.bio),
                dob: role !== 'company' ? formData.birthDate : null,
                dni: role === 'freelancer' ? formData.dni : null,
                gender: role === 'company' ? 'other' : formData.gender,
                terms_accepted: formData.termsAccepted,
                profileImage: formData.profileImage,
                cvFile: formData.cvFile
            };

            // Set username default for companies if not present (though usually it is not in the form)
            if (role === 'company' && !cleanUsername) {
                registrationData.username = registrationData.email.split('@')[0];
            } else if (cleanUsername) {
                registrationData.username = cleanUsername;
            }
            if (registrationData.email) registrationData.email = registrationData.email.toLowerCase();

            // 1. INTENTO DE REGISTRO
            console.log(" [REGISTER] Llamando a supabase.auth.signUp...");
            try {
                await register(role, registrationData);
            } catch (regErr) {
                console.error(" [REGISTER] Fallo en signUp:", regErr);
                // Si Supabase dice que ya existe, detenemos todo aquí
                if (regErr.message.includes("User already registered") || regErr.message.includes("already exist")) {
                    alert("Este correo electrónico ya está registrado. Por favor, inicia sesión o usa otro correo.");
                    clearTimeout(loadingWatchdog);
                    setLoading(false);
                    return;
                }
                throw regErr;
            }

            // Supabase sends the OTP email automatically on signUp
            // Navigate to the verification page
            console.log(" [REGISTER] SignUp exitoso. Supabase enviará el OTP al email.");
            clearTimeout(loadingWatchdog);

            navigate('/verify-email', {
                state: { email: registrationData.email, type: 'registration' }
            });

            // 3. Cleanup Persistence on Success
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.error(' [REGISTER] Error fatal durante el proceso:', err);

            // Fix for the {} alert: Extract the message if it's an Error object
            const errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            if (isMounted.current) {
                setError(`Error: ${errorMessage}`);
                alert(`Error de Registro: ${errorMessage}`);
            }

            clearTimeout(loadingWatchdog);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <div className="container register-container">
            <div className="glass register-card">
                <h2 className="register-title">Únete a Cooplance (Beta)</h2>

                <div className="role-selector">
                    {['freelancer', 'buyer', 'company'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`role-button ${role === r ? 'active' : 'inactive'}`}
                        >
                            {r === 'freelancer' ? 'Freelancer' : r === 'buyer' ? 'Cliente' : 'Empresa'}
                        </button>
                    ))}
                </div>


                <form onSubmit={handleSubmit} className="register-form">

                    {fileError && (
                        <div className="file-error-container">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div>
                                <strong>Error de Archivo</strong>
                                {fileError}
                            </div>
                        </div>
                    )}

                    {/* 1. Username or Company Name */}
                    {role !== 'company' ? (
                        <input type="text" name="username" value={formData.username} placeholder="Nombre de Usuario" onChange={handleChange} required maxLength={25} />
                    ) : (
                        <input type="text" name="companyName" value={formData.companyName} placeholder="Nombre de la Empresa" onChange={handleChange} required />
                    )}

                    {/* 2. First Name & Last Name / Responsible Name */}
                    {role === 'company' ? (
                        <div className="form-grid-2">
                            <input type="text" name="responsibleFirstName" value={formData.responsibleFirstName} placeholder="Nombre del Responsable" onChange={handleChange} required maxLength={15} />
                            <input type="text" name="responsibleLastName" value={formData.responsibleLastName} placeholder="Apellido del Responsable" onChange={handleChange} required maxLength={15} />
                        </div>
                    ) : (
                        <div className="form-grid-2">
                            <input type="text" name="firstName" value={formData.firstName} placeholder="Nombre" onChange={handleChange} required maxLength={15} />
                            <input type="text" name="lastName" value={formData.lastName} placeholder="Apellido" onChange={handleChange} required maxLength={15} />
                        </div>
                    )}

                    {/* 3. Bio / Description */}
                    {role !== 'buyer' && (
                        <textarea name="bio" value={formData.bio} placeholder={role === 'company' ? "Biografía / Descripción de la Empresa" : "Cuéntanos sobre ti (Biografía)"} rows="3" onChange={handleChange} required />
                    )}

                    {/* 4. Birth Date */}
                    {role !== 'company' && (
                        <div className="form-group">
                            <CustomDatePicker
                                label="Fecha de Nacimiento"
                                selected={formData.birthDate}
                                onChange={(val) => {
                                    setFormData(p => ({ ...p, birthDate: val }));
                                    // Trigger age calculation logic
                                    const birthYear = new Date(val).getFullYear();
                                    const currentYear = new Date().getFullYear();
                                    if (birthYear < 1920 || birthYear > currentYear) {
                                        setInvalidYear(true);
                                        setCalculatedAge(null);
                                    } else {
                                        setInvalidYear(false);
                                        setCalculatedAge(calculateAge(val));
                                    }
                                }}
                                required={true}
                                maxDate={new Date().toISOString().split('T')[0]}
                            />
                            {invalidYear && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    Por favor ingresa una fecha de nacimiento válida (año entre 1920 y {new Date().getFullYear()}).
                                </p>
                            )}
                            {/* Freelancer Validation */}
                            {!invalidYear && calculatedAge !== null && role === 'freelancer' && calculatedAge < 16 && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    Debes tener al menos 16 años para registrarte como freelancer.
                                </p>
                            )}
                            {!invalidYear && calculatedAge !== null && role === 'freelancer' && calculatedAge >= 16 && calculatedAge < 18 && (
                                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    Al ser menor de 18 años, puedes registrarte como freelancer pero no podrás postularte a ofertas de empresas.
                                </p>
                            )}

                            {/* Buyer/Client Validation */}
                            {!invalidYear && calculatedAge !== null && role === 'buyer' && calculatedAge < 14 && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    Debes tener al menos 14 años para registrarte como cliente.
                                </p>
                            )}
                            {!invalidYear && calculatedAge !== null && role === 'buyer' && calculatedAge >= 14 && calculatedAge < 18 && (
                                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    Al ser menor de 18 años, solo podrás contratar servicios digitales (remotos).
                                </p>
                            )}
                        </div>
                    )}

                    {/* 5. Identity Verification */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        {role === 'freelancer' && (
                            <>
                                <p className="field-label-sm" style={{ marginBottom: '0.5rem' }}>
                                    Datos de Identidad (Obligatorio)
                                </p>

                                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                                    <select name="documentType" value={formData.documentType} onChange={handleChange} style={{ height: '45px' }}>
                                        <option value="dni">DNI</option>
                                        <option value="passport">Pasaporte</option>
                                        <option value="selfie">Cédula</option>
                                    </select>
                                    <input
                                        type="text"
                                        name="dni"
                                        value={formData.dni}
                                        placeholder="Número de Documento"
                                        onChange={handleChange}
                                        required
                                        style={{ margin: 0, height: '45px' }}
                                    />
                                </div>
                            </>
                        )}

                        {/* CUIT Field only for companies */}
                        {role === 'company' && (
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <p className="field-label-sm" style={{ marginBottom: '0.5rem' }}>
                                    Datos de la Empresa
                                </p>
                                <input
                                    type="text"
                                    name="cuil_cuit"
                                    value={formData.cuil_cuit}
                                    placeholder="CUIT / CUIL de la Empresa"
                                    onChange={handleChange}
                                    required
                                    style={{ margin: 0, height: '45px', width: '100%' }}
                                />
                            </div>
                        )}

                        {/* V27/V38: Parental Email for Minors (16-17 years) */}
                        {calculatedAge !== null && calculatedAge >= 16 && calculatedAge < 18 && role !== 'company' && (
                            <div
                                className="form-group"
                                style={{
                                    marginBottom: '1rem',
                                    padding: '1rem',
                                    background: role === 'freelancer' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)',
                                    borderRadius: '8px',
                                    border: `1px solid ${role === 'freelancer' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                                }}
                            >
                                <p className="field-label-sm" style={{ marginBottom: '0.5rem', color: role === 'freelancer' ? '#ef4444' : '#3b82f6' }}>
                                    {role === 'freelancer' ? 'Autorización Parental Requerida' : 'Supervisión Parental (Recomendado)'}
                                </p>
                                <input
                                    type="email"
                                    name="parentEmail"
                                    value={formData.parentEmail}
                                    placeholder="Email de tu Padre, Madre o Tutor"
                                    onChange={handleChange}
                                    required={role === 'freelancer'}
                                    style={{ margin: 0, height: '45px', width: '100%' }}
                                />
                                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
                                    {role === 'freelancer'
                                        ? '* El tutor debe ser un Freelancer mayor de 18 años registrado en Cooplance.'
                                        : '* Recomendado. Vincular un tutor elimina el límite de gasto mensual y permite contratar servicios presenciales.'}
                                </p>
                                {parentValidationError && (
                                    <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem' }}>
                                        {parentValidationError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {role === 'freelancer' && (
                        <>
                            <label className="custom-file-upload" style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input type="file" name="documentFile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                <span>{documentFileName || 'Subir Foto del Documento (Frente)'}</span>
                            </label>
                            <span className="file-limit-info">Identidad: Máx 2MB</span>
                        </>
                    )}

                    {/* 6. Country & Location */}
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <CustomDropdown
                            label="País"
                            value={formData.country}
                            onChange={(val) => setFormData({ ...formData, country: val })}
                            options={[
                                'Argentina', 'Chile', 'Colombia', 'España',
                                'México', 'Perú', 'Uruguay', 'Otros'
                            ]}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <p className="field-label-sm">Ubicación física (opcional)</p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: formData.country === 'Argentina' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                            gap: '1rem'
                        }}>
                            {formData.country === 'Argentina' ? (
                                <>
                                    <CustomDropdown
                                        options={argProvinces.map(prov => ({ label: prov, value: prov }))}
                                        value={formData.province}
                                        onChange={(val) => {
                                            setFormData({ ...formData, province: val, city: '' });
                                        }}
                                        placeholder="Provincia"
                                        searchable={true}
                                    />
                                    <CustomDropdown
                                        options={argCities.map(city => ({ label: city, value: city }))}
                                        value={formData.city}
                                        onChange={(val) => {
                                            setFormData({ ...formData, city: val });
                                        }}
                                        placeholder={isLoadingLoc ? "Cargando..." : "Ciudad"}
                                        searchable={true}
                                        disabled={!formData.province || isLoadingLoc}
                                    />
                                </>
                            ) : (
                                <>
                                    <input type="text" name="province" placeholder="Provincia / Estado" onChange={handleChange} value={formData.province || ''} />
                                    <input type="text" name="city" placeholder="Ciudad" onChange={handleChange} value={formData.city || ''} />
                                </>
                            )}
                        </div>

                        {formData.province && formData.city && (
                            <input
                                type="text"
                                name="location"
                                value={formData.location || ''}
                                placeholder="Calle y Numeración (Opcional)"
                                onChange={handleChange}
                                style={{ marginTop: '0.9rem' }}
                            />
                        )}
                    </div>

                    {/* 7. Gender */}
                    {role !== 'company' && (
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <p className="field-label-sm">Género (para tu avatar predeterminado)</p>
                            <div className="gender-selector">
                                <button
                                    type="button"
                                    className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                                >
                                    Hombre
                                </button>
                                <button
                                    type="button"
                                    className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                                >
                                    Mujer
                                </button>
                                <button
                                    type="button"
                                    className={`gender-btn ${formData.gender === 'other' ? 'active' : ''}`}
                                    onClick={() => setFormData({ ...formData, gender: 'other' })}
                                >
                                    Prefiero no decirlo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 8. Profile Image Upload (All Roles) */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="field-label-sm" style={{ display: 'block', marginBottom: '0.5rem' }}>Imagen de Perfil (Opcional)</label>
                        <label className="custom-file-upload" style={{ width: '100%' }}>
                            <input type="file" name="profileImage" accept="image/*" onChange={handleProfileImageChange} style={{ display: 'none' }} />
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                {profileImageName || 'Subir Imagen (JPG, PNG)'}
                            </span>
                        </label>
                        <span className="file-limit-info">Foto: Máx 2MB</span>
                    </div>

                    {/* 9. CV Upload (Only for Freelancer) */}
                    {role === 'freelancer' && (
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="field-label-sm" style={{ display: 'block', marginBottom: '0.5rem' }}>Hoja de Vida / CV (Imagen)</label>
                            <label className="custom-file-upload" style={{ width: '100%' }}>
                                <input type="file" name="cvFile" accept="image/*" onChange={handleCvChange} style={{ display: 'none' }} />
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    {cvFileName || 'Subir CV (JPG, PNG)'}
                                </span>
                            </label>
                            <span className="file-limit-info">CV: Máx 2MB</span>
                        </div>
                    )}

                    {/* 10. & 11. Contact Info */}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Información de Contacto y Acceso:</p>
                    <input type="email" name="email" value={formData.email || ''} placeholder="Correo Electrónico (Obligatorio)" onChange={handleChange} autoComplete="email" required />
                    <input type="tel" name="phone" value={formData.phone || ''} placeholder="Celular (Opcional)" onChange={handleChange} autoComplete="tel" />

                    {/* 12. Passwords */}
                    <div className="form-grid-2">
                        <input type="password" name="password" value={formData.password || ''} placeholder="Contraseña" onChange={handleChange} autoComplete="new-password" required />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} placeholder="Repetir Contraseña" onChange={handleChange} autoComplete="new-password" required />
                    </div>

                    {/* 13. Terms & Privacy Checkbox */}
                    <div
                        className="terms-container"
                        onClick={() => setFormData({ ...formData, termsAccepted: !formData.termsAccepted })}
                    >
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                id="termsAccepted"
                                name="termsAccepted"
                                checked={formData.termsAccepted}
                                onChange={() => { }} // Controlled component
                            />
                            <span className="checkmark"></span>
                        </div>
                        <div className="terms-text">
                            He leído y acepto los <a href="/help?tab=terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Términos y Condiciones</a> y la <a href="/help?tab=privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Política de Privacidad</a> de Cooplance.
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary btn-register"
                        style={{ width: '100%', marginTop: '2rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Preparando registro...' : 'Registrarse'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;
