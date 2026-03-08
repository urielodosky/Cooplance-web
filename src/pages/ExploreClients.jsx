import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarFilter from '../components/common/SidebarFilter';
import ProjectCard from '../components/project/ProjectCard';
import { searchAndFilterItems } from '../utils/searchUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { registerActivity } from '../utils/gamification';
import { seedDatabase } from '../utils/seedData';
import ProposalApplyModal from '../components/project/ProposalApplyModal';
import '../styles/pages/Explore.scss';

const ExploreClients = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedProjectForApply, setSelectedProjectForApply] = useState(null);

    const [filters, setFilters] = useState({
        query: '',
        category: '',
        subcategory: [],
        priceMin: '',
        priceMax: '',
        rating: 0,
        workMode: [],
        workMode: [],
        level: '',
        location: '',
        experience: []
    });

    useEffect(() => {
        const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const now = new Date();

        // Sort by newest first by default and Filter Expired
        const validProjects = storedProjects.filter(p => {
            // First, filter out projects posted by 'company' role clients
            const client = storedUsers.find(u => u.id === p.clientId) || {};
            if (client.role === 'company') {
                return false; // Exclude projects from companies
            }

            if (!p.deadline) return true; // No deadline = never expires

            // Avoid boolean deadline error just in case
            if (typeof p.deadline !== 'string') return true;

            // Robust parsing for YYYY-MM-DD to avoid timezone issues with new Date(string)
            try {
                const [year, month, day] = p.deadline.split('-').map(Number);
                const deadlineDate = new Date(year, month - 1, day, 23, 59, 59, 999);
                return now <= deadlineDate;
            } catch (e) {
                return true; // Keep if date is invalid to avoid accidental hiding
            }
        });

        const allProjects = validProjects.reverse().map(p => {
            const client = storedUsers.find(u => u.id === p.clientId) || {};
            return {
                ...p,
                clientRating: client.rating || 0,
                clientReviews: client.reviewsCount || 0,
                clientAvatar: client.avatar || p.clientAvatar,
                // Normalize fields for searchUtils if necessary
                tags: [p.category, ...(p.tags || [])], // Ensure category is searchable
                price: p.budgetMin, // Map budget to price for filter compatibility
                // If project has specific methods, use them. Otherwise fallback to client's methods.
                paymentMethods: p.paymentMethods || client.paymentMethods || {}
            };
        });
        setProjects(allProjects);
        setFilteredProjects(allProjects);
    }, []);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        const results = searchAndFilterItems(projects, newFilters);
        setFilteredProjects(results);
    };

    const { user, updateUser } = useAuth();

    const handleApply = (projectId) => {
        if (!user) {
            alert('Debes iniciar sesión para postularte.');
            navigate('/login');
            return;
        }

        if (user.role !== 'freelancer' && user.role !== 'company') {
            // Companies can also act as freelancers sometimes? Assuming mostly freelancers.
            // letting 'company' role apply if they want to act as service provider? 
            // Requirement said "Freelancer Application", but let's stick to freelancer role for safety or allow both if acceptable.
            // For now, let's allow freelancer.
            if (user.role !== 'freelancer') {
                alert('Solo los freelancers pueden postularse a proyectos.');
                return;
            }
        }

        const storedProposals = JSON.parse(localStorage.getItem('cooplance_db_proposals') || '[]');

        // Check if already applied
        const alreadyApplied = storedProposals.some(p => p.projectId === projectId && p.freelancerId === user.id);
        if (alreadyApplied) {
            alert('Ya te has postulado a este proyecto.');
            return;
        }

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Instead of immediate apply, open the modal
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
                    {projects.length === 0 ? (
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
