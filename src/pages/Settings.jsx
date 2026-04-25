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
    const [cuilCuit, setCuilCuit] = useState(user?.cuil_cuit || '');
    const [dob, setDob] = useState(user?.dob || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [gender, setGender] = useState(user?.gender || 'male');
    const [message, setMessage] = useState({ text: '', type: '' });
    const fileInputRef = useRef(null);
    const cvInputRef = useRef(null);
    const [cvFile, setCvFile] = useState(user?.cv_url || '');
    const [minors, setMinors] = useState([]); // V38: For parents
    const [monthlySpend, setMonthlySpend] = useState(0); // V38: For minors
    const { fetchMonthlySpend } = useAuth();

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
            setCuilCuit(user.cuil_cuit || '');
            setDob(user.dob || '');
            setPhone(user.phone || '');

            // V38: Fetch minor related data
            const loadParentalData = async () => {
                // If Parent: Load supervised accounts
                const { data: minorsList } = await supabase.from('profiles').select('*').eq('parent_id', user.id);
                if (minorsList) setMinors(minorsList);

                // If Minor: Load current spend
                if (user.role === 'buyer' && user.dob) {
                    const birthDate = new Date(user.dob);
                    const age = new Date().getFullYear() - birthDate.getFullYear();
                    if (age < 18) {
                        const spend = await fetchMonthlySpend(user.id);
                        setMonthlySpend(spend);
                    }
                }
            };
            loadParentalData();
        }
    }, [user]);

    const handleUpdateMinorLimit = async (minorId, newLimit) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ monthly_spending_limit: newLimit, is_limit_custom: true })
                .eq('id', minorId);

            if (error) throw error;
            setMessage({ text: 'Límite de gasto actualizado para tu tutorado.', type: 'success' });
            setMinors(prev => prev.map(m => m.id === minorId ? { ...m, monthly_spending_limit: newLimit } : m));
        } catch (err) {
            console.error("Error updating minor limit:", err);
            setMessage({ text: 'Fallo al actualizar límite.', type: 'error' });
        }
    };

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
                        if (typeof reader.result === 'string') {
                            updateUser({ ...user, avatar_url: reader.result }).catch(err => {
                                console.warn('[Settings] Avatar preview sync failed:', err);
                            });
                        }
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

            await updateUser({ ...user, avatar_url: publicUrl }).catch(err => {
                console.warn('[Settings] Permanent avatar sync failed:', err);
                throw err; // Re-throw to show error in UI if it's a manual action
            });
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
            // Mandatory field validation
            if (user.role === 'company') {
                if (!companyName) { setMessage({ text: 'Error: El nombre de la empresa es obligatorio.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
                if (!responsibleName) { setMessage({ text: 'Error: El nombre del responsable es obligatorio.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
                if (!cuilCuit) { setMessage({ text: 'Error: El CUIT/CUIL es obligatorio.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            } else {
                if (!firstName || !lastName) { setMessage({ text: 'Error: Nombre y apellido son obligatorios.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
                if (!cleanUsername) { setMessage({ text: 'Error: El nombre de usuario es obligatorio.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            }

            if (user.role === 'freelancer' && !dni) { setMessage({ text: 'Error: El DNI es obligatorio.', type: 'error' }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

            const isBioRequired = user.role !== 'buyer';
            if (isBioRequired) {
                if (!bio || bio.trim().length < 15) {
                    setMessage({ text: 'Error: La biografía es obligatoria y debe tener al menos 15 caracteres.', type: 'error' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
            } else if (bio && bio.trim().length > 0 && bio.trim().length < 15) {
                setMessage({ text: 'Error: Si incluyes una biografía, debe tener al menos 15 caracteres.', type: 'error' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (cleanUsername.length < 3 && user.role !== 'company') {
                setMessage({ text: 'Error: El nombre de usuario debe tener al menos 3 caracteres.', type: 'error' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Check for duplicates (excluding self) - V30: Expanded uniqueness check
            const { exists, field } = await checkUserExists({
                username: user.role !== 'company' ? cleanUsername : undefined,
                companyName: user.role === 'company' ? companyName : undefined,
                dni: user.role === 'freelancer' ? dni : undefined,
                cuil_cuit: user.role === 'company' ? cuilCuit : undefined,
                phone: phone || undefined
            }, user.id);

            if (exists) {
                let errorMsg = "Error al guardar cambios: El dato ya está registrado.";
                if (field === 'username') errorMsg = "Error: El nombre de usuario ya está en uso.";
                if (field === 'company_name') errorMsg = "Error: Ese nombre de empresa ya está registrado.";
                if (field === 'dni') errorMsg = "Error: El DNI ya pertenece a otra cuenta.";
                if (field === 'cuil_cuit') errorMsg = "Error: El CUIT/CUIL ya pertenece a otra cuenta.";
                if (field === 'phone') errorMsg = "Error: El número de teléfono ya está en uso.";

                setMessage({ text: errorMsg, type: 'error' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            setIsUpdating(true);

            await updateUser({
                ...user,
                username: user.role !== 'company' ? cleanUsername.toLowerCase() : user.username,
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
                gender: user.role === 'company' ? (user.gender || 'other') : gender,
                dni: user.role === 'freelancer' ? (dni || null) : null,
                cuil_cuit: user.role === 'company' ? (cuilCuit || null) : null,
                dob: user.role !== 'company' ? (dob || null) : null,
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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
                    <h3 className="settings-greeting">
                        Hola, {user.username || 'Usuario'}
                    </h3>

                    {/* BIO - Hover to edit */}
                    <div className="inline-bio-container" style={{ marginTop: '1rem' }}>
                        {isEditingBioInline ? (
                            <div className="bio-edit-wrapper">
                                <textarea
                                    className="settings-input inline-bio-textarea"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Cuéntanos sobre ti..."
                                    autoFocus
                                    onBlur={() => setIsEditingBioInline(false)}
                                />
                                <div className="bio-inline-hint">Se guarda al hacer clic fuera o al guardar abajo</div>
                            </div>
                        ) : (
                            <div
                                className="settings-bio-preview clickable"
                                onClick={() => setIsEditingBioInline(true)}
                                title="Haz clic para editar biografía"
                            >
                                {bio || <span className="empty-bio-text">Añade una biografía...</span>}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="edit-icon-inline">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                <div className="settings-section">
                    <form onSubmit={handleUpdateProfile} className="settings-form-linear">
                        
                        {/* 1. USERNAME (With Warning) */}
                        {user.role !== 'company' && (
                            <div className="form-group">
                                <label className="field-label">Nombre de Usuario</label>
                                <div className="username-input-wrapper">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username"
                                        className="settings-input"
                                    />
                                    <span className="field-warning">⚠️ Puedes cambiar tu nombre de usuario un máximo de 3 veces.</span>
                                </div>
                            </div>
                        )}

                        {/* 2. NAME & LAST NAME */}
                        <div className="form-group">
                            <label className="field-label">Nombre</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Nombre"
                                className="settings-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="field-label">Apellido</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Apellido"
                                className="settings-input"
                            />
                        </div>

                        {/* 3. DATE OF BIRTH (Read Only) */}
                        <div className="form-group">
                            <label className="field-label">Fecha de Nacimiento</label>
                            <input
                                type="text"
                                value={dob ? dob.split('-').reverse().join('/') : ''}
                                readOnly
                                className="settings-input input-readonly"
                            />
                        </div>

                        {/* 4. COUNTRY */}
                        <div className="form-group">
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

                        {/* 5. PHONE */}
                        <div className="form-group">
                            <label className="field-label">Celular / Teléfono</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. +54 9 11 ..."
                                className="settings-input"
                            />
                        </div>

                        {/* 6. EMAIL (Read Only) */}
                        <div className="form-group">
                            <label className="field-label">Correo Electrónico</label>
                            <input
                                type="email"
                                value={user.email}
                                readOnly
                                className="settings-input input-readonly"
                            />
                        </div>

                        {/* COMPANY SPECIFIC FIELDS (If role is company) */}
                        {user.role === 'company' && (
                            <>
                                <div className="form-group">
                                    <label className="field-label">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="settings-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="field-label">Nombre del Responsable</label>
                                    <input
                                        type="text"
                                        value={responsibleName}
                                        onChange={(e) => setResponsibleName(e.target.value)}
                                        className="settings-input"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{
                                width: '100%',
                                marginTop: '2.5rem',
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
                        onClick={async () => {
                            if (window.confirm('¡CUIDADO! ¿Estás seguro de que quieres eliminar tu cuenta?')) {
                                const confirmText = window.prompt('Para confirmar, escribe "ELIMINAR" en la caja de abajo:');
                                if (confirmText === 'ELIMINAR') {
                                    try {
                                        setIsUpdating(true);
                                        await deleteAccount();
                                    } catch (err) {
                                        setIsUpdating(false);
                                        setMessage({
                                            text: 'Error al eliminar cuenta: ' + (err.message || 'Error de base de datos'),
                                            type: 'error'
                                        });
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
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
