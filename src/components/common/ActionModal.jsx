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
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease-out;
                }

                .action-modal-card {
                    width: 90%;
                    max-width: 450px;
                    padding: 2.5rem;
                    border-radius: 28px;
                    position: relative;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .close-btn {
                    position: absolute;
                    top: 1.2rem;
                    right: 1.2rem;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: all 0.2s;
                }

                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                }

                .modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    height: 80px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 24px;
                }

                .text-wrapper h3 {
                    margin: 0 0 0.8rem 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .text-wrapper p {
                    margin: 0;
                    font-size: 1rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .modal-footer button {
                    min-width: 120px;
                    padding: 0.8rem 1.5rem;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.95rem;
                }

                .text-success { color: #10b981; }
                .text-warning { color: #f59e0b; }
                .text-error { color: #ef4444; }
                .text-primary { color: var(--primary); }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ActionModal;
