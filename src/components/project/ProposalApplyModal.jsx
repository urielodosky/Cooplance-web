import React, { useState } from 'react';
import { registerActivity } from '../../utils/gamification';
import { useAuth } from '../../features/auth/context/AuthContext';

const ProposalApplyModal = ({ project, onClose, onSuccess }) => {
    const { user, updateUser } = useAuth();
    const [answers, setAnswers] = useState({});
    const [coverLetter, setCoverLetter] = useState('');
    const [expirationDays, setExpirationDays] = useState('');
    const [error, setError] = useState('');

    const questions = project.questions || [];

    const handleAnswerChange = (qId, value) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate all questions are answered
        for (const q of questions) {
            if (!answers[q.id] || answers[q.id].trim() === '') {
                setError('Por favor responde todas las preguntas antes de postularte.');
                return;
            }
        }

        const storedProposals = JSON.parse(localStorage.getItem('cooplance_db_proposals') || '[]');

        // Structure the answers
        const formattedAnswers = questions.map(q => ({
            questionId: q.id,
            questionText: q.text,
            answer: answers[q.id]
        }));

        let expirationDate = null;
        if (expirationDays && !isNaN(parseInt(expirationDays))) {
             expirationDate = new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString();
        }

        const newProposal = {
            id: Date.now(),
            projectId: project.id,
            projectTitle: project.title,
            clientId: project.clientId || project.authorId,
            freelancerId: user.id,
            freelancerName: user.firstName + ' ' + user.lastName,
            freelancerLevel: user.level || 1,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expirationDate,
            coverLetter: coverLetter || 'Hola, estoy interesado en tu proyecto.',
            answers: formattedAnswers
        };

        const updatedProposals = [...storedProposals, newProposal];
        localStorage.setItem('cooplance_db_proposals', JSON.stringify(updatedProposals));

        // Register Activity
        if (updateUser) {
            const updatedUser = registerActivity(user);
            updateUser(updatedUser);
        }

        onSuccess();
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content glass" style={{
                width: '100%', maxWidth: '600px', padding: '2rem',
                borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                        Postularse a {project.clientRole === 'company' ? 'Oferta' : 'Proyecto'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{project.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Por {project.clientName}</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {questions.length > 0 && (
                        <div className="questions-section">
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Preguntas del Cliente</h4>
                            {questions.map((q, idx) => (
                                <div key={q.id} style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {idx + 1}. {q.text} <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>

                                    {q.type === 'multiple' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '0.5rem' }}>
                                            {q.options.map((opt, i) => (
                                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        value={opt}
                                                        checked={answers[q.id] === opt}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                        style={{ accentColor: 'var(--primary)' }}
                                                    />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={answers[q.id] || ''}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            placeholder="Tu respuesta..."
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            {questions.length > 0 ? 'Mensaje Adicional (Opcional)' : 'Carta de Presentación'}
                        </label>
                        <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder={questions.length > 0 ? "Añade cualquier otro detalle relevante..." : "Explica por qué eres el mejor candidato para este proyecto..."}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', minHeight: '100px', resize: 'vertical' }}
                            required={questions.length === 0}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            Validez de esta postulación en días <span style={{ opacity: 0.7, fontSize: '0.8rem', fontWeight: 'normal' }}>(Opcional, por defecto 30)</span>
                        </label>
                        <input 
                            type="number" 
                            min="1" 
                            max="180" 
                            value={expirationDays} 
                            onChange={e => setExpirationDays(e.target.value)} 
                            placeholder="Ej: 15"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.9rem' }}>{error}</p>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            Enviar Postulación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProposalApplyModal;
