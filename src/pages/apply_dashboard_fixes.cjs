const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/Cooplance/Cooplance-web/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. ReviewModal Username change
content = content.replace(
    /<ReviewModal[\s\S]+?\/>/,
    `            <ReviewModal
                isOpen={!!selectedJobForReview}
                onClose={() => setSelectedJobForReview(null)}
                onConfirm={handleReviewSubmit}
                title={user.role === 'freelancer' ? "Califica al Cliente" : "Califica a"}
                targetName={user.role === 'freelancer' ? \`@\${selectedJobForReview?.buyerUsername}\` : \`@\${selectedJobForReview?.freelancerUsername}\`}
                subtitle={user.role === 'freelancer' ? "¿Cómo fue tu experiencia trabajando con este cliente?" : "¿Estás satisfecho con el resultado final?"}
            />`
);

// 2. Restrict review prompt to clients
const newEffect = `    // V42: Automatic Review Prompt for completed jobs (ONLY for Clients) + Track reviewed status
    useEffect(() => {
        if (!user || loading) return;
        
        const checkReviews = async () => {
            // Only prompt automatically for jobs where I am the BUYER (myOrders)
            const jobsToPrompt = myOrders.filter(j => j.status === 'completed');
            const allJobsForTracking = [...myWork, ...myOrders].filter(j => j.status === 'completed');
            
            if (allJobsForTracking.length === 0) return;

            try {
                const results = await Promise.all(
                    allJobsForTracking.map(async (job) => {
                        const reviewed = await ReviewService.hasUserReviewedJob(job.id, user.id);
                        return { id: job.id, reviewed };
                    })
                );

                const newReviewedMap = {};
                results.forEach(r => newReviewedMap[r.id] = r.reviewed);
                setReviewedJobs(newReviewedMap);

                // Auto prompt logic: ONLY if I am the buyer and haven't reviewed yet
                if (!selectedJobForReview) {
                    const sortedPromptJobs = jobsToPrompt.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
                    for (const job of sortedPromptJobs) {
                        if (!newReviewedMap[job.id]) {
                            console.log(\`[Dashboard] Automatic review prompt for client job: \${job.id}\`);
                            setSelectedJobForReview(job);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn("Error checking reviews:", e);
            }
        };
        
        const timer = setTimeout(checkReviews, 2000);
        return () => clearTimeout(timer);
    }, [myWork.length, myOrders.length, user?.id, loading]);`;

content = content.replace(
    /\/\/ V42: Automatic Review Prompt for completed jobs \+ Track reviewed status[\s\S]+?\}\, \[myWork\.length\, myOrders\.length\, user\?\.id\, loading\]\)\;/,
    newEffect
);

// 3. Proposal status text
content = content.replace(
    '<span className={`status-badge ${proposal.status}`}>{proposal.status}</span>',
    '<span className={`status-badge ${proposal.status}`}>{proposal.status === "accepted" ? "FINALIZADO" : (proposal.status === "pending" ? "EN PROCESO" : proposal.status)}</span>'
);

// 4. OrdersSection Redesign
const newOrderCard = `                        <div key={job.id} className={\`proposal-card enhanced status-\${job.status}\`} onClick={() => {
                            if (job.projectId) navigate(\`/project/\${job.projectId}\`);
                            else if (job.serviceId) navigate(\`/service/\${job.serviceId}\`);
                        }}>
                            <div className="proposal-card-content">
                                <div className="proposal-client-info" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(job.freelancerRole === 'company' ? \`/company/\${job.freelancerId}\` : \`/freelancer/\${job.freelancerId}\`);
                                }}>
                                    <div className="client-avatar-wrapper">
                                        <img src={getProfilePicture({ role: job.freelancerRole, avatar: job.freelancerAvatar })} alt={job.freelancerName} />
                                    </div>
                                    <div className="client-details">
                                        <span className="client-username">@{job.freelancerUsername || 'usuario'}</span>
                                        {job.freelancerName && <span className="client-realname">{job.freelancerName}</span>}
                                    </div>
                                </div>

                                <div className="proposal-main-details">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{job.serviceTitle}</h4>
                                        {(() => {
                                            const preciseTime = job.deadline ? getPreciseTimeRemaining(job.deadline) : null;
                                            if (!preciseTime || job.status !== 'active') return null;
                                            return (
                                                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary-soft)', fontWeight: '800', border: '1px solid currentColor' }}>
                                                    {preciseTime}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="proposal-meta">
                                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: job.status === 'completed' ? '#10b981' : (job.status === 'active' ? '#3b82f6' : '#f59e0b') }}>
                                            • {job.status === 'active' ? 'EN PROGRESO' : job.status === 'delivered' ? 'ENTREGADO' : job.status === 'completed' ? 'FINALIZADO' : 'ESPERANDO'}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-primary)', marginLeft: '1rem' }}>$\${job.amount}</span>
                                    </div>
                                </div>

                                <div className="proposal-actions" style={{ gap: '0.5rem' }}>
                                    {job.status === 'completed' && (
                                        <button 
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.4rem 0.8rem', 
                                                fontSize: '0.75rem', 
                                                borderRadius: '8px',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                border: '1px solid #10b981',
                                                color: '#10b981',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedJobForReview(job); }}
                                        >
                                            <Star size={12} />
                                            {reviewedJobs[job.id] ? 'Modificar Reseña' : 'Calificar'}
                                        </button>
                                    )}
                                    <button className="btn-chat-mini" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={async (e) => {
                                        e.stopPropagation();
                                        setIsCreatingChat(true);
                                        try {
                                            const chatId = await createChat([user.id, job.freelancerId], 'order', job.id, job.serviceTitle);
                                            if (chatId) navigate(\`/chat/\${chatId}\`);
                                            else setIsCreatingChat(false);
                                        } catch { setIsCreatingChat(false); }
                                    }}>Chat</button>
                                    <button className="btn-detail-mini" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={(e) => {
                                        e.stopPropagation();
                                        if (job.projectId) navigate(\`/project/\${job.projectId}\`);
                                        else if (job.serviceId) navigate(\`/service/\${job.serviceId}\`);
                                    }}>Detalle</button>
                                </div>
                            </div>
                        </div>`;

// Use a more specific match for the map to avoid greediness
content = content.replace(
    /filteredOrders\.map\(job => \([\s\S]+?\}\)\)/, // Matches the map in OrdersSection
    `filteredOrders.map(job => (
${newOrderCard}
                    ))`
);

fs.writeFileSync(path, content);
console.log('Fixed all features and design in Dashboard.jsx safely');
