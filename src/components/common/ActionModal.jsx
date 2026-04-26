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
    cancelText = 'Cancelar',
    inputValue = '',
    onInputChange = () => {},
    maxLength = 300
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
                        {type === 'prompt' && (
                            <textarea 
                                className="modal-input" 
                                value={inputValue} 
                                onChange={(e) => onInputChange(e.target.value)}
                                placeholder="Escribe aquí el motivo..."
                                autoFocus
                                maxLength={maxLength}
                            />
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    {(type === 'confirm' || type === 'prompt') && (
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
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 1.5rem;
                    animation: fadeIn 0.2s ease-out;
                }

                .action-modal-card {
                    width: 100%;
                    max-width: 420px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 2.5rem 2rem;
                    position: relative;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    color: var(--text-primary);
                    backdrop-filter: blur(12px);
                }

                :global([data-theme='light']) .action-modal-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    color: #0f172a;
                }

                :global([data-theme='light']) .text-wrapper h3 {
                    color: #0f172a;
                }

                :global([data-theme='light']) .text-wrapper p {
                    color: #475569;
                }

                :global([data-theme='light']) .modal-input {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #0f172a;
                }

                :global([data-theme='light']) .modal-input:focus {
                    background: #ffffff;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
                }

                :global([data-theme='light']) .btn-ghost {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                    color: #475569;
                }

                :global([data-theme='light']) .btn-ghost:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }

                .close-btn {
                    position: absolute;
                    top: 1.2rem;
                    right: 1.2rem;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 12px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    background: rgba(139, 92, 246, 0.1);
                    color: var(--primary);
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
                    width: 72px;
                    height: 72px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 20px;
                    color: var(--primary);
                    margin-bottom: 0.5rem;
                }

                .text-wrapper h3 {
                    margin: 0 0 0.75rem 0;
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    letter-spacing: -0.02em;
                }

                .text-wrapper p {
                    margin: 0;
                    font-size: 1rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    max-width: 320px;
                }

                .modal-input {
                    width: 100%;
                    padding: 1rem;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    resize: none;
                    min-height: 120px;
                    margin-top: 1.5rem;
                    outline: none;
                    transition: all 0.3s ease;
                    font-family: inherit;
                }

                .modal-input:focus {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    justify-content: stretch;
                }

                .modal-footer button {
                    flex: 1;
                    padding: 0.9rem 1.5rem;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-ghost {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                }

                .btn-ghost:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--text-muted);
                    color: var(--text-primary);
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
                    border: none;
                    color: white;
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
                }

                .btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                }

                .btn-danger:hover {
                    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
                }

                .btn-warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                }

                .btn-warning:hover {
                    box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
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
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ActionModal;
