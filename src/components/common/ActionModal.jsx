import React from 'react';
import { X, AlertCircle, CheckCircle, HelpCircle, Info } from 'lucide-react';

const ActionModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'alert', // 'alert' or 'confirm'
    severity = 'info', // 'info', 'success', 'warning', 'error'
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (severity) {
            case 'success': return <CheckCircle className="text-success" size={48} />;
            case 'warning': return <AlertCircle className="text-warning" size={48} />;
            case 'error': return <X className="text-error" size={48} />;
            case 'confirm': return <HelpCircle className="text-primary" size={48} />;
            default: return <Info className="text-primary" size={48} />;
        }
    };

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    return (
        <div className="action-modal-overlay" onClick={onClose}>
            <div className="action-modal-card glass-strong" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>
                
                <div className="modal-content">
                    <div className="icon-wrapper">
                        {getIcon()}
                    </div>
                    
                    <div className="text-wrapper">
                        <h3>{title}</h3>
                        <p>{message}</p>
                    </div>
                </div>

                <div className="modal-footer">
                    {type === 'confirm' && (
                        <button className="btn-ghost" onClick={onClose}>
                            {cancelText}
                        </button>
                    )}
                    <button 
                        className={`btn-primary ${severity === 'error' ? 'btn-danger' : (severity === 'warning' ? 'btn-warning' : '')}`} 
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .action-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 1rem;
                    animation: fadeIn 0.3s ease-out;
                }

                .action-modal-card {
                    width: 100%;
                    max-width: 440px;
                    background: var(--bg-card);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 32px;
                    padding: 2.5rem;
                    position: relative;
                    text-align: center;
                    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.5);
                    animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    color: var(--text-primary);
                }

                [data-theme='light'] .action-modal-card {
                    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.15);
                }

                .close-btn {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 14px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                    transform: rotate(90deg);
                }

                .modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }

                .icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 90px;
                    height: 90px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 28px;
                    position: relative;
                    border: 1px solid rgba(139, 92, 246, 0.2);
                }

                .icon-wrapper::after {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 32px;
                    border: 1px solid rgba(139, 92, 246, 0.1);
                    animation: pulse-ring 2s infinite;
                }

                .text-wrapper h3 {
                    margin: 0 0 1rem 0;
                    font-size: 1.75rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .text-wrapper p {
                    margin: 0;
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    max-width: 320px;
                    margin: 0 auto;
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    justify-content: stretch;
                }

                .modal-footer button {
                    flex: 1;
                    padding: 1rem 1.5rem;
                    border-radius: 18px;
                    font-weight: 700;
                    font-size: 1rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-ghost {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                }

                .btn-ghost:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
                    border: none;
                    color: white;
                    box-shadow: 0 10px 20px -5px rgba(139, 92, 246, 0.4);
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 25px -5px rgba(139, 92, 246, 0.5);
                }

                .btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.4);
                }

                .btn-warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    box-shadow: 0 10px 20px -5px rgba(245, 158, 11, 0.4);
                }

                .text-success { color: #10b981; }
                .text-warning { color: #f59e0b; }
                .text-error { color: #ef4444; }
                .text-primary { color: var(--primary); }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalPop {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }

                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.2); opacity: 0; }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ActionModal;
