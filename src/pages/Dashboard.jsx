import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useServices } from '../features/services/context/ServiceContext';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';
import ServiceCard from '../features/services/components/ServiceCard';
import ProjectCard from '../components/project/ProjectCard';
import LevelUpModal from '../components/gamification/LevelUpModal';
import ProposalListModal from '../components/project/ProposalListModal'; // New Import
import { calculateNextLevelXP, MAX_LEVEL, MAX_BUFFER_XP, activateVacation, registerActivity } from '../utils/gamification';
import { getProfilePicture } from '../utils/avatarUtils';
import '../styles/pages/Dashboard.scss';
// Assuming Dashboard might have inline styles per original file, or use global CSS.

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const { jobs, updateJobStatus } = useJobs();
    const { services } = useServices();
    const { createChat } = useChat();
    const { addNotification } = useNotifications();
    const navigate = useNavigate();

    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [myPublishedProjects, setMyPublishedProjects] = useState([]);
    const [myProposals, setMyProposals] = useState([]);

    // Load Projects & Proposals Logic
    useEffect(() => {
        const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');
        const storedProposals = JSON.parse(localStorage.getItem('cooplance_db_proposals') || '[]');

        // 1. My Published Projects (Client/Company)
        const myProjects = storedProjects.filter(p =>
            p.clientId === user.id ||
            p.userId === user.id ||
            p.authorId === user.id
        ).map(p => {
            // Calculate proposal count
            const count = storedProposals.filter(prop => prop.projectId === p.id).length;
            return { ...p, proposalCount: count };
        });
        setMyPublishedProjects(myProjects.reverse());

        // 2. My Proposals (Freelancer)
        const myProps = storedProposals.filter(p => p.freelancerId === user.id).map(prop => {
            const project = storedProjects.find(proj => proj.id == prop.projectId); // Loose equality for ID match
            return {
                ...prop,
                clientRole: project ? (project.role || project.clientRole || (project.clientId > 200 && project.clientId < 300 ? 'company' : 'buyer')) : null
            };
        });
        // Enrich with project details if needed, though they are stored in proposal
        setMyProposals(myProps.reverse());

        setMyProposals(myProps.reverse());
    }, [user.id]);

    // MIGRATION: Update Vacation Credits from 2 to 4 for existing users
    useEffect(() => {
        if (user.role === 'freelancer' || user.role === 'company') {
            const g = user.gamification || {};
            if (g.vacation && !g.vacation.policyV2) {
                // Policy changed from 2 to 4. Add 2 credits to current balance.
                const newCredits = (g.vacation.credits || 0) + 2;
                updateUser({
                    ...user,
                    gamification: {
                        ...g,
                        vacation: {
                            ...g.vacation,
                            credits: newCredits,
                            policyV2: true // Mark as updated
                        }
                    }
                });
            }
        }
    }, [user, updateUser]);

    // Computed Data
    const myWork = jobs.filter(j => j.freelancerName === (user.firstName + ' ' + user.lastName) || j.freelancerName === user.companyName); // Heuristic based on original code usage
    const myServices = services.filter(s => s.freelancerId === user.id || s.freelancerName === (user.firstName + ' ' + user.lastName)); // Added freelancerId check
    const myOrders = jobs.filter(j => j.buyerId === user.id);

    // Level Logic
    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const nextLevelXP = calculateNextLevelXP(currentLevel);
    const isMaxLevel = currentLevel >= MAX_LEVEL;

    // XP Bar Logic
    const xpPercentage = isMaxLevel
        ? Math.min(Math.max(0, (currentXP - 10000) / MAX_BUFFER_XP) * 100, 100)
        : Math.min((currentXP / nextLevelXP) * 100, 100);

    const xpDisplayText = isMaxLevel
        ? `${currentXP - 10000} / ${MAX_BUFFER_XP} Buffer XP`
        : `${currentXP} / ${nextLevelXP} XP`;

    const levelLabel = isMaxLevel ? "Nivel Máximo (10)" : `Progreso al Nivel ${currentLevel + 1}`;

    // Handlers
    const handleDemoLevelUp = () => {
        if ((user.level || 1) >= MAX_LEVEL) {
            // If max level, add XP to buffer to test
            const currentXP = user.xp || 0;
            const newXP = Math.min(currentXP + 1000, 10000 + MAX_BUFFER_XP); // Cap buffer
            updateUser({ ...user, xp: newXP });
            alert(`¡XP sumada al Buffer! Total: ${newXP}`);
            return;
        }

        const newLevel = (user.level || 1) + 1;
        const newXp = calculateNextLevelXP(newLevel);
        updateUser({ ...user, level: newLevel, xp: newXp });
        setShowLevelUpModal(true);
    };

    const handleDemoLevelDown = () => {
        const currentLevel = user.level || 1;
        if (currentLevel <= 1) return;
        const newLevel = currentLevel - 1;
        // Set XP to start of that level, which is calculated by recursive check or just 0 for now?
        // Simply setting XP to 0 for simplicity.
        updateUser({ ...user, level: newLevel, xp: 0 });
    };

    const handleVacationClick = () => {
        const g = user.gamification || {};
        if (g.vacation?.active) {
            alert("Ya estás en modo vacaciones. Disfruta tu tiempo libre.");
            return;
        }
        if ((g.vacation?.credits || 0) <= 0) {
            alert("No tienes créditos de vacaciones disponibles este año.");
            return;
        }

        const confirm = window.confirm(`¿Activar modo vacaciones? Se pausará el decaimiento de XP por 15 días. Te quedan ${g.vacation?.credits} usos.`);
        if (confirm) {
            const updated = activateVacation(user);
            updateUser(updated);
        }
    };



    const handleCreateServiceClick = () => {
        // Limit Logic: 1 service per Level up to Level 5.
        // Level 5+ = 5 Services MAX (Level 6+ affects commissions, not service count)
        const currentLevel = user.level || 1;
        const maxServices = currentLevel >= 5 ? 5 : currentLevel;

        if (myServices.length >= maxServices) {
            let msg = `Has alcanzado el límite de servicios activos (${maxServices}) para tu Nivel ${currentLevel}.`;
            if (currentLevel < 5) {
                msg += `\n\n¡Sube de nivel completando trabajos para desbloquear más espacios! (Máximo 5 en Nivel 5)`;
            } else {
                msg += `\n\nHas alcanzado el máximo de servicios permitidos. A partir del Nivel 6, tus beneficios mejorarán las comisiones.`;
            }
            alert(msg);
            return;
        }

        navigate('/create-service');
    };


    const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null); // { id, title }

    const handleAcceptProposal = (proposal) => {
        // Find necessary details
        // Proposal has: projectId, freelancerId, freelancerName, etc.
        const project = myPublishedProjects.find(p => p.id === proposal.projectId);
        if (!project) return;

        // 1. Create Job (using JobContext logic manually for now to include stored data logic)
        // Ideally reuse createJob but we need specific fields from proposal
        const newJob = {
            id: Date.now(),
            serviceId: 'project_' + project.id, // Using project ID as pseudo service ID
            serviceTitle: project.title,
            freelancerName: proposal.freelancerName,

            // Buyer is current user
            buyerId: user.id,
            buyerName: user.role === 'company' ? user.companyName : (user.firstName + ' ' + user.lastName),
            buyerRole: user.role,
            buyerAvatar: user.avatar || null,

            amount: project.budgetMin, // Default to min budget or negotiated price? user didn't specify.
            tier: 'Project',
            status: 'active', // Skip approval for direct hire? or pending? Let's say active for simplicity.
            createdAt: new Date().toISOString(),
            duration: 7, // Default
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        // Add to Jobs
        // accessing jobs from context doesn't give us setJobs directly usually, only createJob.
        // We really should expose a robust createJob in context or modify it. 
        // But let's check createJob in JobContext again... it takes (service, buyer).
        // It constructs the job based on service object.
        // We can mock a service object from the proposal/project to reuse createJob!

        const mockService = {
            id: project.id,
            title: project.title,
            freelancerName: proposal.freelancerName,
            price: project.budgetMin, // Using min budget as price
            deliveryTime: 7
        };

        // We need to pass the BUYER (us).
        // But wait, createJob assumes the BUYER is calling it to buy a service.
        // HERE, the Client (Buyer) is calling it to HIRE a Freelancer.
        // The JobContext `createJob` logic sets `buyerId` from the passed buyer object.
        // And it sets `freelancerName` from `service.freelancerName`.
        // So yes, passing `mockService` with `freelancerName` and `user` as buyer works!

        // However, we also need to update the PROPOSAL status to 'accepted'.
        const storedProposals = JSON.parse(localStorage.getItem('cooplance_db_proposals') || '[]');
        const updatedProposals = storedProposals.map(p =>
            p.id === proposal.id ? { ...p, status: 'accepted' } : p
        );
        localStorage.setItem('cooplance_db_proposals', JSON.stringify(updatedProposals));

        // Update local state to reflect change immediately in UI (remove from pending list visual if we wanted, or just status update)
        setMyProposals(updatedProposals.filter(p => p.freelancerId === user.id).reverse());

        // Close modal
        setSelectedProjectForProposals(null);

        // Call Context to create job
        // Note: We need to import createJob from context. We have `jobs` and `updateJobStatus` from `useJobs`.
        // We need to destructure `createJob` from `useJobs` in the component definition first.
        // ... I will add that in a separate replacement or assume I can add it here if I replace the hook call.

        // I will use a separate replacement to add `createJob` to the destructuring.
        // Here I will just Alert for now as a placeholder for the context call, or try to call it if I can access it.
        // I'll emit a custom event or let the next tool call fix the context destructuring.
        // actually, let's just create the job properly manually here or invoke a helper. 
        // I will assume createJob is available (will fix in next step).
        // createJob(mockService, user); // Will uncomment after fixing destructure.

        // Manual Job Creation for now to ensure it works without breaking due to missing 'createJob'
        const storedJobs = JSON.parse(localStorage.getItem('cooplance_db_jobs') || '[]');
        storedJobs.push(newJob);
        localStorage.setItem('cooplance_db_jobs', JSON.stringify(storedJobs));
        window.location.reload(); // Brute force refresh to show new job and close modal
    };

    return (
        <div className="dashboard-container">
            {/* ... header ... */}
            {/* ... stats ... */}

            {/* Modal Injection */}
            <ProposalListModal
                isOpen={!!selectedProjectForProposals}
                onClose={() => setSelectedProjectForProposals(null)}
                projectId={selectedProjectForProposals?.id}
                projectTitle={selectedProjectForProposals?.title}
                onAccept={handleAcceptProposal}
            // We need to implement the callback prop!
            // But I didn't define it in the Component file properly in previous step (I passed it as prop but didn't export it well, wait).
            // I wrote: `onClick={() => handleAccept && handleAccept(proposal)}` inside the component.
            // So I need to pass `handleAccept={handleAcceptProposal}`.
            // But looking at my previous `write_to_file`, I didn't add `handleAccept` to the props destructuring: `const ProposalListModal = ({ isOpen, onClose, projectId, projectTitle, proposalCount }) => {`.
            // I missed `handleAccept`.
            // I will need to fix `ProposalListModal.jsx` to accept `onAccept` or `handleAccept`.
            // For now, I will render it and plan to fix the prop.
            />


            {/* Header */}
            <div className="dashboard-intro">
                <div className="intro-left">
                    <img
                        src={getProfilePicture(user)}
                        alt="Profile"
                        className="dashboard-avatar"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <div>
                        <h2 className="dashboard-greeting">Hola, {user.firstName || user.companyName}</h2>
                        <p className="dashboard-bio">Bienvenido a tu panel de control.</p>
                    </div>
                </div>

                <div className="dashboard-actions-inline">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {(user.role === 'freelancer' || (user.role === 'buyer' && (user.level || 1) >= 6)) && (
                            <button className="glass" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.6rem 1.2rem',
                                border: '1px solid var(--primary)',
                                color: 'var(--primary)',
                                background: 'rgba(139, 92, 246, 0.1)',
                                fontWeight: '600',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }} onClick={() => navigate('/my-coops')}>
                                Mis Coops
                            </button>
                        )}

                        {user.role === 'freelancer' ? (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleCreateServiceClick}>
                                <span style={{ fontSize: '1.2rem' }}>+</span> Publicar Servicio
                            </button>
                        ) : (
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/create-project')}>
                                <span style={{ fontSize: '1.2rem' }}>+</span> {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* BADGES SECTION (Universal for all roles) */}
            <div style={{ marginBottom: '2rem' }}>
                <div
                    className="clickable"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        marginBottom: '1.5rem',
                        cursor: 'pointer',
                        width: 'fit-content'
                    }}
                    onClick={() => navigate('/badges')}
                >
                    <h3 className="section-title" style={{ margin: 0 }}>Mis Insignias</h3>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        background: 'rgba(139, 92, 246, 0.1)',
                        padding: '0.4rem',
                        borderRadius: '50%',
                        transition: 'transform 0.2s',
                    }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                </div>

                <button
                    className="btn-secondary"
                    onClick={() => {
                        addNotification(user.id, {
                            type: 'system',
                            title: '¡Notificación de Prueba!',
                            message: 'Si estás viendo esto, el sistema de notificaciones funciona perfectamente.',
                            link: '/dashboard'
                        });
                    }}
                >
                    Test Notificación
                </button>
            </div>

            {/* FREELANCER / COMPANY (Selling) STATS */}
            {/* FREELANCER / COMPANY (Selling) STATS - Customized for Company (No Gamification) */}
            <>
                <div className="dashboard-stats-grid">
                    {/* Wallet Widget Removed per user request */}

                    {/* LEVEL: Only for Freelancers and regular Buyers? Or just Freelancers?
                        User asked to remove levels for companies. 
                        Let's show Level only for Freelancers and Buyers (individuals).
                    */}
                    {user.role !== 'company' && (
                        <div className="glass stat-card">
                            <h4>Nivel Actual</h4>
                            <p className="stat-value primary">{currentLevel}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleDemoLevelUp}
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8 }}
                                >
                                    {isMaxLevel ? '+XP' : 'Up'}
                                </button>
                                <button
                                    onClick={handleDemoLevelDown}
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.8 }}
                                >
                                    Down
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VACATION: Only for Freelancers */}
                    {user.role === 'freelancer' && (
                        <div className="glass stat-card">
                            <div className="vacation-header">
                                <h4>Vacaciones</h4>
                                <div className="help-icon">?</div>
                                <span className="help-tooltip">Mientras estés de vacaciones no se perderá experiencia.</span>
                            </div>
                            <p className="stat-value" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                {user.gamification?.vacation?.active ? 'ON' : 'OFF'}
                            </p>
                            <button
                                onClick={handleVacationClick}
                                disabled={user.gamification?.vacation?.active || (user.gamification?.vacation?.credits || 0) <= 0}
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem',
                                    background: user.gamification?.vacation?.active ? '#10b981' : 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: user.gamification?.vacation?.active ? 'default' : 'pointer',
                                    opacity: ((user.gamification?.vacation?.credits || 0) <= 0 && !user.gamification?.vacation?.active) ? 0.5 : 1,
                                    width: '100%'
                                }}
                            >
                                {user.gamification?.vacation?.active ? 'Disfrutando' : 'Activar'}
                            </button>
                            <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                Restante: {user.gamification?.vacation?.credits || 0} usos
                            </p>
                        </div>
                    )}

                    <div className="glass stat-card">
                        <h4>Trabajos Activos</h4>
                        {/* Combined active jobs: Orders for buyers, Jobs for freelancers */}
                        <p className="stat-value">
                            {(user.role === 'freelancer' || user.role === 'company')
                                ? myWork.filter(j => j.status === 'active').length
                                : myOrders.filter(j => j.status === 'active').length
                            }
                        </p>
                    </div>
                    <div className="glass stat-card">
                        <h4>Completados</h4>
                        <p className="stat-value">
                            {(user.role === 'freelancer' || user.role === 'company')
                                ? myWork.filter(j => j.status === 'completed').length
                                : myOrders.filter(j => j.status === 'completed').length
                            }
                        </p>
                    </div>
                </div>

                {/* XP PROGRESS SECTION */}
                {/* XP PROGRESS SECTION - Hide for Company */}
                {user.role !== 'company' && (
                    <div className="xp-progress-container">
                        <div className="xp-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{levelLabel}</span>
                                <div className="help-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <div className="help-icon" style={{ width: '16px', height: '16px', fontSize: '0.7rem' }}>?</div>
                                    <div className="help-tooltip" style={{ width: '220px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'normal', textAlign: 'left', bottom: '100%', marginBottom: '10px' }}>
                                        <strong>Ganancia de XP por Trabajo:</strong>
                                        <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem', marginBottom: 0, fontSize: '0.8rem' }}>
                                            <li>Mayor a $100: <strong>80 XP</strong></li>
                                            <li>Mayor a $50: <strong>40 XP</strong></li>
                                            <li>Mayor a $20: <strong>30 XP</strong></li>
                                            <li>De $5 a $20: <strong>10 XP</strong></li>
                                        </ul>
                                        {currentLevel === 1 && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                                                * Nivel 1: Menos de $100 otorga 40 XP fijos.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span>{xpDisplayText}</span>
                        </div>
                        <div className="xp-bar-bg">
                            <div className="xp-bar-fill" style={{ width: `${xpPercentage}%`, background: isMaxLevel ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'var(--accent)' }}></div>
                        </div>
                        {isMaxLevel && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#FFD700', textAlign: 'right' }}>
                                ★ Eres una Leyenda de Cooplance
                            </p>
                        )}
                        {!isMaxLevel && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Faltan {nextLevelXP - currentXP} XP para subir de nivel
                            </p>
                        )}
                    </div>
                )}

                {(user.role === 'freelancer' || user.role === 'company') && (
                    <>
                        <h3 className="section-title">Pedidos / Trabajos Recibidos</h3>
                        <div className="jobs-list">
                            {myWork.length > 0 ? myWork.map(job => (
                                <div key={job.id} className="glass job-card order-card" style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '2px solid var(--border)',
                                        position: 'relative'
                                    }}>
                                        <img
                                            src={getProfilePicture({ role: job.buyerRole, avatar: job.buyerAvatar })}
                                            alt={job.buyerName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    <div className="job-details">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{job.buyerName}</h4>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: job.buyerRole === 'company' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                                color: job.buyerRole === 'company' ? 'var(--secondary)' : 'var(--primary)',
                                                border: '1px solid currentColor'
                                            }}>
                                                {job.buyerRole === 'company' ? 'Empresa' : 'Particular'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            Ha contratado: <strong>{job.serviceTitle}</strong> ({job.tier || 'Estándar'})
                                        </p>
                                        <p className="job-meta" style={{ marginTop: '0.25rem' }}>
                                            Estado: <span className={`status-badge ${job.status}`}>{job.status}</span>
                                        </p>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>${job.amount}</div>
                                        {job.status === 'active' && (
                                            <button className="btn-primary" onClick={() => updateJobStatus(job.id, 'delivered')} style={{ fontSize: '0.85rem' }}>Entregar</button>
                                        )}
                                        {job.status === 'delivered' && (
                                            <span className="waiting-approval" style={{ fontSize: '0.8rem' }}>En revisión</span>
                                        )}
                                        {job.status === 'completed' && (
                                            <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✓ Completado</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p>Aún no has recibido pedidos.</p>
                                </div>
                            )}
                        </div>

                        <h3 className="section-title">Mis Postulaciones</h3>
                        <div className="jobs-list">
                            {myProposals.length > 0 ? myProposals.map(proposal => (
                                <div
                                    key={proposal.id}
                                    className="glass job-card clickable"
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => navigate(`/project/${proposal.projectId}`)}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{proposal.projectTitle}</h4>
                                            {proposal.clientRole && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: proposal.clientRole === 'company' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                                    color: proposal.clientRole === 'company' ? 'var(--secondary)' : 'var(--primary)',
                                                    border: '1px solid currentColor'
                                                }}>
                                                    {proposal.clientRole === 'company' ? 'Empresa' : 'Particular'}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            Enviado el: {new Date(proposal.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`status-badge ${proposal.status === 'pending' ? 'active' : proposal.status}`}
                                            style={{
                                                background: proposal.status === 'pending' ? 'rgba(234, 179, 8, 0.2)' : undefined,
                                                color: proposal.status === 'pending' ? '#eab308' : undefined,
                                                border: proposal.status === 'pending' ? '1px solid rgba(234, 179, 8, 0.3)' : undefined
                                            }}>
                                            {proposal.status === 'pending' ? 'Pendiente' : proposal.status}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p>No te has postulado a ningún proyecto.</p>
                                    <button
                                        className="btn-primary"
                                        style={{ marginTop: '1rem', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                        onClick={() => navigate('/explore-clients')}
                                    >
                                        Explorar Proyectos Disponibles
                                    </button>
                                </div>
                            )}
                        </div>

                        <h3 className="section-title">Mis Servicios Activos</h3>
                        <div className="services-grid">
                            {myServices.length > 0 ? (
                                myServices.map(service => (
                                    <ServiceCard key={service.id} service={{ ...service, level: user.level || 1 }} />
                                ))
                            ) : (
                                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                    <p style={{ marginBottom: '1rem' }}>No tienes servicios activos actualmente.</p>
                                    <button className="btn-primary" onClick={handleCreateServiceClick}>Crear mi primer servicio</button>
                                </div>
                            )}

                            {/* "Create More" Card - Always Visible if they have services */}
                            {myServices.length > 0 && (
                                <div
                                    className="glass service-card clickable"
                                    onClick={handleCreateServiceClick}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '300px', // Match ServiceCard height
                                        border: '2px dashed var(--border)',
                                        cursor: 'pointer',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        color: '#8b5cf6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </div>
                                    <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Crear Nuevo Servicio</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 1rem' }}>
                                        {myServices.length >= ((user.level || 1) >= 5 ? 5 : (user.level || 1))
                                            ? `Límite alcanzado (Máx 5)`
                                            : 'Amplía tu oferta'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </>

            {/* LEVEL UP MODAL */}
            <LevelUpModal
                isOpen={showLevelUpModal}
                onClose={() => setShowLevelUpModal(false)}
                level={currentLevel}
            />

            {/* SHARED SECTIONS (Orders & Explore) */}
            {/* Show for buyers, companies, OR freelancers who have bought something */}
            {(user.role === 'buyer' || user.role === 'company' || (user.role === 'freelancer' && myOrders.length > 0)) && (
                <>
                    {/* CLIENT'S PUBLISHED PROJECTS */}
                    {(user.role === 'buyer' || user.role === 'company') && (
                        <>
                            <h3 className="section-title">{user.role === 'company' ? 'Mis Ofertas Laborales' : 'Mis Proyectos Publicados'}</h3>
                            <div className="services-grid">
                                {myPublishedProjects.length > 0 ? (
                                    myPublishedProjects.map(project => (
                                        <div key={project.id} style={{ position: 'relative' }}>
                                            <ProjectCard
                                                project={project}
                                                onApply={() => navigate(`/explore-clients?highlight=${project.id}`)} // Should link to manage proposals
                                            />
                                            {project.proposalCount > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    cursor: 'pointer',
                                                    zIndex: 10
                                                }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProjectForProposals({ id: project.id, title: project.title });
                                                    }}
                                                >
                                                    {project.proposalCount}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                                        <p>{user.role === 'company' ? 'No has publicado ofertas aún.' : 'No has publicado proyectos aún.'}</p>
                                        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/create-project')}>
                                            {user.role === 'company' ? 'Publicar Oferta' : 'Publicar Proyecto'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <h3 className="section-title">Mis Pedidos (Compras)</h3>
                    <div className="jobs-list">
                        {myOrders.length > 0 ? myOrders.map(job => (
                            <div key={job.id} className="glass job-card order-card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center', padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}>
                                <div className="job-details">
                                    <h4 style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--text-primary)', fontWeight: '600' }}>{job.serviceTitle}</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        Freelancer: <strong style={{ color: 'var(--primary)' }}>{job.freelancerName}</strong>
                                    </p>
                                    <p className="job-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estado del Pedido:</span>
                                        <span className={`status-badge ${job.status}`} style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '20px' }}>{job.status === 'active' ? 'Activo' : job.status === 'completed' ? 'Completado' : job.status === 'delivered' ? 'Entregado' : job.status}</span>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn-secondary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                            onClick={() => navigate(`/service/${job.serviceId}`)}
                                        >
                                            Ver Servicio
                                        </button>
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                            onClick={() => {
                                                const chatId = createChat([user.id, job.freelancerName], 'order', job.id, job.serviceTitle);
                                                navigate(`/chat/${chatId}`);
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            Chat
                                        </button>
                                    </div>

                                    {job.status === 'delivered' && (
                                        <button
                                            className="btn-primary"
                                            onClick={() => updateJobStatus(job.id, 'completed')}
                                            style={{ marginTop: '0.5rem', width: '100%' }}
                                        >
                                            Aprobar y Liberar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="glass" style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                <p>No has realizado pedidos recientes.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
