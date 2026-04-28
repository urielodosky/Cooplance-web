import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useTeams } from '../../../context/TeamContext';
import { serviceCategories } from '../../services/data/categories';
import { getProfilePicture } from '../../../utils/avatarUtils';
import CustomDropdown from '../../../components/common/CustomDropdown';
import { useBadgeNotification } from '../../../context/BadgeNotificationContext';
import '../../../styles/main.scss';

const CreateTeam = () => {
    const { user } = useAuth();
    const { createTeam, canCreateTeam, searchUser } = useTeams();
    const navigate = useNavigate();
    const { refreshBadges } = useBadgeNotification();

    // --- STATE ---
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: ''
    });

    // Categories: Array of strings (category names)
    // Max 3 categories
    const [selectedCategories, setSelectedCategories] = useState([]);

    // Tags: Max 5
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Members
    const [memberQuery, setMemberQuery] = useState('');
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const [memberSearchResult, setMemberSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [invitedMembers, setInvitedMembers] = useState([]);

    // Status
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- LOGIC ---

    const eligible = canCreateTeam(user);
    const requiredLevel = user.role === 'freelancer' ? 3 : 6;
    const currentLevel = user.level || 1;
    const progress = Math.min((currentLevel / requiredLevel) * 100, 100);

    // Category Handlers
    const handleAddCategory = (categoryName) => {
        if (selectedCategories.length >= 3) return;
        if (selectedCategories.includes(categoryName)) return;
        setSelectedCategories([...selectedCategories, categoryName]);
    };

    const handleRemoveCategory = (categoryName) => {
        setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
    };

    // Tag Handlers
    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = tagInput.trim();
            if (val && tags.length < 5 && !tags.includes(val)) {
                setTags([...tags, val]);
                setTagInput('');
            }
        }
    };

    const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

    // Member Search Handlers
    const handleSearchMember = async () => {
        if (!memberQuery.trim()) return;
        setIsSearchingMember(true);
        setSearchError('');
        setMemberSearchResult(null);

        try {
            const result = await searchUser(memberQuery.trim());
            if (result) {
                // Check if already invited or is self
                if (result.id === user.id) {
                    setSearchError('No puedes invitarte a ti mismo.');
                } else if (invitedMembers.some(m => m.id === result.id)) {
                    setSearchError('Ya has invitado a este usuario.');
                } else {
                    setMemberSearchResult(result);
                }
            } else {
                setSearchError('Usuario no encontrado.');
            }
        } catch (err) {
            setSearchError('Error al buscar usuario.');
        } finally {
            setIsSearchingMember(false);
        }
    };

    const handleInviteMember = () => {
        if (memberSearchResult) {
            setInvitedMembers([...invitedMembers, memberSearchResult]);
            setMemberSearchResult(null);
            setMemberQuery('');
        }
    };

    const handleRemoveInvite = (id) => {
        setInvitedMembers(invitedMembers.filter(m => m.id !== id));
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (selectedCategories.length === 0) {
            setError('Debes seleccionar al menos una categoría.');
            return;
        }

        setIsSubmitting(true);

        try {
            const finalData = {
                ...formData,
                categories: selectedCategories,
                tags,
                invitedMembers
            };
            await createTeam(finalData);
            if (refreshBadges) refreshBadges();
            navigate('/my-coops');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!eligible) {
        // ... (Same Level Lock UI as before, keeping it concise here)
        return (
            <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', textAlign: 'center' }}>
                <div className="glass" style={{ padding: '3rem', borderRadius: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Función Bloqueada</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Nivel requerido: {requiredLevel}. Tu nivel: {currentLevel}.
                    </p>
                    <div style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }}></div>
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px' }}>
            <div className="glass" style={{ padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold' }}>Fundar Nueva Coop</h2>

                {error && <div className="error-alert" style={{ marginBottom: '1.5rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                    {/* 1. Basic Info */}
                    <div className="form-section animate-in">
                        <h3 className="section-subtitle" style={{ 
                            marginBottom: '1.5rem', 
                            fontSize: '1.4rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.8rem',
                            color: '#fff'
                        }}>
                            <span style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </span>
                            Identidad de la Coop
                        </h3>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Nombre de la Coop</label>
                            <input
                                type="text"
                                className="search-input full-width"
                                placeholder="Ej. DevSquad, PixelPerfect..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                minLength={3}
                                style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                        </div>

                        <div className="form-group margin-top">
                            <label style={{ marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Descripción</label>
                            <textarea
                                className="search-input full-width"
                                rows="3"
                                placeholder="¿A qué se dedica tu equipo?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '100px' }}
                            />
                        </div>

                        <div className="form-group margin-top" style={{ marginTop: '1.5rem' }}>
                            <label style={{ marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Logo / Foto del equipo (Opcional)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {formData.logo && (
                                    <img src={formData.logo} alt="Logo Preview" style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                )}
                                <label style={{ display: 'inline-block', cursor: 'pointer', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', transition: 'all 0.2s', flex: 1, textAlign: 'center' }} className="file-upload-label">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setFormData({ ...formData, logo: reader.result });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                    {formData.logo ? 'Cambiar Imagen' : 'Subir desde la PC'}
                                </label>
                            </div>
                        </div>
                        <div style={{ 
                            background: 'rgba(59, 130, 246, 0.05)', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            marginTop: '2rem',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'start'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>💡</span>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                <strong>Dato:</strong> El nombre y logo de tu Coop son su marca en el mercado. 
                                Podrás cambiarlos más adelante, pero esto quedará registrado en el historial público para asegurar la transparencia.
                            </p>
                        </div>
                    </div>

                    {/* 2. Categories Selection (Simplified) */}
                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                            <h3 className="section-subtitle" style={{ margin: 0, fontSize: '1.3rem' }}>Áreas de Operación</h3>
                            <span style={{ fontSize: '0.85rem', color: selectedCategories.length === 3 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '600' }}>
                                {selectedCategories.length} / 3 Seleccionadas
                            </span>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Elige hasta 3 categorías principales que definan el propósito de tu Coop. 
                            Las especialidades detalladas se configurarán en cada servicio individual.
                        </p>

                        <div className="category-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {selectedCategories.map((cat, idx) => (
                                <div key={idx} className="glass animate-in" style={{ 
                                    background: 'rgba(139, 92, 246, 0.05)', 
                                    padding: '1rem', 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff' }}>{cat}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveCategory(cat)}
                                        style={{ 
                                            background: 'rgba(239, 68, 68, 0.1)', 
                                            border: 'none', 
                                            color: '#ef4444', 
                                            width: '28px', 
                                            height: '28px', 
                                            borderRadius: '50%', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.1rem'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {selectedCategories.length < 3 && (
                                <div className="category-dropdown-container">
                                    <CustomDropdown
                                        options={Object.keys(serviceCategories)
                                            .filter(cat => !selectedCategories.includes(cat))
                                            .map(cat => ({ label: cat, value: cat }))}
                                        onChange={handleAddCategory}
                                        placeholder="+ Añadir Categoría"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Tags */}
                    <div className="form-section animate-in" style={{ animationDelay: '0.1s' }}>
                        <h3 className="section-subtitle" style={{ 
                            marginBottom: '1.5rem', 
                            fontSize: '1.4rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.8rem',
                            color: '#fff'
                        }}>
                            <span style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </span>
                            Etiquetas de Búsqueda ({tags.length}/5)
                        </h3>
                        <div className="tags-input-container">
                            <div className="tags-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0.8rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', minHeight: 'auto', alignItems: 'center' }}>
                                {tags.map(tag => (
                                    <span key={tag} className="tag-chip" style={{ background: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {tag} <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                                    </span>
                                ))}
                                {tags.length < 5 && (
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="Escribe y presiona Enter..."
                                        style={{ border: 'none', background: 'transparent', color: '#fff', outline: 'none', flex: 1, minWidth: '140px', fontSize: '0.95rem', padding: '0.3rem 0' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 4. Members Invite */}
                    <div className="form-section animate-in" style={{ animationDelay: '0.2s' }}>
                        <h3 className="section-subtitle" style={{ 
                            marginBottom: '1.5rem', 
                            fontSize: '1.4rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.8rem',
                            color: '#fff'
                        }}>
                            <span style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>
                            </span>
                            Equipo Inicial
                        </h3>
                        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                className="search-input full-width"
                                placeholder="Usuario o Email"
                                value={memberQuery}
                                onChange={(e) => setMemberQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchMember())}
                                style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}
                            />
                            <button type="button" className="btn-secondary" onClick={handleSearchMember} disabled={isSearchingMember} style={{ padding: '0 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.95rem' }}>
                                {isSearchingMember ? '...' : 'Buscar'}
                            </button>
                        </div>

                        {searchError && <p className="error-text" style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>{searchError}</p>}

                        {memberSearchResult && (
                            <div className="member-card-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <img src={getProfilePicture(memberSearchResult)} alt={memberSearchResult.username} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{memberSearchResult.firstName} {memberSearchResult.lastName}</strong>
                                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{memberSearchResult.username}</small>
                                    </div>
                                </div>
                                <button type="button" className="btn-primary small" onClick={handleInviteMember} style={{ padding: '0.4rem 0.8rem', borderRadius: '16px', fontSize: '0.85rem' }}>Agregar</button>
                            </div>
                        )}

                        {invitedMembers.length > 0 && (
                            <div className="invited-list" style={{ marginTop: '1rem' }}>
                                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Invitaciones Pendientes ({invitedMembers.length})</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {invitedMembers.map(member => (
                                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <img src={getProfilePicture(member)} alt={member.username} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                                <span style={{ fontSize: '0.95rem' }}>{member.firstName}</span>
                                                <span className="badge-pending" style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.1rem 0.5rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Solicitud Enviada</span>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveInvite(member.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}>Eliminar</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <button type="button" className="btn-secondary" style={{ flex: 1, padding: '0.8rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => navigate('/dashboard')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.8rem', borderRadius: '9999px', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }} disabled={isSubmitting}>
                            {isSubmitting ? 'Creando...' : 'Fundar Agencia'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CreateTeam;
