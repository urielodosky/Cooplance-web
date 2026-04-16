import React, { useState, useRef } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CustomDropdown from '../components/common/CustomDropdown';
import { getProfilePicture } from '../utils/avatarUtils';
import { supabase } from '../lib/supabase';
import '../styles/pages/Settings.scss';

const Settings = () => {
    const { user, updateUser, checkUserExists, deleteAccount, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [username, setUsername] = useState(user?.username || '');
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [companyName, setCompanyName] = useState(user?.company_name || '');
    const [responsibleName, setResponsibleName] = useState(user?.responsible_name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [location, setLocation] = useState(user?.location || '');
    const [country, setCountry] = useState(user?.country || 'Argentina');
    const [workHours, setWorkHours] = useState(user?.work_hours || '');
    const [paymentMethods, setPaymentMethods] = useState(user?.payment_methods || '');
    const [vacancies, setVacancies] = useState(user?.vacancies || '');
    const [isEditingBioInline, setIsEditingBioInline] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [dni, setDni] = useState(user?.dni || '');
    const [dob, setDob] = useState(user?.dob || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [gender, setGender] = useState(user?.gender || 'male');
    const [message, setMessage] = useState({ text: '', type: '' });
    const fileInputRef = useRef(null);
    const cvInputRef = useRef(null);
    const [cvFile, setCvFile] = useState(user?.cv_url || '');

    // Sync state with user object when it changes (e.g. after update or load)
    React.useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setCompanyName(user.company_name || '');
            setResponsibleName(user.responsible_name || '');
            setBio(user.bio || '');
            setLocation(user.location || '');
            setCountry(user.country || 'Argentina');
            setWorkHours(user.work_hours || '');
            setPaymentMethods(user.payment_methods || '');
            setVacancies(user.vacancies || '');
            setGender(user.gender || 'male');
            setDni(user.dni || '');
            setDob(user.dob || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    if (authLoading && !user) {
        return (
            <div className="container" style={{ padding: '10rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="sync-spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>Cargando datos de tu cuenta...</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Esto solo debería tomar unos segundos.</p>
            </div>
        );
    }

    if (!user && !authLoading) {
        return <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center' }}>Por favor inicia sesión para ver los ajustes.</div>;
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setMessage({ text: 'Subiendo foto...', type: 'info' });
            
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                // If bucket doesn't exist, fall back to base64
                console.warn('Storage upload failed, using base64 fallback:', uploadError.message);
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        await updateUser({ ...user, avatar_url: reader.result });
                        setMessage({ text: 'Foto de perfil actualizada', type: 'success' });
                    } catch (err) {
                        setMessage({ text: 'Error al guardar la foto: ' + err.message, type: 'error' });
                    }
                };
                reader.readAsDataURL(file);
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateUser({ ...user, avatar_url: publicUrl });
            setMessage({ text: 'Foto de perfil actualizada correctamente', type: 'success' });
        } catch (err) {
            console.error('Avatar upload error:', err);
            setMessage({ text: 'Error al subir la foto: ' + err.message, type: 'error' });
        }
    };

    const handleCvChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCvFile(reader.result);
                // We don't auto-save here to be consistent with other fields, 
                // but user might expect it. Let's just update local state and let them click save.
                setMessage({ text: 'CV cargado. No olvides guardar los cambios.', type: 'info' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const cleanUsername = username.trim();

        try {
            if (cleanUsername.length < 3) {
                setMessage({ text: 'Error: El nombre de usuario debe tener al menos 3 caracteres.', type: 'error' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Check for duplicates (excluding self)
            const { exists, field } = await checkUserExists({
                username: cleanUsername
            }, user.id);

            if (exists) {
                let errorMsg = "Error al guardar cambios: El usuario ya existe.";
                if (field === 'username') errorMsg = "Error al guardar cambios: El nombre de usuario ya está en uso por otro miembro.";

                setMessage({ text: errorMsg, type: 'error' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            setIsUpdating(true);

            await updateUser({
                ...user,
                username: cleanUsername.toLowerCase(),
                first_name: firstName || null,
                last_name: lastName || null,
                company_name: companyName || null,
                responsible_name: responsibleName || null,
                bio: bio || null,
                location: location || null,
                country: country || null,
                work_hours: workHours || null,
                payment_methods: paymentMethods || null,
                vacancies: vacancies !== '' && vacancies !== null ? parseInt(vacancies) || 0 : 0,
                gender: gender,
                dni: dni || null,
                dob: dob || null,
                phone: phone || null
            });

            setIsUpdating(false);
            setMessage({ text: '¡Guardado con éxito! Tu perfil ha sido actualizado.', type: 'success' });
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ text: "Error inesperado: " + error.message, type: 'error' });
            setIsUpdating(false);
        }
    };

    const profilePic = getProfilePicture(user && { ...user, gender });

    const isSyncError = user?.is_partial || user?.sync_error;

    console.log('Settings Render, Message:', message, 'User isPartial:', user?.is_partial);

    return (
        <div className="container settings-page">
            <div className="glass settings-card">
                <h2>Configuración de Perfil</h2>

                {message.text && (
                    <div
                        className={`message-banner ${message.type}`}
                        style={{
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            border: message.type === 'error' ? '1px solid #ef4444' : '1px solid #22c55e',
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: message.type === 'error' ? '#f87171' : '#4ade80'
                        }}
                    >
                        {message.text}
                    </div>
                )}

                {user?.is_cached && (
                    <div
                        style={{
                            padding: '0.8rem',
                            marginBottom: '1.5rem',
                            borderRadius: '8px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.8rem',
                            fontSize: '0.9rem'
                        }}
                    >
                        <div className="sync-spinner" style={{ 
                            width: '16px', 
                            height: '16px', 
                            border: '2px solid #60a5fa', 
                            borderTopColor: 'transparent', 
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        Usando datos guardados localmente. Sincronizando con el servidor...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {isSyncError && !user?.is_cached && (
                    <div
                        className="message-banner error"
                        style={{
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            alignItems: 'center'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Error de Conexión
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            No logramos conectar con el servidor. Revisa tu internet o intenta más tarde.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}
                        >
                            Reintentar ahora
                        </button>
                    </div>
                )}

                <div className="profile-picture-section">
                    <div className="avatar-container" onClick={handleAvatarClick}>
                        <img
                            src={profilePic}
                            alt="Profile"
                            className="profile-avatar"
                        />
                        <div className="avatar-overlay">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="camera-icon">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span>Cambiar</span>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/*"
                    />
                    <h3 className="settings-greeting" style={{ marginBottom: user.cv_url ? '0.5rem' : '1rem' }}>
                        Hola, {user.role === 'company' ? (companyName || user.company_name) : (firstName || user.first_name || user.username)}
                    </h3>

                    {user.cv_url && (
                        <div style={{ marginBottom: '1rem' }}>
                            <button 
                                onClick={() => window.open(user.cv_url, '_blank')}
                                className="btn-secondary"
                                style={{ 
                                    fontSize: '0.8rem', 
                                    padding: '6px 16px', 
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                Ver mi CV
                            </button>
                        </div>
                    )}

                    <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tema:</span>
                        <div
                            onClick={toggleTheme}
                            style={{
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border)',
                                padding: '0.4rem 1rem',
                                borderRadius: 'var(--radius-full)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                {theme === 'dark' ? (
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="5"></circle>
                                        <line x1="12" y1="1" x2="12" y2="3"></line>
                                        <line x1="12" y1="21" x2="12" y2="23"></line>
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                        <line x1="1" y1="12" x2="3" y2="12"></line>
                                        <line x1="21" y1="12" x2="23" y2="12"></line>
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                    </svg>
                                )}
                            </span>
                            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                        </div>
                    </div>

                    {user.role !== 'buyer' && (
                        <div className="inline-bio-container">
                            {isEditingBioInline ? (
                                <div className="bio-edit-wrapper">
                                    <textarea
                                        className="settings-input inline-bio-textarea"
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder={user.role === 'company' ? "Descripción de la empresa..." : "Cuéntanos sobre ti..."}
                                        autoFocus
                                        onBlur={() => setIsEditingBioInline(false)}
                                    />
                                    <div className="bio-inline-hint">Se guarda al hacer clic fuera o al guardar todo abajo</div>
                                </div>
                            ) : (
                                <div
                                    className="settings-bio-preview clickable"
                                    onClick={() => setIsEditingBioInline(true)}
                                    title="Haz clic para editar biografía"
                                >
                                    {bio || <span className="empty-bio-text">{user.role === 'company' ? 'Añadir descripción de empresa...' : 'Añadir biografía...'}</span>}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="edit-icon-inline">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="settings-section">
                    <form onSubmit={handleUpdateProfile}>
                        {user.role !== 'company' && (
                            <div className="form-group">
                                <label className="field-label">Género</label>
                                <div className="gender-selector">
                                    <button
                                        type="button"
                                        className={`gender-btn ${gender === 'male' ? 'active' : ''}`}
                                        onClick={() => setGender('male')}
                                    >
                                        Hombre
                                    </button>
                                    <button
                                        type="button"
                                        className={`gender-btn ${gender === 'female' ? 'active' : ''}`}
                                        onClick={() => setGender('female')}
                                    >
                                        Mujer
                                    </button>
                                    <button
                                        type="button"
                                        className={`gender-btn ${gender === 'other' ? 'active' : ''}`}
                                        onClick={() => setGender('other')}
                                    >
                                        Prefiero no decirlo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ROLE SPECIFIC FIELDS */}
                        {user.role === 'freelancer' && (
                            <div className="form-grid-2" style={{ marginTop: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="field-label">Nombre</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Tu nombre"
                                        className="settings-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="field-label">Apellido</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Tu apellido"
                                        className="settings-input"
                                    />
                                </div>
                            </div>
                        )}

                        {user.role === 'buyer' && (
                            <div className="form-grid-2" style={{ marginTop: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="field-label">Nombre</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Tu nombre"
                                        className="settings-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="field-label">Apellido</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Tu apellido"
                                        className="settings-input"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-grid-2" style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label className="field-label">Fecha de Nacimiento</label>
                                <div 
                                    className="datepicker-input glass input-readonly" 
                                    style={{ cursor: 'not-allowed', opacity: 0.8, background: 'rgba(255,255,255,0.02)' }}
                                >
                                    <span className="value">
                                        {dob ? dob.split('-').reverse().join('/') : 'No definida'}
                                    </span>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>
                                    La fecha de nacimiento no puede ser modificada.
                                </span>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <label className="field-label">Celular / Teléfono</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. +54 9 11 ..."
                                className="settings-input"
                            />
                        </div>

                        {user.role === 'company' && (
                            <>
                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="field-label">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Nombre de tu empresa"
                                        className="settings-input"
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="field-label">Nombre del Responsable</label>
                                    <input
                                        type="text"
                                        value={responsibleName}
                                        onChange={(e) => setResponsibleName(e.target.value)}
                                        placeholder="Nombre de la persona a cargo"
                                        className="settings-input"
                                    />
                                </div>
                                <div className="form-grid-2" style={{ marginTop: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="field-label">Horarios de Atención</label>
                                        <input
                                            type="text"
                                            value={workHours}
                                            onChange={(e) => setWorkHours(e.target.value)}
                                            placeholder="Ej. Lun-Vie 9-18hs"
                                            className="settings-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="field-label">Vacantes</label>
                                        <input
                                            type="number"
                                            value={vacancies}
                                            onChange={(e) => setVacancies(e.target.value)}
                                            placeholder="0"
                                            className="settings-input"
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <label className="field-label">Métodos de Pago</label>
                                    <input
                                        type="text"
                                        value={paymentMethods}
                                        onChange={(e) => setPaymentMethods(e.target.value)}
                                        placeholder="Ej. Transferencia, BTC, PayPal"
                                        className="settings-input"
                                    />
                                </div>
                            </>
                        )}

                        {/* SHARED FIELDS (Location if applicable for role) */}
                        {user.role === 'company' && (
                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="field-label">Ubicación / Ciudad</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Ej: Buenos Aires, Argentina"
                                    className="settings-input"
                                />
                            </div>
                        )}

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <CustomDropdown
                                label="País"
                                value={country}
                                onChange={setCountry}
                                options={[
                                    'Argentina', 'Chile', 'Colombia', 'España',
                                    'México', 'Perú', 'Uruguay', 'Otros'
                                ]}
                            />
                        </div>

                        {user.role !== 'company' && (
                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="field-label">Nombre de Usuario</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nuevo nombre de usuario"
                                    className="settings-input"
                                />
                            </div>
                        )}

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                            <label className="field-label">Correo Electrónico</label>
                            <input
                                type="email"
                                value={user.email}
                                readOnly
                                className="settings-input input-readonly"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ 
                                width: '100%', 
                                margin: '2rem 0',
                                opacity: (isUpdating || (isSyncError && !user?.is_cached)) ? 0.6 : 1,
                                cursor: (isUpdating || (isSyncError && !user?.is_cached)) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isUpdating || (isSyncError && !user?.is_cached)}
                        >
                            {(isSyncError && !user?.is_cached) ? 'Sin Conexión' : isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>

                <div className="settings-section" border="true" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ef4444' }}>
                    <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>Zona de Peligro</h3>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Al eliminar tu cuenta, todos tus datos serán borrados permanentemente del almacenamiento local. Esta acción es irreversible.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('¡CUIDADO! ¿Estás seguro de que quieres eliminar tu cuenta?')) {
                                const confirmText = window.prompt('Para confirmar, escribe "ELIMINAR" en la caja de abajo:');
                                if (confirmText === 'ELIMINAR') {
                                    deleteAccount(user.id);
                                } else {
                                    alert('La palabra ingresada no coincide. Cancelando acción.');
                                }
                            }
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            padding: '0.8rem 1.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                        {isUpdating ? 'Eliminando...' : 'Eliminar mi cuenta permanentemente'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
