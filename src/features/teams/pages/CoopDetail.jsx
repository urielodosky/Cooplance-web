import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../../../context/TeamContext';
import { useAuth } from '../../auth/context/AuthContext';
import CoopRulesAcceptance from '../components/CoopRulesAcceptance';
import CoopAssignmentModal from '../../../components/project/CoopAssignmentModal';
import CoopChat from '../components/CoopChat';
import { supabase } from '../../../lib/supabase';
import TeamService from '../../../services/TeamService';
import '../../../styles/main.scss';

const CoopDetail = () => {
    const { coopId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { teams, userTeams, loading, addMemberToTeam, updateMemberRole, leaveTeam, dissolveCoop, updateTeam, acceptRules, updateRules } = useTeams();
    
    const [activeTab, setActiveTab] = useState('info');
    const [showRules, setShowRules] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [loadingJobs, setLoadingJobs] = useState(false);
    
    // Phase 6
    const [isExpulsionModalOpen, setIsExpulsionModalOpen] = useState(false);
    const [memberToExpel, setMemberToExpel] = useState(null);
    const [expulsionReason, setExpulsionReason] = useState('');
    const [isSavingRules, setIsSavingRules] = useState(false);
    const [rulesText, setRulesText] = useState('');
    const [showRoleSubmenu, setShowRoleSubmenu] = useState(null);

    const [isReassignment, setIsReassignment] = useState(false);
    const [reassignmentData, setReassignmentData] = useState(null);

    const handleChangeRole = async (member, newRole) => {
        try {
            await updateMemberRole(coop.id, member.user_id, newRole);
            setShowRoleSubmenu(null);
            setActiveDropdown(null);
        } catch (err) {
            console.error("Error cambiando rol", err);
        }
    };

    // Find the current coop
    const coop = (teams || []).find(t => t.id === coopId);
    
    // Check membership and role
    const myMember = coop?.members?.find(m => m.user_id === user?.id);
    const amIMember = !!myMember;
    const amIOwner = myMember?.role === 'owner';
    const amIAdmin = myMember?.role === 'admin' || amIOwner;
    const amIManager = myMember?.role === 'manager' || amIAdmin;

    // Check if rules are accepted
    const hasAcceptedRules = myMember?.accepted_rules_at !== null;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchPendingJobs = async () => {
        if (!coopId) return;
        setLoadingJobs(true);
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*, profiles:client_id(username, first_name, last_name, avatar_url)')
                .eq('coop_id', coopId)
                .eq('status', 'pending');
            
            if (error) throw error;
            setPendingJobs(data || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
        } finally {
            setLoadingJobs(false);
        }
    };

    const fetchPayouts = async () => {
        if (!coopId) return;
        try {
            // Fetch payouts for all jobs of this coop
            // The RLS will handle the visibility: 
            // Workers only get their records. Owner/Admins get all.
            const { data, error } = await supabase
                .from('job_payouts')
                .select('*, jobs(service_title, budget), profiles(username)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayouts(data || []);
        } catch (err) {
            console.error('Error fetching payouts:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchPendingJobs();
        }
        if (activeTab === 'finance') {
            fetchPayouts();
        }
    }, [activeTab, coopId]);

    const handleAcceptJob = (jobId) => {
        setSelectedJobId(jobId);
        setIsAssignmentModalOpen(true);
    };

    const handleExpelMember = async () => {
        if (!memberToExpel) return;
        try {
            if (memberToExpel.accepted_rules_at) {
                if (!expulsionReason) return;
                await TeamService.expelMember(coopId, memberToExpel.user_id, user.id, expulsionReason);
            } else {
                // Cancel invitation silently
                const { error } = await supabase.from('coop_members').delete().eq('coop_id', coopId).eq('user_id', memberToExpel.user_id);
                if (error) throw error;
            }
            setIsExpulsionModalOpen(false);
            setMemberToExpel(null);
            setExpulsionReason('');
        } catch (err) {
            console.error('Error expelling/canceling:', err);
            alert('Error al cancelar: ' + (err.message || JSON.stringify(err)));
        }
    };

    const handleSaveRules = async () => {
        if (!rulesText) return;
        setIsSavingRules(true);
        try {
            await TeamService.updateTeamRules(coopId, rulesText);
            alert('Reglas actualizadas. Todos los miembros deberán re-aceptarlas.');
        } catch (err) {
            console.error('Error updating rules:', err);
            alert('Error al actualizar reglas.');
        } finally {
            setIsSavingRules(false);
        }
    };

    const handleAssignmentConfirm = async (data) => {
        try {
            if (isReassignment) {
                await TeamService.reassignProjectTeam({
                    jobId: selectedJobId,
                    ...data
                });
            } else {
                const { error } = await supabase.rpc('assign_job_team_and_payouts', {
                    p_job_id: selectedJobId,
                    p_project_lead_id: data.projectLeadId,
                    p_member_ids: data.memberIds,
                    p_percentages: data.percentages,
                    p_method: data.payoutMethod
                });
                if (error) throw error;
            }

            setIsAssignmentModalOpen(false);
            setSelectedJobId(null);
            setIsReassignment(false);
            setReassignmentData(null);
            fetchPendingJobs();
            alert(isReassignment ? 'Equipo y plan de pagos actualizados.' : 'Trabajo aceptado y equipo asignado.');
        } catch (err) {
            console.error('Error with job assignment:', err);
            alert('Error: ' + err.message);
        }
    };

    const handleModifyTeam = async (job) => {
        // Fetch current payouts for this job to populate initial data
        const { data: currentPayouts } = await supabase
            .from('job_payouts')
            .select('*')
            .eq('job_id', job.id);
        
        const manualPcts = {};
        currentPayouts?.forEach(p => {
            manualPcts[p.user_id] = p.percentage;
        });

        setSelectedJobId(job.id);
        setIsReassignment(true);
        setReassignmentData({
            memberIds: currentPayouts?.map(p => p.user_id) || [],
            projectLeadId: job.project_lead_id,
            payoutMethod: currentPayouts?.[0]?.payout_method || 'equal',
            manualPercentages: manualPcts
        });
        setIsAssignmentModalOpen(true);
    };

    if (loading && !coop) {
        return (
            <div className="container" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h3 style={{ color: 'var(--text-secondary)' }}>Cargando Coop...</h3>
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!coop) {
        return (
            <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <h2>Coop no encontrada</h2>
                <button className="btn-secondary" onClick={() => navigate('/my-coops')} style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>Volver a mis Coops</button>
            </div>
        );
    }

    // If invited but rules not accepted, show acceptance screen
    if (amIMember && !hasAcceptedRules) {
        return <CoopRulesAcceptance coop={coop} onAccept={() => acceptRules(coop.id)} />;
    }

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px' }}>
            
            {/* TOP HEADER */}
            <div className="glass" style={{ 
                padding: '2rem', 
                borderRadius: '24px', 
                marginBottom: '2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={() => navigate('/my-coops')} className="btn-icon-soft" title="Volver">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    {coop.avatar_url ? (
                        <img src={coop.avatar_url} alt={coop.name} style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '900', color: '#fff' }}>
                            {coop.name.substring(0, 1)}
                        </div>
                    )}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>{coop.name}</h1>
                            {coop.status === 'Borrador' && (
                                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid rgba(245, 158, 11, 0.2)' }}>BORRADOR</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                            {(coop.categories || []).map((cat, i) => {
                                const colors = [
                                    { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.2)' },
                                    { bg: 'rgba(6, 182, 212, 0.1)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.2)' },
                                    { bg: 'rgba(236, 72, 153, 0.1)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.2)' }
                                ];
                                const color = colors[i % colors.length];
                                return (
                                    <span key={i} style={{ 
                                        fontSize: '0.75rem', 
                                        color: color.text, 
                                        background: color.bg, 
                                        padding: '4px 12px', 
                                        borderRadius: '100px', 
                                        fontWeight: '700',
                                        border: `1px solid ${color.border}`,
                                        letterSpacing: '0.5px'
                                    }}>
                                        {cat}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {amIOwner && (
                        <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }} onClick={() => navigate(`/coop/${coop.id}/invite`)}>
                            Invitar Miembros
                        </button>
                    )}
                    <button className="btn-primary" onClick={() => navigate(`/coop/${coop.id}/public`)} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                        Ver Perfil Público
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
                {[
                    { id: 'info', label: 'Inicio', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
                    { id: 'orders', label: 'Pedidos', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> },
                    { id: 'members', label: 'Miembros', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
                    { id: 'chat', label: 'Chat', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
                    { id: 'finance', label: 'Reparto', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, restricted: !amIManager },
                    { id: 'settings', label: 'Ajustes', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>, restricted: !amIAdmin }
                ].filter(tab => !tab.restricted).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.8rem 1.5rem',
                            borderRadius: '12px',
                            background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            border: 'none',
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="tab-content animate-in">
                
                {activeTab === 'info' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
                        <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Sobre la Agencia</h3>
                            <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{coop.description}</p>
                            
                            <div 
                                onClick={() => setShowRules(!showRules)}
                                style={{ 
                                    marginTop: '2.5rem', 
                                    marginBottom: '1.5rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    padding: '1rem',
                                    background: 'var(--bg-card-hover)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reglas y condiciones de la Coop</h3>
                                <svg 
                                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                                    style={{ transform: showRules ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>

                            {showRules && (
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.2)', 
                                    padding: '1.5rem', 
                                    borderRadius: '16px', 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.9rem', 
                                    lineHeight: '1.6',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'var(--text-muted)',
                                    animation: 'slideDown 0.3s ease-out'
                                }}>
                                    {coop.internal_rules || 'No hay reglas definidas.'}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Métricas</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{coop.services?.filter(s => s.status === 'completed').length || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completados</div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>0.0</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rating</div>
                                    </div>
                                </div>
                            </div>

                            {/* ACTIVE PROJECTS SECTION */}
                            <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    Trabajos en Curso
                                </h4>
                                {coop.services?.filter(s => s.status === 'active').length > 0 ? (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {coop.services.filter(s => s.status === 'active').map(job => (
                                            <div key={job.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{job.service_title}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Presupuesto: ${job.budget}</div>
                                                    </div>
                                                    {amIAdmin && (
                                                        <button 
                                                            onClick={() => handleModifyTeam(job)}
                                                            style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                        >
                                                            MODIFICAR EQUIPO
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                                    <div style={{ width: '45%', height: '100%', background: '#10b981', borderRadius: '10px' }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '1rem 0' }}>No hay proyectos activos en este momento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'orders' && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0 }}>Pedidos Entrantes</h3>
                            <button className="btn-icon-soft" onClick={fetchPendingJobs}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                            </button>
                        </div>

                        {loadingJobs ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando pedidos...</div>
                        ) : pendingJobs.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {pendingJobs.map(job => (
                                    <div key={job.id} className="glass" style={{ padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{job.service_title || 'Trabajo Directo'}</h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>
                                                        {job.profiles?.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>Cliente: {job.profiles?.first_name ? `${job.profiles.first_name} ${job.profiles.last_name || ''}` : job.profiles?.username}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary)' }}>${job.budget || 0}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.delivery_days || 0} días entrega</div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                            <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAcceptJob(job.id)}>Aceptar y Asignar Equipo</button>
                                            <button className="btn-secondary" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>Rechazar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem 0' }}>No hay pedidos pendientes</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Las contrataciones directas que reciba tu agencia aparecerán aquí.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0 }}>Equipo de Trabajo ({coop.members?.length || 0})</h3>
                            {amIOwner && (
                                <button 
                                    onClick={() => navigate(`/coop/${coop.id}/invite`)} 
                                    style={{ 
                                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #6d28d9))', 
                                        border: 'none', 
                                        color: 'white', 
                                        padding: '8px 20px', 
                                        borderRadius: '100px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)' }}
                                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    Invitar
                                </button>
                            )}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                            {coop.members?.map((member, idx) => {
                                const ratings = member.profile?.reviews?.map(r => r.rating) || [];
                                const computedRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : Number(member.profile?.rating || 0);

                                return (
                                <div key={idx} className="glass card-hover" style={{ 
                                    padding: '1.5rem', 
                                    borderRadius: '24px', 
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    gap: '1.2rem',
                                    position: 'relative',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer',
                                    overflow: 'visible',
                                    zIndex: activeDropdown === member.user_id ? 50 : 1
                                }}>
                                    {/* PHOTO */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        {member.profile?.avatar_url ? (
                                            <img src={member.profile.avatar_url} alt={member.profile.username} style={{ width: '60px', height: '60px', borderRadius: '18px', objectFit: 'cover', border: '2px solid var(--primary-soft)' }} />
                                        ) : (
                                            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--primary)' }}>
                                                {member.profile?.username?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        {/* Status Indicator (Top Right) */}
                                        <div 
                                            style={{ 
                                                position: 'absolute', 
                                                top: '-5px', 
                                                right: '-5px', 
                                                background: member.accepted_rules_at ? '#10b981' : '#f59e0b', 
                                                width: '16px', 
                                                height: '16px', 
                                                borderRadius: '50%', 
                                                border: '3px solid #1a1c23', // Matching background color for contrast
                                                zIndex: 2
                                            }}
                                            title={member.accepted_rules_at ? 'Firmó Estatuto' : 'Pendiente Firma'}
                                        ></div>
                                    </div>

                                    {/* INFO */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                                <button 
                                                    onClick={() => navigate(`/profile/${member.user_id}`)} 
                                                    style={{ 
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 0,
                                                        fontWeight: '800', 
                                                        fontSize: '1rem', 
                                                        color: 'var(--primary)', 
                                                        cursor: 'pointer', 
                                                        whiteSpace: 'nowrap', 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis',
                                                        textDecoration: 'none'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    @{member.profile?.username || 'Usuario'}
                                                </button>
                                                <span style={{ fontSize: '0.65rem', background: member.role === 'owner' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)', color: member.role === 'owner' ? '#a78bfa' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', textTransform: 'uppercase', flexShrink: 0 }}>
                                                    {member.role}
                                                </span>

                                                {/* Options Menu (Moved next to role badge) */}
                                                {amIAdmin && member.user_id !== user.id && member.role !== 'owner' && (
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setShowRoleSubmenu(null); setActiveDropdown(activeDropdown === member.user_id ? null : member.user_id); }}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                        </button>

                                                        {activeDropdown === member.user_id && (
                                                            <div style={{ position: 'absolute', top: '100%', left: '0', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
                                                                {showRoleSubmenu === member.user_id ? (
                                                                    <>
                                                                        <div style={{ fontSize: '0.7rem', padding: '4px 12px', color: 'var(--text-muted)' }}>Asignar Rol</div>
                                                                        {['admin', 'manager', 'worker'].map(r => (
                                                                            <button 
                                                                                key={r}
                                                                                onClick={(e) => { e.stopPropagation(); handleChangeRole(member, r); }}
                                                                                style={{ background: member.role === r ? 'rgba(139, 92, 246, 0.2)' : 'transparent', border: 'none', color: member.role === r ? '#a78bfa' : 'var(--text-primary)', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                                                                                onMouseOver={(e) => e.currentTarget.style.background = member.role === r ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)'}
                                                                                onMouseOut={(e) => e.currentTarget.style.background = member.role === r ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}
                                                                            >
                                                                                {r.charAt(0).toUpperCase() + r.slice(1)}
                                                                            </button>
                                                                        ))}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {amIOwner && (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); setShowRoleSubmenu(member.user_id); }}
                                                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                                                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                                            >
                                                                                Cambiar rol
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setMemberToExpel(member); setIsExpulsionModalOpen(true); setActiveDropdown(null); }}
                                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            {member.accepted_rules_at ? 'Expulsar' : 'Cancelar solicitud'}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: '800', flexShrink: 0 }}>
                                                {computedRating > 0 ? (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                                        {Number(computedRating).toFixed(1)}
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Nuevo</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {member.profile?.first_name || 'Nombre'} {member.profile?.last_name || 'No disp.'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', flexShrink: 0 }}>
                                                LVL {member.profile?.level || 1}
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                            )})}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <CoopChat coopId={coop.id} amIOwner={amIOwner} amIAdmin={amIAdmin} />
                )}

                {activeTab === 'finance' && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0 }}>Finanzas y Reparto</h3>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                Total Acumulado: ${payouts.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                            </div>
                        </div>

                        {payouts.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '1rem' }}>Proyecto</th>
                                            {amIManager && <th style={{ padding: '1rem' }}>Miembro</th>}
                                            <th style={{ padding: '1rem' }}>Porcentaje</th>
                                            <th style={{ padding: '1rem' }}>Monto (Neto)</th>
                                            <th style={{ padding: '1rem' }}>Método</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payouts.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                                                <td style={{ padding: '1rem', fontWeight: '600' }}>{p.jobs?.service_title || 'Trabajo Directo'}</td>
                                                {amIManager && <td style={{ padding: '1rem' }}>@{p.profiles?.username}</td>}
                                                <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '800' }}>{p.percentage}%</td>
                                                <td style={{ padding: '1rem', fontWeight: '700' }}>${p.amount.toFixed(2)}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'capitalize' }}>{p.payout_method.replace('_', ' ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>Aún no hay repartos registrados. Los montos aparecerán aquí cuando se acepten trabajos con equipo asignado.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Estatuto Interno</h3>
                        
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.1)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ color: '#f59e0b', marginTop: '2px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#f59e0b', lineHeight: '1.5' }}>
                                <b>Versionado de Seguridad:</b> Al guardar cambios en el estatuto, todos los miembros (excepto el Fundador) deberán volver a aceptarlo explícitamente para poder operar en la Agencia.
                            </p>
                        </div>

                        <textarea 
                            value={rulesText || coop.internal_rules}
                            onChange={(e) => setRulesText(e.target.value)}
                            style={{ 
                                width: '100%', height: '250px', padding: '1rem', borderRadius: '14px', 
                                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', 
                                color: 'white', fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1.5rem' 
                            }}
                            placeholder="Escribe las reglas de tu Coop..."
                        />

                        {amIOwner && (
                            <button 
                                onClick={handleSaveRules}
                                disabled={isSavingRules}
                                className="btn-primary"
                                style={{ marginBottom: '3rem', width: '100%' }}
                            >
                                {isSavingRules ? 'Guardando...' : 'Guardar y Versionar Estatuto'}
                            </button>
                        )}

                        <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Configuración Crítica</h3>
                        
                        <div style={{ display: 'grid', gap: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0 }}>Cambios de Configuración</h4>
                                    <span style={{ fontSize: '0.8rem', color: coop.config_changes_left > 0 ? 'var(--primary)' : '#ef4444', fontWeight: '800' }}>
                                        {coop.config_changes_left} restantes
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                    Para mantener la estabilidad de la Coop, solo se permiten 2 cambios estructurales (nombre, categorías o estatuto) cada 30 días.
                                </p>
                                <button className="btn-secondary" disabled={coop.config_changes_left <= 0}>
                                    Modificar Perfil
                                </button>
                            </div>

                            {amIOwner && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <h4 style={{ margin: 0, color: '#f87171' }}>Zona Peligrosa</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                        Disolver la Coop es irreversible. Se liquidarán todos los fondos pendientes y se cerrarán los servicios.
                                    </p>
                                    <button 
                                        className="btn-secondary" 
                                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                        onClick={() => {
                                            if (window.confirm("¿Estás seguro de que deseas DISOLVER esta Coop definitivamente?")) {
                                                dissolveCoop(coop.id).then(() => navigate('/my-coops'));
                                            }
                                        }}
                                    >
                                        Disolver Agencia
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Phase 6: Expulsion Modal */}
            {isExpulsionModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
                    <div className="modal-content glass" style={{ width: '400px', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: memberToExpel?.accepted_rules_at ? '#ef4444' : 'var(--text-primary)', marginTop: 0 }}>
                            {memberToExpel?.accepted_rules_at ? 'Expulsar Miembro' : 'Cancelar Solicitud'}
                        </h3>
                        
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            {memberToExpel?.accepted_rules_at 
                                ? <>Estás por expulsar a <strong style={{color: 'white'}}>@{memberToExpel?.profile?.username || 'Usuario'}</strong>. Esta acción es irreversible y quedará registrada en el historial de la agencia.</>
                                : <>Estás por cancelar la invitación de <strong style={{color: 'white'}}>@{memberToExpel?.profile?.username || 'Usuario'}</strong>. No podrá acceder a la agencia.</>
                            }
                        </p>
                        
                        {memberToExpel?.accepted_rules_at && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Motivo de la expulsión</label>
                                <select 
                                    value={expulsionReason} 
                                    onChange={(e) => setExpulsionReason(e.target.value)}
                                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                                >
                                    <option value="">Seleccionar motivo...</option>
                                    <option value="inactivity">Inactividad Prolongada</option>
                                    <option value="rule_breaking">Incumplimiento de Reglas Internas</option>
                                    <option value="toxicity">Comportamiento Tóxico / Maltrato</option>
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <button onClick={() => setIsExpulsionModalOpen(false)} className="btn-secondary" style={{ flex: 1, padding: '0.8rem' }}>Cancelar</button>
                            <button 
                                onClick={handleExpelMember} 
                                className="btn-primary" 
                                style={{ flex: 1, padding: '0.8rem', background: memberToExpel?.accepted_rules_at ? '#ef4444' : 'var(--primary)', border: 'none' }}
                                disabled={memberToExpel?.accepted_rules_at ? !expulsionReason : false}
                            >
                                {memberToExpel?.accepted_rules_at ? 'Confirmar Expulsión' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CoopAssignmentModal 
                isOpen={isAssignmentModalOpen}
                onClose={() => {
                    setIsAssignmentModalOpen(false);
                    setSelectedJobId(null);
                    setIsReassignment(false);
                    setReassignmentData(null);
                }}
                coopId={coop.id}
                budget={isReassignment ? (coop.services?.find(j => j.id === selectedJobId)?.budget || 0) : (pendingJobs.find(j => j.id === selectedJobId)?.budget || 0)}
                onConfirm={handleAssignmentConfirm}
                isReassignment={isReassignment}
                initialData={reassignmentData}
            />
        </div>
    );
};

export default CoopDetail;
