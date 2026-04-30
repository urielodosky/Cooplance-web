import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarFilter from '../components/common/SidebarFilter';
import ProjectCard from '../components/project/ProjectCard';
import ProjectSkeleton from '../components/project/ProjectSkeleton';
import { searchAndFilterItems } from '../utils/searchUtils';
import { useAuth } from '../features/auth/context/AuthContext';
import { registerActivity } from '../utils/gamification';
import ProposalApplyModal from '../components/project/ProposalApplyModal';
import PostulationTypeModal from '../components/project/PostulationTypeModal';
import CoopAssignmentModal from '../components/project/CoopAssignmentModal';
import { getProjects } from '../lib/projectService';
import { useActionModal } from '../context/ActionModalContext';
import { useTeams } from '../context/TeamContext';
import '../styles/pages/Explore.scss';

const ExploreClients = () => {
    const navigate = useNavigate();
    const { showActionModal } = useActionModal();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [selectedProjectForApply, setSelectedProjectForApply] = useState(null);
    const [loading, setLoading] = useState(true);

    // Phase 3: Coop Postulation States
    const { userTeams } = useTeams();
    const [isPostulationTypeModalOpen, setIsPostulationTypeModalOpen] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedCoopId, setSelectedCoopId] = useState(null);
    const [assignmentData, setAssignmentData] = useState(null);

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

                // Robust filtering for visibility
                const validProjects = data.filter(p => {
                    // 1. Never show company projects here
                    if (p.clientRole === 'company') return false;
                    
                    // 2. ONLY show 'open' projects. 
                    // If status is null/undefined, we assume it's open, but if it says 'hired' or anything else, we hide it.
                    const currentStatus = (p.status || 'open').toLowerCase();
                    if (currentStatus !== 'open') return false;

                    // 3. Filter out expired projects by deadline
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

        if (user.role !== 'freelancer' && user.role !== 'coop') {
            showActionModal({
                title: 'Acción No Permitida',
                message: 'Solo los freelancers y Coops pueden postularse a proyectos.',
                severity: 'warning'
            });
            return;
        }

        // Check if already applied via Supabase
        try {
            const { hasUserApplied } = await import('../lib/proposalService');
            const alreadyApplied = await hasUserApplied(projectId, user.id);
            if (alreadyApplied) {
                showActionModal({
                    title: 'Ya te has postulado',
                    message: 'Ya te has postulado a esta oferta. ¡Mucha suerte!',
                    severity: 'info'
                });
                return;
            }
        } catch (err) {
            console.error('Error checking application:', err);
        }

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Phase 3: Check if user can apply as a Coop
        const manageableCoops = userTeams.filter(t => 
            t.members.some(m => m.user_id === user.id && ['owner', 'admin'].includes(m.role))
        );

        if (manageableCoops.length > 0) {
            setSelectedProjectForApply(project);
            setIsPostulationTypeModalOpen(true);
        } else {
            setSelectedProjectForApply(project);
        }
    };

    const handlePostulationTypeSelect = (type, coopId) => {
        setIsPostulationTypeModalOpen(false);
        if (type === 'coop') {
            setSelectedCoopId(coopId);
            setIsAssignmentModalOpen(true);
        }
        // If 'individual', just leave it as is, ProposalApplyModal will open next
    };

    const handleAssignmentConfirm = (data) => {
        setIsAssignmentModalOpen(false);
        setAssignmentData(data);
        // Now the individual flow continues but with assignment data
    };

    const handleApplySuccess = () => {
        setSelectedProjectForApply(null);
        setAssignmentData(null);
        setSelectedCoopId(null);
        showActionModal({
            title: '¡Éxito!',
            message: '¡Postulación enviada con éxito!',
            severity: 'success'
        });
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

            {selectedProjectForApply && !isPostulationTypeModalOpen && !isAssignmentModalOpen && (
                <ProposalApplyModal
                    project={selectedProjectForApply}
                    onClose={() => {
                        setSelectedProjectForApply(null);
                        setAssignmentData(null);
                        setSelectedCoopId(null);
                    }}
                    onSuccess={handleApplySuccess}
                    coopId={selectedCoopId}
                    assignment={assignmentData}
                />
            )}

            <PostulationTypeModal 
                isOpen={isPostulationTypeModalOpen}
                onClose={() => {
                    setIsPostulationTypeModalOpen(false);
                    setSelectedProjectForApply(null);
                }}
                onSelect={handlePostulationTypeSelect}
                coops={userTeams.filter(t => t.members.some(m => m.user_id === user?.id && ['owner', 'admin'].includes(m.role)))}
            />

            <CoopAssignmentModal 
                isOpen={isAssignmentModalOpen}
                onClose={() => {
                    setIsAssignmentModalOpen(false);
                    setIsPostulationTypeModalOpen(true); // Go back
                }}
                coopId={selectedCoopId}
                budget={selectedProjectForApply?.budget || 0}
                onConfirm={handleAssignmentConfirm}
            />
        </div>
    );
};

export default ExploreClients;
