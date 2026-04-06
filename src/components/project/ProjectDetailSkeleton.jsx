import React from 'react';
import '../../styles/pages/ServiceDetail.scss';
import '../../styles/pages/ProjectDetail.scss';
import '../../styles/components/ProjectCard.scss'; // Reuse skeleton-pulse

const ProjectDetailSkeleton = () => {
    return (
        <div className="container service-detail-container" style={{ paddingTop: '2rem' }}>
            <div className="skeleton-pulse" style={{ width: '100px', height: '40px', marginBottom: '1.5rem', borderRadius: '8px' }}></div>

            <div className="detail-grid">
                {/* Main Content */}
                <div className="detail-main">
                    <div className="detail-content">
                        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                            <div className="skeleton-pulse" style={{ height: '3rem', width: '70%', marginBottom: '1rem' }}></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div className="skeleton-pulse" style={{ height: '1.5rem', width: '80px', borderRadius: '15px' }}></div>
                                <div className="skeleton-pulse" style={{ height: '1.5rem', width: '60px', borderRadius: '15px' }}></div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <div className="skeleton-pulse" style={{ height: '1.5rem', width: '200px', marginBottom: '1rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1rem', width: '100%', marginBottom: '0.6rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1rem', width: '100%', marginBottom: '0.6rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1rem', width: '60%' }}></div>
                        </div>

                        <div className="glass detail-section" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px' }}>
                            <div className="skeleton-pulse" style={{ height: '1.2rem', width: '150px', marginBottom: '1rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1rem', width: '100%', marginBottom: '0.5rem' }}></div>
                            <div className="skeleton-pulse" style={{ height: '1rem', width: '80%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="detail-sidebar">
                    <div className="single-price-box">
                        <div className="skeleton-pulse" style={{ height: '1rem', width: '100px', marginBottom: '0.5rem' }}></div>
                        <div className="skeleton-pulse" style={{ height: '2.5rem', width: '180px', marginBottom: '1.5rem' }}></div>
                        <div className="skeleton-pulse" style={{ height: '3rem', width: '100%', borderRadius: '10px' }}></div>
                    </div>

                    <div className="detail-content" style={{ padding: '1.5rem', borderTop: '4px solid var(--primary)', marginTop: '1.5rem' }}>
                        <div className="skeleton-pulse" style={{ height: '1.2rem', width: '120px', marginBottom: '1.2rem' }}></div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="skeleton-pulse" style={{ width: '50px', height: '50px', borderRadius: '50%' }}></div>
                            <div style={{ flex: 1 }}>
                                <div className="skeleton-pulse" style={{ height: '1rem', width: '80%', marginBottom: '0.5rem' }}></div>
                                <div className="skeleton-pulse" style={{ height: '0.8rem', width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailSkeleton;
