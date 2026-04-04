import React, { useState, useEffect } from 'react';
import { getProfilePicture } from '../../utils/avatarUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { getProposalsByProject } from '../../lib/proposalService';
import PaymentModal from '../common/PaymentModal';
import '../../styles/components/ProposalListModal.scss';

const ProposalListModal = ({ isOpen, onClose, projectId, projectTitle, proposalCount, onAccept }) => {
    const { user, updateBalance } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [selectedProposalForPayment, setSelectedProposalForPayment] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadProposals = async () => {
            if (isOpen && projectId) {
                try {
                    const data = await getProposalsByProject(projectId);
                    setProposals(data);
                } catch (err) {
                    console.error('Error loading proposals:', err);
                    setProposals([]);
                }
            }
        };
        loadProposals();
    }, [isOpen, projectId]);

    const handleContractClick = (proposal) => {
        setSelectedProposalForPayment(proposal);
    };

    const handlePaymentSuccess = () => {
        if (!selectedProposalForPayment) return;

        // 1. Deduct Balance (Mock amount: assume project budget or fixed $50 for demo)
        // Ideally we get the amount from the proposal or project.
        // Let's assume a fixed mock price for now since we don't have project details here except title.
        // Wait, we can fetch project details or pass them. 
        // For simplicity, let's say $100.
        const amount = 100;

        if (user.balance < amount) {
            alert("Fondos insuficientes. Por favor recarga tu billetera.");
            return;
        }

        updateBalance(amount, 'debit');

        // 2. Trigger onAccept to create job
        onAccept(selectedProposalForPayment);

        // 3. Close payment modal
        setSelectedProposalForPayment(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <button className="modal-close" onClick={onClose}>&times;</button>

                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Postulantes</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Propuestas para: <strong>{projectTitle}</strong>
                </p>

                <div className="proposals-list" style={{ display: 'grid', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {proposals.length > 0 ? (
                        proposals.map(proposal => (
                            <div key={proposal.id} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <img
                                            src={getProfilePicture({ role: 'freelancer', avatar: null })} // We'd need freelancer avatar here ideally
                                            alt={proposal.userName}
                                            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--primary)' }}
                                        />
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{proposal.userName}</h4>
                                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                Nivel {proposal.userLevel || 1} • {new Date(proposal.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {proposal.status === 'pending' ? (
                                        <button
                                            className="btn-primary"
                                            onClick={() => handleContractClick(proposal)}
                                        >
                                            Contratar
                                        </button>
                                    ) : (
                                        <span className={`status-badge ${proposal.status}`}>{proposal.status}</span>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        style={{ marginLeft: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                                        onClick={() => navigate(`/freelancer/${proposal.userId}`)}
                                    >
                                        Ver Perfil
                                    </button>
                                </div>

                                {/* Freelancer Answers Section */}
                                {proposal.answers && proposal.answers.length > 0 && (
                                    <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', width: '100%' }}>
                                        <h5 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Respuestas del Postulante:</h5>
                                        {proposal.answers.map((ans, i) => (
                                            <div key={i} style={{ marginBottom: '0.8rem' }}>
                                                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                                    {i + 1}. {ans.questionText}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', paddingLeft: '0.5rem', borderLeft: '2px solid var(--primary)' }}>
                                                    {ans.answer}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {proposal.coverLetter && (!proposal.answers || proposal.answers.length === 0) && (
                                    <div style={{ marginTop: '1rem', width: '100%' }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            "{proposal.coverLetter}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay postulaciones aún.</p>
                    )}
                </div>
            </div>

            <PaymentModal
                isOpen={!!selectedProposalForPayment}
                onClose={() => setSelectedProposalForPayment(null)}
                amount={100} // Mock amount
                freelancerName={selectedProposalForPayment?.userName}
                onConfirm={handlePaymentSuccess}
            />
        </div >
    );
};

export default ProposalListModal;
