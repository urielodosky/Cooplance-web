import React, { useState } from 'react';
import '../../styles/components/ProposalListModal.scss'; // Reusing modal styles

const PaymentModal = ({ isOpen, onClose, amount, freelancerName, onConfirm, allowedMethods }) => {
    const [step, setStep] = useState(1);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [installments, setInstallments] = useState(1);
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setProcessing(true);
        setTimeout(() => {
            setProcessing(false);
            onConfirm();
            setStep(1); // Reset for next time
            setSelectedMethod('');
        }, 1500);
    };

    // Base methods
    const allMethods = [
        { id: 'card', name: 'Tarjeta (Crédito/Débito)', icon: '💳', subtitle: 'Hasta 12 cuotas con interés' },
        { id: 'paypal', name: 'PayPal', icon: '🅿️', subtitle: 'Internacional (ARS)' },
        { id: 'mercadopago', name: 'Mercado Pago', icon: 'MP', subtitle: 'Argentina (Dinero en cuenta/Tarjeta)' },
        { id: 'binance', name: 'Binance Pay', icon: '₿', subtitle: 'Criptomonedas (USDT/BTC)' }
    ];

    // Filter methods: Always show Card (Platform), others depend on freelancer
    const methods = allMethods.filter(m => {
        if (m.id === 'card') return true;
        if (!allowedMethods) return true; // Show all if no restrictions defined (legacy/default)
        return allowedMethods[m.id];
    });

    const calculateInstallments = () => {
        if (!amount) return 0;
        if (installments === 1) return amount;
        // Mock interest: 5% per 3 installments
        const interestRate = 0.05 * (installments / 3);
        const totalWithInterest = amount * (1 + interestRate);
        return (totalWithInterest / installments).toFixed(2);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <button className="modal-close" onClick={onClose}>&times;</button>

                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    {step === 1 ? 'Elige cómo pagar' : 'Confirmar Pago'}
                </h2>

                {step === 1 && (
                    <>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total a Pagar:</span>
                                <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>${amount} ARS</strong>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            {methods.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedMethod(m.id)}
                                    style={{
                                        padding: '1rem',
                                        background: selectedMethod === m.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        border: selectedMethod === m.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s ease',
                                        color: selectedMethod === m.id ? 'white' : 'var(--text-primary)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem', width: '30px', textAlign: 'center' }}>{m.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{m.subtitle}</div>
                                    </div>
                                    {selectedMethod === m.id && <span>✓</span>}
                                </div>
                            ))}
                        </div>

                        {selectedMethod === 'card' && (
                            <div className="fade-in" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cantidad de Cuotas</label>
                                <select
                                    className="form-input"
                                    value={installments}
                                    onChange={(e) => setInstallments(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                >
                                    <option value={1}>1 pago de ${amount} ARS</option>
                                    <option value={3}>3 cuotas de ${calculateInstallments()} ARS (Interés 5%)</option>
                                    <option value={6}>6 cuotas de ${calculateInstallments()} ARS (Interés 10%)</option>
                                    <option value={12}>12 cuotas de ${calculateInstallments()} ARS (Interés 20%)</option>
                                </select>
                            </div>
                        )}

                        <button
                            className="btn-primary"
                            style={{ width: '100%' }}
                            disabled={!selectedMethod}
                            onClick={() => setStep(2)}
                        >
                            Continuar
                        </button>
                    </>
                )}

                {step === 2 && (
                    <div style={{ textAlign: 'center' }}>
                        {!processing ? (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                    {selectedMethod === 'paypal' ? '🅿️' : selectedMethod === 'mercadopago' ? 'MP' : selectedMethod === 'binance' ? '₿' : '💳'}
                                </div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{methods.find(m => m.id === selectedMethod)?.name}</h3>

                                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                    Vas a pagar <strong>${amount} ARS</strong>
                                    {selectedMethod === 'card' && installments > 1 && ` en ${installments} cuotas`}.
                                    <br />
                                    <small>Se te redirigirá a la pasarela segura para finalizar.</small>
                                </p>

                                <button
                                    className="btn-primary"
                                    style={{ width: '100%', marginBottom: '1rem' }}
                                    onClick={handleConfirm}
                                >
                                    Pagar Ahora
                                </button>
                                <button
                                    className="btn-secondary"
                                    style={{ width: '100%' }}
                                    onClick={() => setStep(1)}
                                >
                                    Volver
                                </button>
                            </>
                        ) : (
                            <div style={{ padding: '2rem 0' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <p>Conectando con {methods.find(m => m.id === selectedMethod)?.name}...</p>
                                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
