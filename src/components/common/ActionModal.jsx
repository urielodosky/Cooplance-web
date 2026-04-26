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
                
                <div className="action-modal-content">
                    <div className={`action-modal-icon-wrapper severity-${severity}`}>
                        {getIcon()}
                    </div>
                    
                    <div className="action-modal-text-wrapper">
                        <h3>{title}</h3>
                        <p>{message}</p>
                        {type === 'prompt' && (
                            <textarea 
                                className="action-modal-input" 
                                value={inputValue} 
                                onChange={(e) => onInputChange(e.target.value)}
                                placeholder="Escribe aquí el motivo..."
                                autoFocus
                                maxLength={maxLength}
                            />
                        )}
                    </div>
                </div>

                <div className="action-modal-footer">
                    {(type === 'confirm' || type === 'prompt') && (
                        <button className="action-modal-btn btn-ghost" onClick={onClose}>
                            {cancelText}
                        </button>
                    )}
                    <button 
                        className={`action-modal-btn btn-primary ${severity === 'error' ? 'btn-danger' : (severity === 'warning' ? 'btn-warning' : (severity === 'success' ? 'btn-success' : ''))}`} 
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
                    z-index: 10000;
                    padding: 1.5rem;
                    animation: fadeIn 0.2s ease-out;
                }

                .action-modal-card {
                    width: 100%;
                    max-width: 440px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 28px;
                    padding: 2.5rem 2rem;
                    position: relative;
                    text-align: center;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
                    animation: modalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    color: var(--text-primary);
                    overflow: hidden;
                }

                /* LIGHT MODE FIXES */
                :global([data-theme='light']) .action-modal-card {
                    background: #ffffff !important;
                    border-color: #e2e8f0 !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1) !important;
                    color: #0f172a !important;
                }

                :global([data-theme='light']) .action-modal-text-wrapper h3 {
                    color: #0f172a !important;
                }

                :global([data-theme='light']) .action-modal-text-wrapper p {
                    color: #475569 !important;
                }

                .close-btn {
                    position: absolute;
                    top: 1.25rem;
                    right: 1.25rem;
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
                    z-index: 10;
                }

                .close-btn:hover {
                    background: rgba(139, 92, 246, 0.1);
                    color: var(--primary);
                }

                .action-modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                    background: transparent !important; /* Force transparent to avoid ugly boxes */
                }

                .action-modal-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    height: 80px;
                    border-radius: 24px;
                    margin-bottom: 0.5rem;
                    transition: all 0.3s ease;
                }

                .severity-info { background: rgba(139, 92, 246, 0.1); color: var(--primary); }
                .severity-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .severity-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .severity-error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .severity-confirm { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }

                .action-modal-text-wrapper h3 {
                    margin: 0 0 0.75rem 0;
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    letter-spacing: -0.03em;
                    line-height: 1.2;
                }

                .action-modal-text-wrapper p {
                    margin: 0;
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    max-width: 340px;
                }

                .action-modal-input {
                    width: 100%;
                    padding: 1.2rem;
                    border-radius: 18px;
                    border: 1px solid var(--border);
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                    font-size: 1rem;
                    resize: none;
                    min-height: 130px;
                    margin-top: 1.5rem;
                    outline: none;
                    transition: all 0.3s ease;
                    font-family: inherit;
                }

                :global([data-theme='light']) .action-modal-input {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                    color: #0f172a;
                }

                .action-modal-input:focus {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
                }

                .action-modal-footer {
                    display: flex;
                    gap: 1.25rem;
                    justify-content: stretch;
                }

                .action-modal-btn {
                    flex: 1;
                    padding: 1rem 1.5rem;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                }

                .btn-ghost {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                }

                :global([data-theme='light']) .btn-ghost {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                    color: #475569;
                }

                .btn-ghost:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--text-muted);
                    color: var(--text-primary);
                }

                .btn-primary {
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
                    color: white;
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                }

                .btn-success {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }

                .btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                }

                .btn-warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                }

                .action-modal-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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
                    from { transform: scale(0.92) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ActionModal;
