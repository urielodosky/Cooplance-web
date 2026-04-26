const fs = require('fs');
const path = 'c:/Users/HP/OneDrive/Desktop/Cooplance/Cooplance-web/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update ProposalsSection Badge text
content = content.replace(
    '<span className={`status-badge ${proposal.status}`}>{proposal.status}</span>',
    '<span className={`status-badge ${proposal.status}`}>{proposal.status === "accepted" ? "FINALIZADO" : (proposal.status === "pending" ? "EN PROCESO" : proposal.status)}</span>'
);

// 2. Redesign OrdersSection to match Proposals style and add profile links
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

// Replace the entire job card mapping in OrdersSection
content = content.replace(
    /filteredOrders\.map\(job => \([\s\S]+?\}\)\)/,
    `filteredOrders.map(job => (
${newOrderCard}
                    ))`
);

fs.writeFileSync(path, content);
console.log('Synchronized design between Proposals and Orders, added profile links and improved status text');
