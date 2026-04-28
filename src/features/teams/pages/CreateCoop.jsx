import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import { serviceCategories } from '../../services/data/categories';
import '../../../styles/main.scss';

const CreateCoop = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { createTeam, userTeams } = useTeams();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    
    // Internal Rules Template
    const rulesTemplate = `1. REPARTO DE GANANCIAS: El 80% de cada pago se distribuye entre los ejecutores del servicio, el 15% queda en el fondo de reserva de la Coop y el 5% para gastos operativos.
2. TOMA DE DECISIONES: Las decisiones críticas (cambio de reglas, expulsión de miembros) se toman por mayoría simple de votos.
3. CALIDAD Y RESPONSABILIDAD: Cada miembro es responsable de la calidad de sus entregables. Ante fallas críticas comprobadas, el fondo de la Coop cubrirá la garantía pero el miembro será sancionado.
4. PERMANENCIA: Se requiere una participación activa mínima de 5 horas semanales en proyectos de la Coop.`;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: '',
        internalRules: rulesTemplate,
        category_1: '',
        category_2: '',
    });

    const handleCategoryToggle = (category) => {
        if (selectedCategories.includes(category)) {
            setSelectedCategories(selectedCategories.filter(c => c !== category));
        } else {
            if (selectedCategories.length < 2) {
                setSelectedCategories([...selectedCategories, category]);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.logo) {
            setError('El Logo/Foto de la agencia es obligatorio para proyectar confianza.');
            return;
        }
        if (selectedCategories.length === 0) {
            setError('Debes seleccionar al menos una categoría de operación.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Mapping for compatibility with existing TeamContext logic
            const teamData = {
                ...formData,
                categories: selectedCategories, // TeamContext handles simple array of strings now
                status: 'Borrador',
                created_at: new Date().toISOString(),
                founder_id: user.id
            };

            const newTeam = await createTeam(teamData);
            navigate(`/coop/${newTeam.id}/invite`);
        } catch (err) {
            setError(err.message || 'Error al fundar la Coop. Intenta nuevamente.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '850px' }}>
            <div className="glass" style={{ padding: '4rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                
                {/* Visual Flair */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(150px)', opacity: '0.05', pointerEvents: 'none' }}></div>

                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>Fundar Nueva Agencia (Coop)</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
                        Estás a un paso de crear tu propia estructura profesional en Cooplance.
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        color: '#f87171', 
                        padding: '1.2rem', 
                        borderRadius: '16px', 
                        marginBottom: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        fontWeight: '600'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    
                    {/* SECTION: IDENTITY */}
                    <div className="form-section">
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ color: 'var(--primary)' }}>01</span> Identidad Corporativa
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Nombre de la Agencia</label>
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
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Descripción / Propuesta de Valor</label>
                                    <textarea 
                                        placeholder="Describe qué hace única a tu agencia..." 
                                        className="search-input" 
                                        rows="3"
                                        style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '120px' }}
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ textAlign: 'center' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}>Logo (Obligatorio)</label>
                                <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
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
                                            width: '100%', 
                                            height: '100%', 
                                            borderRadius: '30px', 
                                            background: formData.logo ? 'none' : 'rgba(255,255,255,0.03)', 
                                            border: '2px dashed rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s'
                                        }}>
                                            {formData.logo ? (
                                                <img src={formData.logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <>
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '0.5rem', opacity: 0.5 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subir Logo</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: CATEGORIES */}
                    <div className="form-section">
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ color: '#ec4899' }}>02</span> Áreas de Especialización
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            Elige hasta 2 categorías principales donde operará tu agencia.
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {Object.keys(serviceCategories).map(cat => (
                                <div 
                                    key={cat}
                                    onClick={() => handleCategoryToggle(cat)}
                                    style={{ 
                                        padding: '1rem', 
                                        borderRadius: '16px', 
                                        background: selectedCategories.includes(cat) ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: selectedCategories.includes(cat) ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: selectedCategories.includes(cat) ? 'var(--primary)' : 'var(--text-secondary)'
                                    }}
                                >
                                    {cat}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION: INTERNAL RULES */}
                    <div className="form-section">
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ color: '#10b981' }}>03</span> Estatuto Interno (Contrato)
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Estas reglas definen cómo se reparte el dinero y cómo se toman las decisiones. Los miembros deberán firmarlas al unirse.
                        </p>
                        
                        <textarea 
                            className="search-input" 
                            rows="8"
                            style={{ 
                                width: '100%', 
                                padding: '1.5rem', 
                                borderRadius: '20px', 
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                fontSize: '0.9rem', 
                                lineHeight: '1.6', 
                                fontFamily: 'monospace',
                                color: 'var(--text-primary)'
                            }}
                            value={formData.internalRules}
                            onChange={(e) => setFormData({...formData, internalRules: e.target.value})}
                        />

                        {/* WARNING BLOCK */}
                        <div style={{ 
                            marginTop: '1.5rem', 
                            padding: '1.5rem', 
                            borderRadius: '16px', 
                            background: 'rgba(239, 68, 68, 0.05)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            gap: '1rem'
                        }}>
                            <div style={{ color: '#f87171' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div>
                                <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '700' }}>IMPORTANTE: Marco Legal y T&C</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                    Las reglas internas no pueden contradecir las leyes vigentes de la República Argentina ni los Términos y Condiciones de Cooplance. 
                                    Cualquier cláusula que viole la ética profesional o los derechos humanos será considerada nula y motivo de suspensión de la Coop.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                        <button 
                            type="submit" 
                            className="btn-primary" 
                            disabled={isSubmitting}
                            style={{ 
                                padding: '1rem 3rem', 
                                fontSize: '1.1rem', 
                                fontWeight: '800', 
                                borderRadius: '999px',
                                boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            {isSubmitting ? 'Inscribiendo Coop...' : 'Fundar Mi Agencia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCoop;
