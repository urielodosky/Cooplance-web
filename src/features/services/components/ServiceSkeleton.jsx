import React from 'react';
import '../../../styles/components/ServiceCard.scss';

const ServiceSkeleton = () => {
    return (
        <div className="service-card" style={{ cursor: 'default' }}>
            <div className="service-image-container">
                <div className="skeleton-pulse" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
            </div>

            <div className="service-content">
                <div className="freelancer-info">
                    <div className="skeleton-pulse skeleton-avatar"></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                        <div className="skeleton-pulse" style={{ height: '0.8rem', width: '100%' }}></div>
                        <div className="skeleton-pulse" style={{ height: '0.6rem', width: '60%' }}></div>
                    </div>
                </div>

                <div className="skeleton-pulse" style={{ height: '1.2rem', width: '90%', marginTop: '0.5rem' }}></div>
            </div>

            <div className="service-footer">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="skeleton-pulse skeleton-badge"></div>
                    <div className="skeleton-pulse skeleton-badge"></div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="skeleton-pulse" style={{ height: '0.6rem', width: '30px', marginBottom: '4px', marginLeft: 'auto' }}></div>
                    <div className="skeleton-pulse" style={{ height: '1.2rem', width: '50px', marginLeft: 'auto' }}></div>
                </div>
            </div>
        </div>
    );
};

export default ServiceSkeleton;
