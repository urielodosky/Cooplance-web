import React from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCreateForm from '../components/ServiceCreateForm';

const CreateService = () => {
    const navigate = useNavigate();

    const handleCancel = () => {
        navigate('/dashboard');
    };

    return (
        <div style={{ padding: '2rem' }}>
            <ServiceCreateForm onCancel={handleCancel} />
        </div>
    );
};

export default CreateService;
