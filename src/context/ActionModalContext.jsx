import React, { createContext, useContext, useState, useCallback } from 'react';
import ActionModal from '../components/common/ActionModal';

const ActionModalContext = createContext();

export const useActionModal = () => {
    const context = useContext(ActionModalContext);
    if (!context) {
        throw new Error('useActionModal must be used within an ActionModalProvider');
    }
    return context;
};

export const ActionModalProvider = ({ children }) => {
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert',
        severity: 'info',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Aceptar',
        cancelText: 'Cancelar'
    });

    const showActionModal = useCallback((config) => {
        setModal({
            isOpen: true,
            title: config.title || 'Atención',
            message: config.message || '',
            type: config.type || 'alert',
            severity: config.severity || 'info',
            onConfirm: config.onConfirm || null,
            onCancel: config.onCancel || null,
            confirmText: config.confirmText || 'Aceptar',
            cancelText: config.cancelText || 'Cancelar'
        });
    }, []);

    const hideModal = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = () => {
        if (modal.onConfirm) modal.onConfirm();
        hideModal();
    };

    const handleCancel = () => {
        if (modal.onCancel) modal.onCancel();
        hideModal();
    };

    return (
        <ActionModalContext.Provider value={{ showActionModal, hideModal }}>
            {children}
            <ActionModal 
                isOpen={modal.isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                severity={modal.severity}
                confirmText={modal.confirmText}
                cancelText={modal.cancelText}
            />
        </ActionModalContext.Provider>
    );
};
