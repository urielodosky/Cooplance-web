import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useTeams } from '../../../context/TeamContext';
import { serviceCategories } from '../../services/data/categories';
import { getProfilePicture } from '../../../utils/avatarUtils';
import CustomDropdown from '../../../components/common/CustomDropdown';
import '../../../styles/main.scss';

const CreateTeam = () => {
    const { user } = useAuth();
    const { createTeam, canCreateTeam, searchUser } = useTeams();
    const navigate = useNavigate();

    // --- STATE ---
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: ''
    });

    // Categories: Array of { name: string, subcategories: string[] }
    // Max 2 categories
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
        if (selectedCategories.length >= 2) return;
        if (selectedCategories.some(c => c.name === categoryName)) return;
        setSelectedCategories([...selectedCategories, { name: categoryName, subcategories: [], specialties: [] }]);
    };

    const handleRemoveCategory = (categoryName) => {
        setSelectedCategories(selectedCategories.filter(c => c.name !== categoryName));
    };

    const handleToggleSubcategory = (categoryName, sub) => {
        setSelectedCategories(prev => prev.map(cat => {
            if (cat.name !== categoryName) return cat;

            const isSelected = cat.subcategories.includes(sub);
            if (isSelected) {
                return { ...cat, subcategories: cat.subcategories.filter(s => s !== sub) };
            } else {
                if (cat.subcategories.length >= 3) return cat; // Max 3 limit
                return { ...cat, subcategories: [...cat.subcategories, sub] };
            }
        }));
    };

    const handleToggleSpecialty = (categoryName, spec) => {
        setSelectedCategories(prev => prev.map(cat => {
            if (cat.name !== categoryName) return cat;
            const currentSpecs = cat.specialties || [];
            if (currentSpecs.includes(spec)) {
                return { ...cat, specialties: currentSpecs.filter(s => s !== spec) };
            } else {
                if (currentSpecs.length >= 5) return cat; // Max 5 limit
                return { ...cat, specialties: [...currentSpecs, spec] };
            }
        }));
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
                    <div className="form-section">
                        <h3 className="section-subtitle" style={{ marginBottom: '1rem', fontSize: '1.3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Información Básica</h3>
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
                    </div>

                    {/* 2. Categories & Subcategories */}
                    <div className="form-section">
                        <h3 className="section-subtitle" style={{ marginBottom: '1rem', fontSize: '1.3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Especialización (Máx. 2 Categorías)</h3>

                        {selectedCategories.length < 2 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <CustomDropdown
                                    options={Object.keys(serviceCategories)
                                        .filter(cat => !selectedCategories.some(c => c.name === cat)) // Filter out selected
                                        .map(cat => ({ label: cat, value: cat }))}
                                    onChange={handleAddCategory}
                                    placeholder="+ Agregar Categoría"
                                />
                            </div>
                        )}

                        <div className="categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {selectedCategories.map((cat, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>{cat.name}</h4>
                                        <button type="button" onClick={() => handleRemoveCategory(cat.name)} className="btn-icon danger" style={{ background: 'rgba(255,0,0,0.1)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>×</button>
                                    </div>

                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                                        Selecciona hasta 3 subcategorías ({cat.subcategories.length}/3)
                                    </p>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {Object.keys(serviceCategories[cat.name] || {}).map(sub => (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => handleToggleSubcategory(cat.name, sub)}
                                                className={`chip ${cat.subcategories.includes(sub) ? 'active' : ''}`}
                                                style={{
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--border)',
                                                    background: cat.subcategories.includes(sub) ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                    color: cat.subcategories.includes(sub) ? '#fff' : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>

                                    {cat.subcategories.length > 0 && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                                                Especialidades disponibles (Máx. 5: {(cat.specialties || []).length}/5)
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {cat.subcategories.flatMap(sub => serviceCategories[cat.name]?.[sub] || []).map(spec => {
                                                    const isSelected = (cat.specialties || []).includes(spec);
                                                    return (
                                                        <button
                                                            key={spec}
                                                            type="button"
                                                            onClick={() => handleToggleSpecialty(cat.name, spec)}
                                                            className={`chip ${isSelected ? 'active' : ''}`}
                                                            style={{
                                                                padding: '0.25rem 0.6rem',
                                                                borderRadius: '16px',
                                                                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                                                background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                                                color: isSelected ? '#a78bfa' : 'var(--text-muted)',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {spec}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Tags */}
                    <div className="form-section">
                        <h3 className="section-subtitle" style={{ marginBottom: '1rem', fontSize: '1.3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Etiquetas ({tags.length}/5)</h3>
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
                    <div className="form-section">
                        <h3 className="section-subtitle" style={{ marginBottom: '1rem', fontSize: '1.3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Invitar Miembros</h3>
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
