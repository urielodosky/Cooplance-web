import React from 'react';
import '../../styles/components/ProjectCard.scss';

const ProjectSkeleton = () => {
    return (
        <div className="project-card" style={{ cursor: 'default' }}>
            <div className="project-content">
                <div className="client-info">
                    <div className="skeleton-pulse skeleton-avatar"></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                        <div className="skeleton-pulse" style={{ height: '0.8rem', width: '100%' }}></div>
                        <div className="skeleton-pulse" style={{ height: '0.6rem', width: '60%' }}></div>
                    </div>
                </div>

                <div className="skeleton-pulse skeleton-title" style={{ marginTop: '0.5rem' }}></div>
                
                <div style={{ marginTop: '0.5rem' }}>
                    <div className="skeleton-pulse skeleton-text"></div>
                    <div className="skeleton-pulse skeleton-text" style={{ width: '90%' }}></div>
                    <div className="skeleton-pulse skeleton-text" style={{ width: '40%' }}></div>
                </div>
            </div>

            <div className="project-footer">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="skeleton-pulse skeleton-badge"></div>
                    <div className="skeleton-pulse skeleton-badge"></div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className="skeleton-pulse" style={{ height: '0.6rem', width: '40px', marginBottom: '4px', marginLeft: 'auto' }}></div>
                    <div className="skeleton-pulse" style={{ height: '1.2rem', width: '60px', marginLeft: 'auto' }}></div>
                </div>
            </div>
        </div>
    );
};

export default ProjectSkeleton;
