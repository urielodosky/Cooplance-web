import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarFilter from '../components/common/SidebarFilter';
import ProjectCard from '../components/project/ProjectCard';
import ProjectSkeleton from '../components/project/ProjectSkeleton';
import { searchAndFilterItems } from '../utils/searchUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { registerActivity } from '../utils/gamification';
import { seedDatabase } from '../utils/seedData';
import ProposalApplyModal from '../components/project/ProposalApplyModal';
import { getProjects } from '../lib/projectService';
import '../styles/pages/Explore.scss';

const ExploreClients = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedProjectForApply, setSelectedProjectForApply] = useState(null);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        subcategory: [],
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        level: '',
        location: '',
        experience: []
    });

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const data = await getProjects();
                const now = new Date();

                // Robust filtering for expired projects (already done in mapper but just in case)
                const validProjects = data.filter(p => {
                    if (p.clientRole === 'company') return false; 
                    if (!p.deadline) return true;

                    try {
                        const deadlineDate = new Date(p.deadline);
                        return now <= deadlineDate;
                    } catch (e) {
                        return true;
                    }
                });

                // Map/Normalize fields for searchUtils if necessary
                const allProjects = validProjects.map(p => ({
                    ...p,
                    tags: [p.category, ...(p.tags || [])],
                    price: p.budget,
                    paymentMethods: p.paymentMethods || {}
                }));

                setProjects(allProjects);
                setFilteredProjects(allProjects);
            } catch (err) {
                console.error('Error loading projects:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        const results = searchAndFilterItems(projects, newFilters);
        setFilteredProjects(results);
    };

    const { user, updateUser } = useAuth();

    const handleApply = async (projectId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.role !== 'freelancer') {
            alert('Solo los freelancers pueden postularse a proyectos.');
            return;
        }

        // Check if already applied via Supabase
        try {
            const { hasUserApplied } = await import('../lib/proposalService');
            const alreadyApplied = await hasUserApplied(projectId, user.id);
            if (alreadyApplied) {
                alert('Ya te has postulado a esta oferta.');
                return;
            }
        } catch (err) {
            console.error('Error checking application:', err);
        }

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        setSelectedProjectForApply(project);
    };

    const handleApplySuccess = () => {
        setSelectedProjectForApply(null);
        alert('¡Postulación enviada con éxito!');
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div className="explore-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 className="explore-title">Solicitudes de Trabajo</h2>
                        <p className="explore-subtitle">
                            Encuentra oportunidades publicadas por clientes particulares.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('¿Estás seguro? Se borrarán los datos actuales y se cargarán los nuevos ejemplos (Presencial/Remoto, Ratings, etc).')) {
                                seedDatabase();
                                window.location.reload();
                            }
                        }}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        Recargar Datos de Prueba
                    </button>
                </div>
            </div>

            <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />

            <div className="explore-content">
                <div className="services-grid-explore">
                    {loading ? (
                        <>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <ProjectSkeleton key={i} />
                            ))}
                        </>
                    ) : projects.length === 0 ? (
                        <div className="no-results glass full-width-msg">
                            <h3>Aún no existen pedidos registrados.</h3>
                            <p>Las solicitudes de trabajo aparecerán aquí.</p>
                        </div>
                    ) : filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onApply={handleApply}
                            />
                        ))
                    ) : (
                        <div className="no-results glass">
                            <h3>No hay proyectos disponibles con esos filtros.</h3>
                            <p>Intenta ajustar tus filtros o vuelve más tarde.</p>
                            <button className="btn-secondary" onClick={() => window.location.reload()}>Ver todos</button>
                        </div>
                    )}
                </div>
            </div>

            {selectedProjectForApply && (
                <ProposalApplyModal
                    project={selectedProjectForApply}
                    onClose={() => setSelectedProjectForApply(null)}
                    onSuccess={handleApplySuccess}
                />
            )}
        </div>
    );
};

export default ExploreClients;
