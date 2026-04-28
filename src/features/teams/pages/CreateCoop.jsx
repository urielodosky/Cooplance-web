import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import { serviceCategories } from '../../services/data/categories';
import CustomDropdown from '../../../components/common/CustomDropdown';
import '../../../styles/main.scss';

const CreateCoop = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createTeam, addMemberToTeam, searchUser } = useTeams();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // Internal Rules Template
    const rulesTemplate = `1. REPARTO DE GANANCIAS: El pago de cada trabajo se distribuirá exclusivamente entre los miembros asignados a dicho proyecto. El método (Equitativo, por Nivel o Manual) se acordará antes de aceptar el trabajo. Por política de Cooplance, ningún miembro asignado cobrará menos del 10% del valor neto.

2. COMUNICACIÓN Y PORTAVOZ: Toda la comunicación con el cliente se realizará a través de la plataforma. Solo el miembro designado como 'Encargado del Proyecto' (Project Lead) está autorizado a hablar en el chat del cliente en nombre de la Coop.

3. RESPONSABILIDAD Y ABANDONO: Abandonar un proyecto en curso (estado Activo) sin justificación grave es motivo de expulsión inmediata de la agencia.

4. INACTIVIDAD Y COMPROMISO: Se espera participación y respuesta en los canales internos. La falta de comunicación prolongada o la inactividad repetida dará derecho a la administración a expulsar al miembro bajo el motivo de "Inactividad".

5. PROFESIONALISMO Y RESPETO: No se tolerará el maltrato, acoso ni comportamiento tóxico hacia compañeros o clientes. El incumplimiento de esta regla resultará en expulsión y el correspondiente reporte a la administración de Cooplance.`;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: '',
        internalRules: rulesTemplate,
        category_1: '',
        category_2: '',
        category_3: '',
        tags: []
    });

    // Tag management
    const [tagInput, setTagInput] = useState('');
    
    // Invitation management
    const [inviteQuery, setInviteQuery] = useState('');
    const [invitedMembers, setInvitedMembers] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState('');

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
    };

    const handleInvite = async () => {
        if (!inviteQuery.trim()) return;
        setInviteLoading(true);
        setInviteError('');
        try {
            const foundUser = await searchUser(inviteQuery);
            if (foundUser) {
                if (foundUser.id === user.id) {
                    setInviteError('No puedes invitarte a ti mismo.');
                } else if (invitedMembers.some(m => m.id === foundUser.id)) {
                    setInviteError('Este usuario ya está en la lista de invitaciones.');
                } else {
                    setInvitedMembers([...invitedMembers, foundUser]);
                    setInviteQuery('');
                }
            } else {
                setInviteError('Usuario no encontrado por ese nombre o correo.');
            }
        } catch (err) {
            setInviteError('Error al buscar usuario.');
        } finally {
            setInviteLoading(false);
        }
    };

    const removeInvitation = (id) => {
        setInvitedMembers(invitedMembers.filter(m => m.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (currentStep < 3) {
            // Validation for step 1
            if (currentStep === 1) {
                if (!formData.name || !formData.description || !formData.logo || !formData.category_1) {
                    setError('Por favor completa todos los campos obligatorios de la identidad.');
                    return;
                }
            }
            setError(null);
            setCurrentStep(currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        try {
            const teamData = {
                ...formData,
                categories: [formData.category_1, formData.category_2, formData.category_3].filter(Boolean),
                status: 'Borrador',
                created_at: new Date().toISOString(),
                founder_id: user.id
            };

            const newTeam = await createTeam(teamData);

            // Process invitations
            for (const member of invitedMembers) {
                await addMemberToTeam(newTeam.id, member.id);
            }

            navigate(`/coop/${newTeam.id}`);
        } catch (err) {
            setError(err.message || 'Error al fundar la Coop. Intenta nuevamente.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '850px' }}>
            <div className="glass" style={{ padding: '3rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                
                {/* Step Indicator (matching ProjectCreateForm style) */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: s === currentStep ? 'var(--primary)' : s < currentStep ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: s === currentStep ? 'white' : s < currentStep ? '#10b981' : 'var(--text-muted)',
                            fontWeight: '800', border: s === currentStep ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s'
                        }}>
                            {s < currentStep ? '✓' : s}
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                        {currentStep === 1 ? 'Fundar Mi Agencia' : currentStep === 2 ? 'Estatuto de la Coop' : 'Invitar a Miembros'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {currentStep === 1 ? 'Define la identidad de tu nueva cooperativa.' : currentStep === 2 ? 'Establece las reglas de convivencia y reparto.' : 'Suma talento a tu equipo para empezar a trabajar.'}
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    
                    {/* STEP 1: IDENTITY & CATEGORIES */}
                    {currentStep === 1 && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Nombre de la Agencia</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Alpha Creative Group" 
                                            className="search-input" 
                                            style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Descripción</label>
                                        <textarea 
                                            placeholder="¿Qué problemas resuelven? ¿Cómo trabajan?..." 
                                            className="search-input" 
                                            rows="4"
                                            style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '100px' }}
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block', textTransform: 'uppercase' }}>Logo</label>
                                    <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto' }}>
                                        <label style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                style={{ display: 'none' }} 
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({...formData, logo: reader.result});
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <div style={{ 
                                                width: '100%', height: '100%', borderRadius: '24px', 
                                                background: formData.logo ? 'none' : 'rgba(255,255,255,0.02)', 
                                                border: '2px dashed rgba(255,255,255,0.1)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                            }}>
                                                {formData.logo ? (
                                                    <img src={formData.logo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Cat. 1</label>
                                    <CustomDropdown 
                                        options={Object.keys(serviceCategories).map(cat => ({ label: cat, value: cat }))} 
                                        value={formData.category_1} 
                                        onChange={(v) => setFormData({...formData, category_1: v})}
                                        placeholder="Cat. 1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Cat. 2</label>
                                    <CustomDropdown 
                                        options={Object.keys(serviceCategories).filter(c => c !== formData.category_1).map(cat => ({ label: cat, value: cat }))} 
                                        value={formData.category_2} 
                                        onChange={(v) => setFormData({...formData, category_2: v})}
                                        placeholder="Cat. 2"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Cat. 3</label>
                                    <CustomDropdown 
                                        options={Object.keys(serviceCategories).filter(c => c !== formData.category_1 && c !== formData.category_2).map(cat => ({ label: cat, value: cat }))} 
                                        value={formData.category_3} 
                                        onChange={(v) => setFormData({...formData, category_3: v})}
                                        placeholder="Cat. 3"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Etiquetas / Tags (Presiona Enter)</label>
                                <div style={{ 
                                    display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.8rem', 
                                    borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                                    minHeight: '50px', alignItems: 'center'
                                }}>
                                    {formData.tags.map(tag => (
                                        <span key={tag} style={{ 
                                            background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', 
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700',
                                            display: 'flex', alignItems: 'center', gap: '5px'
                                        }}>
                                            {tag}
                                            <span onClick={() => removeTag(tag)} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        placeholder={formData.tags.length === 0 ? "Ej: Python, Branding, Estrategia" : ""} 
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        style={{ background: 'none', border: 'none', color: 'white', outline: 'none', flex: 1, fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: INTERNAL RULES */}
                    {currentStep === 2 && (
                        <div className="fade-in">
                            <textarea 
                                className="search-input" 
                                rows="12"
                                style={{ 
                                    width: '100%', padding: '1.5rem', borderRadius: '20px', 
                                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', 
                                    fontSize: '0.9rem', lineHeight: '1.7', fontFamily: 'monospace', color: 'white'
                                }}
                                value={formData.internalRules}
                                onChange={(e) => setFormData({...formData, internalRules: e.target.value})}
                            />
                            <div style={{ marginTop: '1.5rem', padding: '1.2rem', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ color: '#f59e0b' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Asegúrate de que estas reglas sean justas. Los miembros deberán firmarlas para unirse a la Agencia.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INVITATIONS */}
                    {currentStep === 3 && (
                        <div className="fade-in">
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Nombre de usuario o email..." 
                                        className="search-input" 
                                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        value={inviteQuery}
                                        onChange={(e) => setInviteQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleInvite())}
                                    />
                                    <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={handleInvite}
                                        disabled={inviteLoading}
                                        style={{ borderRadius: '14px', padding: '0 1.5rem' }}
                                    >
                                        {inviteLoading ? '...' : 'Buscar'}
                                    </button>
                                </div>
                                {inviteError && <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.5rem', marginLeft: '0.5rem' }}>{inviteError}</p>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Usuarios para invitar ({invitedMembers.length})</h4>
                                {invitedMembers.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                        No has agregado a nadie todavía.
                                    </p>
                                ) : (
                                    invitedMembers.map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                    {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} /> : m.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: '600' }}>@{m.username}</span>
                                            </div>
                                            <button type="button" onClick={() => removeInvitation(m.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: '700' }}>Quitar</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        {currentStep > 1 ? (
                            <button type="button" className="btn-secondary" onClick={() => setCurrentStep(currentStep - 1)} style={{ padding: '0.8rem 2rem', borderRadius: '14px' }}>Volver</button>
                        ) : (
                            <div></div>
                        )}
                        <button 
                            type="submit" 
                            className="btn-primary" 
                            disabled={isSubmitting}
                            style={{ padding: '0.8rem 3rem', borderRadius: '14px', fontWeight: '800' }}
                        >
                            {isSubmitting ? 'Procesando...' : currentStep < 3 ? 'Continuar' : 'Fundar Agencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCoop;
