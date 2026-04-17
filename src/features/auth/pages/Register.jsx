import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomDropdown from '../../../components/common/CustomDropdown';
import CustomDatePicker from '../../../components/common/CustomDatePicker';
import { getArgentinaProvinces, getArgentinaCities } from '../../../utils/locationUtils';
import '../../../styles/pages/Register.scss';

const Register = () => {
    const [searchParams] = useSearchParams();
    const [role, setRole] = useState('freelancer');

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
        responsibleName: '',
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

    const [argProvinces, setArgProvinces] = useState([]);
    const [argCities, setArgCities] = useState([]);
    const [isLoadingLoc, setIsLoadingLoc] = useState(false);

    useEffect(() => {
        if (formData.country === 'Argentina' && role === 'company') {
            const fetchProvinces = async () => {
                setIsLoadingLoc(true);
                const provinces = await getArgentinaProvinces();
                setArgProvinces(provinces);
                setIsLoadingLoc(false);
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
                // For Register, we might want just the city name or keep the format for consistency
                setArgCities(cities);
                setIsLoadingLoc(false);
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

    const handleCvChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCvFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, cvFile: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profileImage: reader.result }));
            };
            reader.readAsDataURL(file);
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
        if (formData.birthDate) {
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
            if (role === 'company' && age < 18) {
                alert("El responsable debe tener al menos 18 años para registrar una empresa.");
                return;
            }
            if (role === 'buyer' && age < 14) {
                alert("Debes tener al menos 14 años para registrarte como cliente.");
                return;
            }
        }

        if (!formData.dni || formData.dni.length < 6) {
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
        if (cleanUsername && cleanUsername.length < 3) {
            alert("El nombre de usuario debe tener al menos 3 caracteres.");
            return;
        }

        setLoading(true);
        console.log(" [REGISTER] Iniciando proceso de registro...");

        // Watchdog: Force loading to false after 30s if everything hangs
        const loadingWatchdog = setTimeout(() => {
            console.warn(" [REGISTER] Watchdog activado: El proceso de registro ha excedido los 30s.");
            setLoading(false);
        }, 30000);

        try {
            // Check for duplicate username/email in Database
            console.log(" [REGISTER] Comprobando disponibilidad de usuario/email...");
            const { exists, field } = await checkUserExists({
                username: cleanUsername || undefined,
                email: formData.email,
            });

            if (exists) {
                console.log(` [REGISTER] Conflicto detectado: ${field} ya existe.`);
                let errorMsg = "El usuario ya existe.";
                if (field === 'username') errorMsg = "El nombre de usuario ya está registrado.";
                if (field === 'email') errorMsg = "El correo electrónico ya está registrado.";
                alert(errorMsg);
                clearTimeout(loadingWatchdog);
                setLoading(false);
                return;
            }

            const registrationData = {
                ...formData,
                dob: formData.birthDate,
                dni: formData.dni,
                terms_accepted: formData.termsAccepted,
                profileImage: formData.profileImage, 
                cvFile: formData.cvFile
            };

            // Set username default for companies
            if (role === 'company' && !cleanUsername) {
                registrationData.username = registrationData.email.split('@')[0];
            } else if (cleanUsername) {
                registrationData.username = cleanUsername.toLowerCase();
            }
            if (registrationData.email) registrationData.email = registrationData.email.toLowerCase();

            // 1. INTENTO DE REGISTRO TEMPRANO
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
        } catch (err) {
            console.error(" [REGISTER] Error fatal durante el proceso:", err);
            alert(err.message || 'Error al procesar el registro. Inténtalo de nuevo.');
        } finally {
            console.log(" [REGISTER] Finalizando estado de carga.");
            clearTimeout(loadingWatchdog);
            setLoading(false);
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

                    {/* 1. Username or Company Name */}
                    {role !== 'company' ? (
                        <input type="text" name="username" value={formData.username} placeholder="Nombre de Usuario" onChange={handleChange} required maxLength={25} />
                    ) : (
                        <input type="text" name="companyName" value={formData.companyName} placeholder="Nombre de la Empresa" onChange={handleChange} required />
                    )}

                    {/* 2. First Name & Last Name / Responsible Name */}
                    {role === 'company' ? (
                        <input type="text" name="responsibleName" value={formData.responsibleName} placeholder="Nombre del Responsable" onChange={handleChange} required maxLength={15} />
                    ) : (
                        <div className="form-grid-2">
                            <input type="text" name="firstName" value={formData.firstName} placeholder="Nombre" onChange={handleChange} required maxLength={15} />
                            <input type="text" name="lastName" value={formData.lastName} placeholder="Apellido" onChange={handleChange} required maxLength={15} />
                        </div>
                    )}

                    {/* 3. Bio / Description */}
                    <textarea name="bio" placeholder={role === 'company' ? "Biografía / Descripción de la Empresa" : "Cuéntanos sobre ti (Biografía)"} rows="3" onChange={handleChange} required />

                    {/* 4. Birth Date (Only for freelancer and buyer) */}
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

                            {/* Company Validation */}
                            {!invalidYear && calculatedAge !== null && role === 'company' && calculatedAge < 18 && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    El responsable de la empresa debe tener al menos 18 años.
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

                    {/* 5. Identity Verification (For all roles now as per user request) */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <p className="field-label-sm" style={{ marginBottom: '0.5rem' }}>Datos de Identidad (Obligatorio)</p>
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
                        {(role === 'freelancer' || role === 'company') && (
                            <label className="custom-file-upload" style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input type="file" name="documentFile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                <span>{documentFileName || 'Subir Foto del Documento (Frente)'}</span>
                            </label>
                        )}
                    </div>

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
                    {role === 'company' && (
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
                                        <input type="text" name="province" placeholder="Provincia / Estado" onChange={handleChange} />
                                        <input type="text" name="city" placeholder="Ciudad" onChange={handleChange} />
                                    </>
                                )}
                            </div>
                            <input type="text" name="location" placeholder="Calle y Numeración" onChange={handleChange} style={{ marginTop: '0.9rem' }} />
                        </div>
                    )}

                    {/* 7. Gender */}
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
                                onChange={() => {}} // Controlled component
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
