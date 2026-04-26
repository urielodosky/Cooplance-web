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
    onInputChange = () => {}
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
                    max-width: 400px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    color: var(--text-primary);
                }

                /* Ensure variables are used correctly and override for light mode explicitly if needed */
                :global([data-theme='light']) .action-modal-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }

                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 50%;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    background: var(--bg-body);
                    color: var(--text-primary);
                }

                .modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.2rem;
                    margin-bottom: 2rem;
                }

                .icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 64px;
                    height: 64px;
                    background: rgba(139, 92, 246, 0.08);
                    border-radius: 16px;
                    color: var(--primary);
                }

                .text-wrapper h3 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .text-wrapper p {
                    margin: 0 0 1rem 0;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    color: var(--text-secondary);
                }

                .modal-input {
                    width: 100%;
                    padding: 0.8rem;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    background: var(--bg-body);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    resize: none;
                    min-height: 100px;
                    margin-top: 1rem;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .modal-input:focus {
                    border-color: var(--primary);
                }

                .modal-footer {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: stretch;
                }

                .modal-footer button {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-ghost {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                }

                .btn-ghost:hover {
                    background: var(--bg-body);
                    border-color: var(--text-muted);
                    color: var(--text-primary);
                }

                .btn-primary {
                    background: var(--primary);
                    border: 1px solid var(--primary);
                    color: white;
                }

                .btn-primary:hover {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
                }

                .btn-danger {
                    background: #ef4444;
                    border-color: #ef4444;
                }

                .btn-danger:hover {
                    background: #dc2626;
                }

                .btn-warning {
                    background: #f59e0b;
                    border-color: #f59e0b;
                }

                .btn-warning:hover {
                    background: #d97706;
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
