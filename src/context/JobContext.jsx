import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateXPForJob, calculateNextLevelXP, registerActivity, getLevelFromXP } from '../utils/gamification';
import * as NotificationService from '../services/NotificationService';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

// ── Mappers ──────────────────────────────────────────────────

const mapJobFromDB = (row) => ({
    id: row.id,
    serviceId: row.service_id,
    projectId: row.project_id,
    serviceTitle: row.service_title,
    freelancerId: row.provider_id,
    freelancerName: row.provider?.first_name 
        ? `${row.provider.first_name} ${row.provider.last_name || ''}`.trim()
        : (row.provider?.username || 'Proveedor'),
    freelancerAvatar: row.provider?.avatar_url,
    freelancerUsername: row.provider?.username,
    freelancerRole: row.provider?.role || 'freelancer',
    buyerId: row.client_id,
    buyerName: row.buyer_name || (row.client?.first_name
        ? `${row.client.first_name} ${row.client.last_name || ''}`.trim()
        : (row.client?.username || 'Cliente')),
    buyerUsername: row.client?.username,
    buyerAvatar: row.client?.avatar_url,
    buyerRealName: (row.client?.first_name ? `${row.client.first_name} ${row.client.last_name || ''}`.trim() : null),
    buyerRole: row.buyer_role || row.client?.role || 'client',
    amount: row.amount,
    tier: row.tier || 'Standard',
    status: row.status,
    createdAt: row.created_at,
    duration: row.duration,
    deadline: row.deadline,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    deliveryResult: row.delivery_result,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    paymentMethod: row.payment_method,
    deliveredAt: row.delivered_at,
    escrowAmount: row.escrow_amount || 0,
});

const mapJobToDB = (job, serviceOrProject, buyer) => {
    const isProject = !!serviceOrProject?.vacancies;
    return {
        service_id: isProject ? null : (serviceOrProject?.id || job.serviceId || null),
        project_id: isProject ? (serviceOrProject?.id || job.projectId || null) : null,
        service_title: serviceOrProject?.title || job.serviceTitle || null,
        client_id: buyer?.id || job.buyerId,
        provider_id: job.freelancerId || serviceOrProject?.freelancerId || null,
        amount: parseFloat(serviceOrProject?.price || serviceOrProject?.budget || job.amount) || 0,
        tier: serviceOrProject?.selectedTier || job.tier || 'Standard',
        status: isProject ? 'active' : 'pending_approval',
        duration: parseInt(serviceOrProject?.deliveryTime || serviceOrProject?.executionTime || job.duration) || 5,
        deadline: serviceOrProject?.deadline ? new Date(serviceOrProject.deadline).toISOString() : new Date(Date.now() + (parseInt(serviceOrProject?.deliveryTime || job.duration) || 5) * 24 * 60 * 60 * 1000).toISOString(),
        booking_date: serviceOrProject?.bookingConfig?.requiresBooking ? job.bookingDate : null,
        booking_time: serviceOrProject?.bookingConfig?.requiresBooking ? job.bookingTime : null,
        payment_method: serviceOrProject?.selectedPaymentMethod || job.paymentMethod || 'platform',
        escrow_amount: (isProject || job.status === 'active') ? (parseFloat(serviceOrProject?.price || serviceOrProject?.budget || job.amount) || 0) : 0,
    };
};

// ── Provider ─────────────────────────────────────────────────

export const JobProvider = ({ children }) => {
    const { user, updateUser, loading: authLoading } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = useCallback(async () => {
        if (!user) {
            setJobs([]);
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    client:profiles!jobs_client_id_fkey(username, first_name, last_name, avatar_url, role),
                    provider:profiles!jobs_provider_id_fkey(username, first_name, last_name, avatar_url, role),
                    coop:coops!jobs_coop_id_fkey(*)
                `)
                .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped = (data || []).map(mapJobFromDB);
            setJobs(mapped);
            return mapped;
        } catch (err) {
            console.error('[JobContext] Supabase fetch error:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [user]);

    const checkDeadlines = useCallback(async (activeJobs) => {
        if (!user) return;
        
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        for (const job of activeJobs) {
            if (job.status === 'active' && job.deadline && job.freelancerId === user.id) {
                const deadline = new Date(job.deadline);
                
                // If deadline is in less than 24h and hasn't passed
                if (deadline > now && deadline <= tomorrow) {
                    // Avoid duplicate notifications (check if one was sent in the last 24h)
                    // We can use a simple naming convention in the link or just trust the frequency
                    try {
                        const { data: existing } = await supabase
                            .from('notifications')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('type', 'deadline_warning')
                            .ilike('message', `%${job.serviceTitle}%`)
                            .gt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

                        if (!existing || existing.length === 0) {
                            await NotificationService.createNotification(user.id, {
                                type: 'deadline_warning',
                                title: 'Recordatorio de plazo',
                                message: `⏳ Recordatorio: El plazo para entregar '${job.serviceTitle}' vence pronto.`,
                                link: '/dashboard'
                            });
                        }
                    } catch (err) {
                        console.error('[JobContext] Error checking for existing deadline notification:', err);
                    }
                }
            }
        }
    }, [user]);

    useEffect(() => {
        // V41: Sequential Loading - Wait for Auth to be ready
        if (authLoading || !user?.id) return;

        fetchJobs()
            .then(jobs => {
                if (jobs) checkDeadlines(jobs);
            })
            .catch(err => console.error('[JobContext] Unhandled fetchJobs error:', err));
    }, [authLoading, user?.id, fetchJobs, checkDeadlines]);

    // REAL-TIME SUBSCRIPTION
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`jobs_realtime:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'jobs',
            }, (payload) => {
                console.log('[JobContext] Real-time event:', payload.eventType, payload.new);
                
                if (payload.eventType === 'INSERT') {
                    // Full refetch to get joined profile data (client/provider)
                    fetchJobs();
                } else if (payload.eventType === 'UPDATE') {
                    setJobs(prev => prev.map(job => 
                        job.id === payload.new.id ? {
                            ...job,
                            status: payload.new.status,
                            deadline: payload.new.deadline,
                            amount: payload.new.amount,
                            duration: payload.new.duration,
                            completedAt: payload.new.completed_at,
                            updatedAt: payload.new.updated_at,
                            deliveryResult: payload.new.delivery_result
                        } : job
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setJobs(prev => prev.filter(j => j.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchJobs]);

    const createJob = useCallback(async (service, buyer) => {
        try {
            const dbRow = mapJobToDB({}, service, buyer);

            const { data, error } = await supabase
                .from('jobs')
                .insert(dbRow)
                .select('*')
                .single();

            if (error) throw error;
            const mapped = mapJobFromDB(data);
            setJobs(prev => [mapped, ...prev]);

            // Notify freelancer: New order received
            await NotificationService.createNotification(mapped.freelancerId, {
                type: 'service_purchased',
                title: '¡Nueva Venta!',
                message: `¡Nueva venta! 💸 ${mapped.buyerName} contrató tu servicio '${mapped.serviceTitle}'.`,
                link: '/dashboard'
            });

            // Notify freelancer: Payment secured
            await NotificationService.createNotification(mapped.freelancerId, {
                type: 'payment_secured',
                title: 'Pago asegurado',
                message: `Pago asegurado 🔒. Los fondos para '${mapped.serviceTitle}' ya están depositados.`,
                link: '/dashboard'
            });

            // Register Activity for Buyer
            if (user) {
                const updated = registerActivity(user);
                updateUser(updated).catch(err => console.warn('[JobContext] Silently failed to register activity:', err));
            }


            return mapped;
        } catch (err) {
            console.error('[JobContext] Error creating job:', err);
            throw err;
        }
    }, [user, updateUser]);

    const updateJobStatus = useCallback(async (jobId, status, explicitDeliveryResult = null) => {
        try {
            const updateData = { status };

            if (status === 'delivered') {
                updateData.delivered_at = new Date().toISOString();
            }

            if (status === 'active') {
                // When becoming active, we lock the amount in escrow
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    updateData.escrow_amount = job.amount;
                    
                    // CRITICAL: Reset deadline to start from NOW (acceptance time)
                    // This ensures the 3 days (or whatever duration) start counting only when work begins
                    if (job.status === 'pending_approval' && job.duration) {
                        updateData.deadline = new Date(Date.now() + job.duration * 24 * 60 * 60 * 1000).toISOString();
                    }
                }
            }

            if (status === 'completed' || status === 'canceled' || status === 'cancellation_requested') {
                updateData.completed_at = new Date().toISOString();
                if (explicitDeliveryResult) {
                    updateData.delivery_result = explicitDeliveryResult;
                } else if (status === 'canceled') {
                    updateData.delivery_result = 'Cancelado';
                } else {
                    const job = jobs.find(j => j.id === jobId);
                    if (job?.deadline) {
                        const now = new Date();
                        const deadline = new Date(job.deadline);
                        const diffMs = deadline - now;
                        if (diffMs < -7200000) updateData.delivery_result = 'Entregado fuera de plazo';
                        else if (diffMs > 86400000) updateData.delivery_result = 'Entregado con anticipación';
                        else updateData.delivery_result = 'Entregado a tiempo';
                    } else {
                        updateData.delivery_result = 'Entregado a tiempo';
                    }
                }
            }

            const { error } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);
            if (error) throw error;

            // OPTIMISTIC UPDATE: Update local state immediately for better UX
            // CRITICAL: Ensure we update BOTH snake_case and camelCase keys for state consistency
            setJobs(prev => prev.map(j => 
                j.id === jobId ? { 
                    ...j, 
                    ...updateData,
                    deliveryResult: updateData.delivery_result || j.deliveryResult,
                    status: updateData.status || j.status,
                    completedAt: updateData.completed_at || j.completedAt
                } : j
            ));

            // Send Notifications based on status change
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                if (status === 'delivered') {
                    // Freelancer delivered -> Notify Client
                    await NotificationService.createNotification(job.buyerId, {
                        type: 'job_delivered',
                        title: 'Trabajo entregado',
                        message: `¡Trabajo entregado! 📦 ${job.freelancerName} envió los resultados de '${job.serviceTitle}'.`,
                        link: '/dashboard'
                    });
                } else if (status === 'completed') {
                    // Client approved -> Notify Freelancer
                    await NotificationService.createNotification(job.freelancerId, {
                        type: 'job_completed',
                        title: 'Proyecto completado',
                        message: `¡Proyecto completado! ✅ ${job.buyerName} aprobó '${job.serviceTitle}'.`,
                        link: '/dashboard'
                    });
                    
                    // V41: Trigger badge check immediately
                    window.dispatchEvent(new CustomEvent('forceBadgeCheck'));
                } else if (status === 'active' && job.status === 'delivered') {
                    // Client asked for corrections
                    await NotificationService.createNotification(job.freelancerId, {
                        type: 'job_revision_requested',
                        title: 'Ajustes solicitados',
                        message: `Ajustes solicitados ⚠️. ${job.buyerName} pidió correcciones en '${job.serviceTitle}'.`,
                        link: '/dashboard'
                    });
                } else if (status === 'active') {
                    // Client accepted a proposal or a job -> Notify Freelancer (already handled in proposalService, but here's a fallback)
                    await NotificationService.createNotification(job.freelancerId, {
                        type: 'job_active',
                        title: '¡Trabajo activado! 🚀',
                        message: `${job.buyerName} aceptó el inicio del trabajo: '${job.serviceTitle}'.`,
                        link: '/dashboard'
                    });
                }
            }

            // XP and Transaction logic for completed jobs
            if (status === 'completed') {
                if (job) {
                    // Update related proposal if it exists (for projects)
                    if (job.projectId) {
                        try {
                            await supabase
                                .from('proposals')
                                .update({ status: 'completed' })
                                .eq('project_id', job.projectId)
                                .eq('freelancer_id', job.freelancerId);
                        } catch (pErr) {
                            console.warn('Could not update related proposal:', pErr);
                        }
                    }
                    // Record Transactions separately due to RLS (V42)
                    // 1. Record Expense for Buyer
                    try {
                        const { error: expError } = await supabase.from('transactions').insert([
                            {
                                user_id: job.buyerId,
                                type: 'expense',
                                amount: job.amount,
                                method: job.paymentMethod || 'platform',
                                description: `Pago por: ${job.serviceTitle}`,
                                related_id: job.id
                            }
                        ]);
                        if (expError) console.warn('[JobContext] Buyer expense RLS block or error:', expError.message);
                    } catch (txErr) {
                        console.error('Buyer Transaction error:', txErr);
                    }

                    // 2. Record Income for Freelancer (This might still fail if current user is not the freelancer)
                    try {
                        const { error: incError } = await supabase.from('transactions').insert([
                            {
                                user_id: job.freelancerId,
                                type: 'income',
                                amount: job.amount,
                                method: job.paymentMethod || 'platform',
                                description: `Servicio: ${job.serviceTitle}`,
                                related_id: job.id
                            }
                        ]);
                        if (incError) console.warn('[JobContext] Freelancer income RLS block or error:', incError.message);
                    } catch (txErr) {
                        console.error('Freelancer Transaction error:', txErr);
                    }

                    // Notify Payment Released
                    await NotificationService.createNotification(job.freelancerId, {
                        type: 'payment_released',
                        title: 'Pago liberado',
                        message: `¡Pago liberado! 💰 Se acreditaron ${job.amount} ARS por '${job.serviceTitle}'.`,
                        link: '/wallet'
                    });

                    // Notify Project Completed (already there, but unified)
                    await NotificationService.createNotification(job.freelancerId, {
                        type: 'job_completed',
                        title: 'Proyecto completado',
                        message: `¡Proyecto completado! ✅ ${job.buyerName} aprobó '${job.serviceTitle}'.`,
                        link: '/dashboard'
                    });

                    // Award XP via profiles
                    try {
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('*')
                            .in('id', [job.buyerId, job.freelancerId]);

                        if (profiles) {
                            const buyerProfile = profiles.find(p => p.id === job.buyerId);
                            const freelancerProfile = profiles.find(p => p.id === job.freelancerId);

                            if (buyerProfile) {
                                const xpEarned = calculateXPForJob(job.amount, buyerProfile.level || 1);
                                const newXP = (buyerProfile.xp || 0) + xpEarned;
                                const newLevel = getLevelFromXP(newXP);
                                
                                // Update Balance / Stats for Buyer
                                const newTotalSpent = (buyerProfile.total_spent || 0) + job.amount;

                                if (newLevel > (buyerProfile.level || 1)) {
                                    await NotificationService.createNotification(buyerProfile.id, {
                                        type: 'level_up',
                                        title: '¡Subiste de Nivel!',
                                        message: `¡Subiste de Nivel! 🚀 Alcanzaste el Nivel ${newLevel}.`,
                                        link: '/settings'
                                    });
                                }
                                await supabase.from('profiles').update({ 
                                    xp: newXP, 
                                    level: newLevel,
                                    total_spent: newTotalSpent
                                }).eq('id', buyerProfile.id);
                                if (user?.id === buyerProfile.id) {
                                    updateUser({ ...user, xp: newXP, level: newLevel, total_spent: newTotalSpent }).catch(e => console.warn('[JobContext] Sync failed:', e));
                                }
                            }

                            if (freelancerProfile) {
                                const xpEarned = calculateXPForJob(job.amount, freelancerProfile.level || 1);
                                const newXP = (freelancerProfile.xp || 0) + xpEarned;
                                const newLevel = getLevelFromXP(newXP);
                                
                                // Update Balance / Stats for Freelancer
                                const newBalance = (freelancerProfile.balance || 0) + job.amount;
                                const newTotalEarned = (freelancerProfile.total_earned || 0) + job.amount;

                                if (newLevel > (freelancerProfile.level || 1)) {
                                    await NotificationService.createNotification(freelancerProfile.id, {
                                        type: 'level_up',
                                        title: '¡Subiste de Nivel!',
                                        message: `¡Subiste de Nivel! 🚀 Alcanzaste el Nivel ${newLevel}.`,
                                        link: '/settings'
                                    });
                                }
                                await supabase.from('profiles').update({ 
                                    xp: newXP, 
                                    level: newLevel,
                                    balance: newBalance,
                                    total_earned: newTotalEarned
                                }).eq('id', freelancerProfile.id);
                                if (user?.id === freelancerProfile.id) {
                                    updateUser({ ...user, xp: newXP, level: newLevel, balance: newBalance, total_earned: newTotalEarned }).catch(e => console.warn('[JobContext] Sync failed:', e));
                                }
                            }
                        }
                    } catch (xpErr) {
                        console.warn('[JobContext] Award XP error:', xpErr);
                    }
                }
            }

            // PENALTY for Canceled Jobs & REFUND (V48)
            if (status === 'canceled') {
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    // 1. XP PENALTY FOR FREELANCER
                    if (job.freelancerId) {
                        try {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('xp')
                                .eq('id', job.freelancerId)
                                .single();
                            
                            if (profile) {
                                const newXP = (profile.xp || 0) - 20; // Penalty of 20 XP, can go negative
                                await supabase.from('profiles').update({ xp: newXP }).eq('id', profile.id);
                                
                                // Send notification about penalty
                                await NotificationService.createNotification(job.freelancerId, {
                                    type: 'xp_penalty',
                                    title: 'Penalización de XP',
                                    message: `Se te han descontado 20 XP por la cancelación del trabajo: '${job.serviceTitle}'.`,
                                    link: '/settings'
                                });
                            }
                        } catch (pErr) {
                            console.warn('[JobContext] Penalty XP error:', pErr);
                        }
                    }

                    // 2. REFUND TO CLIENT (Automatic on cancel as per user request)
                    try {
                        const { data: clientProfile } = await supabase
                            .from('profiles')
                            .select('balance')
                            .eq('id', job.buyerId)
                            .single();
                        
                        if (clientProfile) {
                            const newBalance = (clientProfile.balance || 0) + (parseFloat(job.amount) || 0);
                            await supabase.from('profiles')
                                .update({ balance: newBalance })
                                .eq('id', job.buyerId);
                            
                            // Create reversal transaction (type 'refund' to not count as 'gain' in summary)
                            await supabase.from('transactions').insert([{
                                user_id: job.buyerId,
                                type: 'refund',
                                amount: job.amount,
                                method: 'escrow_refund',
                                description: `Reembolso por cancelación: ${job.serviceTitle}`,
                                related_id: job.id
                            }]);

                            // Notify Client
                            await NotificationService.createNotification(job.buyerId, {
                                type: 'payment_refund',
                                title: 'Reembolso automático',
                                message: `Se han reembolsado ${job.amount} ARS a tu billetera por la cancelación de '${job.serviceTitle}'.`,
                                link: '/wallet'
                            });
                        }
                    } catch (refundErr) {
                        console.error('[JobContext] Auto-refund error:', refundErr);
                    }

                    // 2. APPLY V34 COMPLIANCE: Commercial penalty only for level 6+
                    try {
                        const { data: freelancerProfile } = await supabase
                            .from('profiles')
                            .select('id, xp, level')
                            .eq('id', job.freelancerId)
                            .single();

                        if (freelancerProfile && (freelancerProfile.level || 1) >= 6) {
                            const penaltyXP = 150; // Fixed commercial penalty
                            const newXP = (freelancerProfile.xp || 0) - penaltyXP; // Can go negative
                            
                            // Check for level down
                            const newLevel = getLevelFromXP(newXP);
                            
                            await supabase.from('profiles')
                                .update({ xp: newXP, level: newLevel })
                                .eq('id', freelancerProfile.id);

                            // Sync local user if it's the current user
                            if (user?.id === freelancerProfile.id) {
                                updateUser({ ...user, xp: newXP, level: newLevel }).catch(e => console.warn('[JobContext] Penalty sync failed:', e));
                            }
                            
                            console.log(`[Gamification V34] Commercial penalty applied to @${job.freelancerUsername}: -${penaltyXP} XP`);
                        }
                    } catch (err) {
                        console.error('[JobContext] Cancellation penalty error:', err);
                    }
                }
            }
        } catch (err) {
            console.error('[JobContext] Error updating job status:', err);
        }
    }, [jobs, user, updateUser]);

    const extendJobDeadline = useCallback(async (jobId, extraDays) => {
        try {
            const job = jobs.find(j => j.id === jobId);
            if (!job?.deadline) return;

            const currentDeadline = new Date(job.deadline);
            const baseTime = Math.max(currentDeadline.getTime(), Date.now());
            const newDeadline = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000);
            const newDuration = (job.duration || 0) + extraDays;

            const { error } = await supabase
                .from('jobs')
                .update({ deadline: newDeadline.toISOString(), duration: newDuration })
                .eq('id', jobId);

            if (error) throw error;

            setJobs(prev => prev.map(j =>
                j.id === jobId ? { ...j, deadline: newDeadline.toISOString(), duration: newDuration } : j
            ));
        } catch (err) {
            console.error('[JobContext] Error extending deadline:', err);
        }
    }, [jobs]);

    const hideJob = useCallback((jobId) => {
        // Hide from dashboard without deleting from DB or touching reviews
        const hiddenKey = `hidden_jobs_${user?.id || 'anon'}`;
        const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
        if (!hidden.includes(jobId)) {
            hidden.push(jobId);
            localStorage.setItem(hiddenKey, JSON.stringify(hidden));
        }
        // Remove from local state so it disappears immediately
        setJobs(prev => prev.filter(j => j.id !== jobId));
    }, [user?.id]);

    const resolveEscrow = useCallback(async (jobId, resolution) => {
        // resolution: 'release' (to freelancer) or 'refund' (to client)
        try {
            const job = jobs.find(j => j.id === jobId);
            if (!job) return;

            if (resolution === 'release') {
                // Reusing updateJobStatus for 'completed' which already handles income/expense transactions
                await updateJobStatus(jobId, 'completed');
            } else if (resolution === 'refund') {
                // 1. Update job status to 'refunded'
                const { error: jobErr } = await supabase
                    .from('jobs')
                    .update({ status: 'refunded' })
                    .eq('id', jobId);
                if (jobErr) throw jobErr;

                // 2. Update client balance (Refund)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', job.buyerId)
                    .single();
                
                if (profile) {
                    const newBalance = (profile.balance || 0) + (parseFloat(job.amount) || 0);
                    await supabase.from('profiles').update({ balance: newBalance }).eq('id', job.buyerId);
                    
                    // 3. Create refund transaction (type 'refund' so it doesn't count as 'profit' in wallet)
                    await supabase.from('transactions').insert([{
                        user_id: job.buyerId,
                        type: 'refund',
                        amount: job.amount,
                        method: 'escrow_refund',
                        description: `Reembolso (Escrow): ${job.serviceTitle}`,
                        related_id: job.id
                    }]);

                    // 4. Notify client
                    await NotificationService.createNotification(job.buyerId, {
                        type: 'payment_refund',
                        title: 'Fondos Reembolsados',
                        message: `Se han reembolsado ${job.amount} ARS a tu billetera por '${job.serviceTitle}'.`,
                        link: '/wallet'
                    });
                }

                // Update local state
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'refunded' } : j));
            }
        } catch (err) {
            console.error('[JobContext] Error resolving escrow:', err);
            throw err;
        }
    }, [jobs, updateJobStatus]);

    const visibleJobs = React.useMemo(() => {
        const hiddenKey = `hidden_jobs_${user?.id || 'anon'}`;
        const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
        return jobs.filter(j => !hidden.includes(j.id));
    }, [jobs, user?.id]);

    const value = React.useMemo(() => ({ 
        jobs: visibleJobs, 
        loading, 
        createJob, 
        updateJobStatus, 
        extendJobDeadline, 
        resolveEscrow, 
        hideJob, 
        fetchJobs 
    }), [visibleJobs, loading, createJob, updateJobStatus, extendJobDeadline, resolveEscrow, hideJob, fetchJobs]);

    return (
        <JobContext.Provider value={value}>
            {children}
        </JobContext.Provider>
    );
};
