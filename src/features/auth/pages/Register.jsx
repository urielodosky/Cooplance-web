import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { otpService } from '../../../utils/otpService';
import CustomDropdown from '../../../components/common/CustomDropdown';
import '../../../styles/pages/Register.scss';

const Register = () => {
    const [role, setRole] = useState('freelancer');
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
        documentFile: '',
        gender: 'male', // Default gender
        country: 'Argentina',
        currency: 'ARS',
        emailVerified: false,
        currency: 'ARS',
        emailVerified: false,
        phoneVerified: false,
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
    }, [formData.country, role]);

    useEffect(() => {
        if (formData.country === 'Argentina' && formData.province && role === 'company') {
            const fetchCities = async () => {
                try {
                    setIsLoadingLoc(true);
                    const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(formData.province)}&campos=nombre&max=1000`);
                    const data = await res.json();
                    const names = data.localidades.map(m => m.nombre).sort();
                    setArgCities([...new Set(names)]);
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
    }, [formData.province, formData.country, role]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        // Calculate age when birthDate changes
        if (e.target.name === 'birthDate' && e.target.value) {
            const birthYear = new Date(e.target.value).getFullYear();
            const currentYear = new Date().getFullYear();

            if (birthYear < 1920 || birthYear > currentYear) {
                setInvalidYear(true);
                setCalculatedAge(null);
            } else {
                setInvalidYear(false);
                const age = calculateAge(e.target.value);
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

    const handleSubmit = (e) => {
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

            // Validate reasonable birth year
            if (birthYear < 1920 || birthYear > currentYear) {
                alert("Por favor ingresa una fecha de nacimiento válida.");
                return;
            }

            const age = calculateAge(formData.birthDate);
            if (role === 'freelancer' && age < 14) {
                alert("Debes tener al menos 14 años para registrarte como freelancer.");
                return;
            }
            if (role === 'company' && age < 18) {
                alert("El responsable debe tener al menos 18 años para registrar una empresa.");
                return;
            }
        }

        // Identity verification is mandatory for freelancers and companies
        if ((role === 'freelancer' || role === 'company') && !formData.documentFile) {
            alert("La verificación de identidad es obligatoria. Por favor sube un documento.");
            return;
        }

        // At least one contact method required
        if (!formData.email && !formData.phone) {
            alert("Debes proporcionar al menos un método de contacto (correo electrónico o teléfono).");
            return;
        }

        const cleanUsername = formData.username ? formData.username.trim() : '';

        // Username validation
        if (cleanUsername && cleanUsername.length < 3) {
            alert("El nombre de usuario debe tener al menos 3 caracteres.");
            return;
        }

        // Check for duplicates
        // Case-insensitive duplicate check
        const { exists, field } = checkUserExists({
            username: cleanUsername,
            email: formData.email,
            phone: formData.phone
        });

        if (exists) {
            let errorMsg = "El usuario ya existe.";
            if (field === 'username') errorMsg = "El nombre de usuario ya está registrado.";
            if (field === 'email') errorMsg = "El correo electrónico ya está registrado.";
            if (field === 'phone') errorMsg = "El número de teléfono ya está registrado.";

            alert(errorMsg);
            setLoading(false);
            return;
        }

        // Exclude confirmPassword from data sent to auth
        // Also normalize username and email to lowercase for storage
        const { confirmPassword, ...registrationData } = formData;

        // Default username for companies if hidden/missing
        if (role === 'company' && !cleanUsername) {
            registrationData.username = registrationData.email ? registrationData.email.split('@')[0] : 'empresa_' + Math.floor(Math.random() * 1000);
        } else if (cleanUsername) {
            registrationData.username = cleanUsername.toLowerCase();
        }

        if (registrationData.email) registrationData.email = registrationData.email.toLowerCase();
        // gender is already in formData and will be included in registrationData

        // If email is provided, verify it first via separate page
        if (formData.email) {
            setLoading(true);
            // BYPASS: Direct navigation to verification for testing
            setTimeout(() => {
                setLoading(false);
                navigate('/verify-email', {
                    state: {
                        email: formData.email,
                        role,
                        type: 'registration',
                        userData: registrationData,
                        initialDebugOtp: '123456'
                    }
                });
            }, 500);
        } else {
            // Direct registration if no email (only phone, though we should probably verify phone too)
            register(role, registrationData);
            navigate('/dashboard');
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
                            {r === 'freelancer' ? 'Freelancer' : r === 'buyer' ? 'Comprador' : 'Empresa'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="register-form">

                    {/* 1. Username or Company Name */}
                    {role !== 'company' ? (
                        <input type="text" name="username" placeholder="Nombre de Usuario" onChange={handleChange} required maxLength={25} />
                    ) : (
                        <input type="text" name="companyName" placeholder="Nombre de la Empresa" onChange={handleChange} required />
                    )}

                    {/* 2. First Name & Last Name / Responsible Name */}
                    {role === 'company' ? (
                        <input type="text" name="responsibleName" placeholder="Nombre del Responsable" onChange={handleChange} required maxLength={15} />
                    ) : (
                        <div className="form-grid-2">
                            <input type="text" name="firstName" placeholder="Nombre" onChange={handleChange} required maxLength={15} />
                            <input type="text" name="lastName" placeholder="Apellido" onChange={handleChange} required maxLength={15} />
                        </div>
                    )}

                    {/* 3. Bio / Description */}
                    <textarea name="bio" placeholder={role === 'company' ? "Biografía / Descripción de la Empresa" : "Cuéntanos sobre ti (Biografía)"} rows="3" onChange={handleChange} required />

                    {/* 4. Birth Date (Only for freelancer and buyer) */}
                    {role !== 'company' && (
                        <>
                            <input type="date" name="birthDate" onChange={handleChange} required />
                            {invalidYear && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    Por favor ingresa una fecha de nacimiento válida (año entre 1920 y {new Date().getFullYear()}).
                                </p>
                            )}
                            {!invalidYear && calculatedAge !== null && calculatedAge < 14 && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    Debes tener al menos 14 años para registrarte como freelancer.
                                </p>
                            )}
                            {!invalidYear && calculatedAge !== null && calculatedAge >= 14 && calculatedAge < 18 && (
                                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    Al ser menor de 18 años, puedes registrarte como freelancer pero no podrás postularte a empresas.
                                </p>
                            )}
                        </>
                    )}

                    {/* 5. Identity Verification (For freelancers and companies) */}
                    {(role === 'freelancer' || role === 'company') && (
                        <div className="form-grid-2">
                            <select name="documentType" onChange={handleChange}>
                                <option value="dni">Verificación: DNI</option>
                                <option value="passport">Verificación: Pasaporte</option>
                                <option value="selfie">Verificación: Selfie + IA</option>
                            </select>
                            <label className="custom-file-upload">
                                <input type="file" name="documentFile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                <span>{documentFileName || 'Subir Documento'}</span>
                            </label>
                        </div>
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
                    {role === 'company' && (
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <p className="field-label-sm">Ubicación física (opcional)</p>
                            <div className="form-grid-2">
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
                    <input type="email" name="email" placeholder="Correo Electrónico (Obligatorio)" onChange={handleChange} required />
                    <input type="tel" name="phone" placeholder="Celular (Opcional)" onChange={handleChange} />

                    {/* 12. Passwords */}
                    <div className="form-grid-2">
                        <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />
                        <input type="password" name="confirmPassword" placeholder="Repetir Contraseña" onChange={handleChange} required />
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
