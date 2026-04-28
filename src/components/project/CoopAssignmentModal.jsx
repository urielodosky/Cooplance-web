import React, { useState, useEffect } from 'react';
import TeamService from '../../services/TeamService';

const CoopAssignmentModal = ({ isOpen, onClose, coopId, budget = 0, onConfirm }) => {
    const [step, setStep] = useState(1); // 1: Team, 2: Payout
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [projectLead, setProjectLead] = useState('');
    const [payoutMethod, setPayoutMethod] = useState('equal');
    const [manualPercentages, setManualPercentages] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const netBudget = budget * 0.88;

    useEffect(() => {
        if (isOpen && coopId) {
            const fetchMembers = async () => {
                setLoading(true);
                try {
                    const data = await TeamService.getTeamMembers(coopId);
                    const activeMembers = data.filter(m => m.accepted_rules_at);
                    setMembers(activeMembers);
                } catch (err) {
                    console.error('Error fetching members:', err);
                    setError('No se pudieron cargar los miembros.');
                } finally {
                    setLoading(false);
                }
            };
            fetchMembers();
            setStep(1);
            setSelectedMembers([]);
            setProjectLead('');
            setError('');
        }
    }, [isOpen, coopId]);

    const toggleMember = (userId) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(prev => prev.filter(id => id !== userId));
            if (projectLead === userId) setProjectLead('');
            const newManual = { ...manualPercentages };
            delete newManual[userId];
            setManualPercentages(newManual);
        } else {
            setSelectedMembers(prev => [...prev, userId]);
        }
    };

    const handleNextStep = () => {
        if (selectedMembers.length === 0) {
            setError('Debes seleccionar al menos un miembro.');
            return;
        }
        if (!projectLead) {
            setError('Debes designar a un Encargado.');
            return;
        }
        setError('');
        setStep(2);
    };

    const calculatePercentages = () => {
        if (payoutMethod === 'equal') {
            const pct = 100 / selectedMembers.length;
            return selectedMembers.map(id => ({ id, pct }));
        }
        if (payoutMethod === 'level_based') {
            let totalLevel = 0;
            const memberData = selectedMembers.map(id => {
                const m = members.find(mem => mem.user_id === id);
                const level = m?.profiles?.level || 1;
                totalLevel += level;
                return { id, level };
            });
            return memberData.map(m => ({ id: m.id, pct: (m.level / totalLevel) * 100 }));
        }
        if (payoutMethod === 'manual') {
            return selectedMembers.map(id => ({ id, pct: parseFloat(manualPercentages[id]) || 0 }));
        }
        return [];
    };

    const handleConfirm = () => {
        const pcts = calculatePercentages();
        const total = pcts.reduce((acc, p) => acc + p.pct, 0);
        
        if (Math.abs(total - 100) > 0.01) {
            setError(`La suma de porcentajes debe ser 100%. Actual: ${total.toFixed(2)}%`);
            return;
        }

        if (pcts.some(p => p.pct < 10)) {
            setError('Regla Anti-Explotación: Ningún miembro puede recibir menos del 10%.');
            return;
        }
        
        onConfirm({
            memberIds: selectedMembers,
            projectLeadId: projectLead,
            coopId: coopId,
            payoutMethod,
            percentages: pcts.map(p => p.pct)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
        }}>
            <div className="modal-content glass" style={{
                width: '100%', maxWidth: '550px', padding: '2rem',
                borderRadius: '24px', border: '1px solid var(--border)',
                background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                        {step === 1 ? 'Asignación de Equipo' : 'Método de Reparto'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>
                ) : step === 1 ? (
                    <>
                        {/* Step 1: Team Selection (Existing logic simplified) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                            {members.map(m => (
                                <div 
                                    key={m.user_id} 
                                    onClick={() => toggleMember(m.user_id)}
                                    className="glass-card"
                                    style={{
                                        padding: '1rem', borderRadius: '12px', border: `1px solid ${selectedMembers.includes(m.user_id) ? 'var(--primary)' : 'var(--border)'}`,
                                        background: selectedMembers.includes(m.user_id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                        display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid var(--border)', background: selectedMembers.includes(m.user_id) ? 'var(--primary)' : 'transparent' }}></div>
                                    <span style={{ fontWeight: '600' }}>{m.profiles?.username} (Nivel {m.profiles?.level || 1})</span>
                                </div>
                            ))}
                        </div>

                        {selectedMembers.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ENCARGADO (PROYECTO LEAD)</label>
                                <select value={projectLead} onChange={e => setProjectLead(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'white' }}>
                                    <option value="">Seleccionar encargado...</option>
                                    {selectedMembers.map(id => <option key={id} value={id}>{members.find(m => m.user_id === id)?.profiles?.username}</option>)}
                                </select>
                            </div>
                        )}

                        {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}
                        <button onClick={handleNextStep} className="btn-primary" style={{ width: '100%' }}>Siguiente: Configurar Pagos</button>
                    </>
                ) : (
                    <>
                        {/* Step 2: Payout Config */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                            {['equal', 'level_based', 'manual'].map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => { setPayoutMethod(m); setError(''); }}
                                    style={{
                                        flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border)',
                                        background: payoutMethod === m ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                        color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    {m === 'equal' ? 'Equitativo' : m === 'level_based' ? 'Por Nivel' : 'Manual'}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {calculatePercentages().map(p => {
                                const m = members.find(mem => mem.user_id === p.id);
                                return (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: '700' }}>{m?.profiles?.username}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Neto estimado: ${(netBudget * p.pct / 100).toFixed(2)}</div>
                                        </div>
                                        {payoutMethod === 'manual' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="number" 
                                                    value={manualPercentages[p.id] || ''} 
                                                    onChange={e => setManualPercentages({ ...manualPercentages, [p.id]: e.target.value })}
                                                    style={{ width: '70px', padding: '0.4rem', borderRadius: '6px', background: 'black', border: '1px solid var(--border)', color: 'white', textAlign: 'right' }}
                                                />
                                                <span style={{ fontWeight: '800' }}>%</span>
                                            </div>
                                        ) : (
                                            <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '1.2rem' }}>{p.pct.toFixed(1)}%</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.1)', marginBottom: '2rem' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#f59e0b' }}>
                                ⚠️ <b>Regla Anti-Explotación:</b> La suma debe ser 100% y el mínimo por miembro es 10%. Cooplance retiene un 12% de comisión de plataforma.
                            </p>
                        </div>

                        {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>Volver</button>
                            <button onClick={handleConfirm} className="btn-primary" style={{ flex: 2 }}>Confirmar y Aceptar Trabajo</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CoopAssignmentModal;
