import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';

const PostulationTypeModal = ({ isOpen, onClose, onSelect, coops = [] }) => {
    const [selectedCoopId, setSelectedCoopId] = useState(coops.length > 0 ? coops[0].id : '');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
            <div className="modal-content glass" style={{
                width: '100%', maxWidth: '450px', padding: '2.5rem',
                borderRadius: '24px', border: '1px solid var(--border)',
                textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
                    background: 'var(--primary)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)'
                }}></div>

                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
                    ¿Cómo deseas postularte?
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
                    Elige si quieres participar de forma individual o representar a una de tus agencias.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Option A: Individual */}
                    <button 
                        onClick={() => onSelect('individual')}
                        className="glass-button"
                        style={{
                            padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
                            display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                            transition: 'all 0.2s', textAlign: 'left', width: '100%'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontWeight: '700', fontSize: '1.05rem' }}>Freelancer</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Perfil Personal</span>
                        </div>
                    </button>

                    {/* Option B: Coop */}
                    <div className="glass" style={{
                        padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--primary-light)',
                        background: 'rgba(59, 130, 246, 0.05)', textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: coops.length > 1 ? '1rem' : '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontWeight: '700', fontSize: '1.05rem' }}>Como Coop</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Representando a la Agencia</span>
                            </div>
                        </div>

                        {coops.length > 1 && (
                            <select 
                                value={selectedCoopId}
                                onChange={(e) => setSelectedCoopId(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    color: 'var(--text-primary)', marginBottom: '1rem', outline: 'none'
                                }}
                            >
                                {coops.map(coop => (
                                    <option key={coop.id} value={coop.id}>{coop.name}</option>
                                ))}
                            </select>
                        )}

                        <button 
                            onClick={() => onSelect('coop', selectedCoopId)}
                            className="btn-primary"
                            style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontWeight: '700' }}
                        >
                            Postular como {coops.find(c => c.id === selectedCoopId)?.name || 'Coop'}
                        </button>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    style={{
                        marginTop: '1.5rem', background: 'none', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem',
                        fontWeight: '600', textDecoration: 'underline'
                    }}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default PostulationTypeModal;
