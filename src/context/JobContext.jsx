import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateXPForJob, calculateNextLevelXP, registerActivity } from '../utils/gamification';
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
    deliveryResult: row.delivery_result,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
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
    };
};

// ── Provider ─────────────────────────────────────────────────

export const JobProvider = ({ children }) => {
    const { user, updateUser } = useAuth();
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
                    client:client_id(username, first_name, last_name, avatar_url, role),
                    provider:provider_id(username, first_name, last_name, avatar_url, role)
                `)
                .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs((data || []).map(mapJobFromDB));
        } catch (err) {
            console.error('[JobContext] Supabase fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchJobs().catch(err => console.error('[JobContext] Unhandled fetchJobs error:', err));
    }, [fetchJobs]);

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

    const createJob = async (service, buyer) => {
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

            // Notify freelancer
            NotificationService.createNotification(mapped.freelancerId, {
                type: NotificationService.NOTIFICATION_TYPES.HIRED,
                title: '¡Nuevo pedido recibido!',
                message: `${mapped.buyerName} acaba de contratar tu servicio: ${mapped.serviceTitle}.`,
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
    };

    const updateJobStatus = async (jobId, status, explicitDeliveryResult = null) => {
        try {
            const updateData = { status };

            if (status === 'completed' || status === 'canceled') {
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

            setJobs(prev => prev.map(job =>
                job.id === jobId ? { ...job, status, ...updateData } : job
            ));

            // XP and Transaction logic for completed jobs
            if (status === 'completed') {
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    // Record Transaction
                    try {
                        const { error: txError } = await supabase.from('transactions').insert([
                            {
                                user_id: job.freelancerId,
                                type: 'income',
                                amount: job.amount,
                                method: job.paymentMethod || 'platform',
                                description: `Servicio: ${job.serviceTitle}`,
                                related_id: job.id
                            },
                            {
                                user_id: job.buyerId,
                                type: 'expense',
                                amount: job.amount,
                                method: job.paymentMethod || 'platform',
                                description: `Pago por: ${job.serviceTitle}`,
                                related_id: job.id
                            }
                        ]);
                        if (txError) console.error('Error recording transactions:', txError);
                    } catch (txErr) {
                        console.error('Transaction insertion error:', txErr);
                    }

                    NotificationService.createNotification(job.freelancerId, {
                        type: NotificationService.NOTIFICATION_TYPES.ACCEPTED,
                        title: '¡Trabajo Completado!',
                        message: `El cliente ha aceptado y finalizado el servicio: ${job.serviceTitle}.`,
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
                                const xpEarned = calculateXPForJob(job.amount, buyerProfile.level || 1, buyerProfile.role, freelancerProfile?.level || 1);
                                const newXP = (buyerProfile.xp || 0) + xpEarned;
                                let newLevel = buyerProfile.level || 1;
                                if (newXP >= calculateNextLevelXP(newLevel) && newLevel < 10) newLevel++;
                                await supabase.from('profiles').update({ xp: newXP, level: newLevel }).eq('id', buyerProfile.id);
                                if (user?.id === buyerProfile.id) {
                                    updateUser({ ...user, xp: newXP, level: newLevel }).catch(e => console.warn('[JobContext] XP sync failed:', e));
                                }
                            }

                            if (freelancerProfile) {
                                const xpEarned = calculateXPForJob(job.amount, freelancerProfile.level || 1, 'freelancer');
                                const newXP = (freelancerProfile.xp || 0) + xpEarned;
                                let newLevel = freelancerProfile.level || 1;
                                if (newXP >= calculateNextLevelXP(newLevel) && newLevel < 10) newLevel++;
                                await supabase.from('profiles').update({ xp: newXP, level: newLevel }).eq('id', freelancerProfile.id);
                                if (user?.id === freelancerProfile.id) {
                                    updateUser({ ...user, xp: newXP, level: newLevel }).catch(e => console.warn('[JobContext] XP sync failed:', e));
                                }
                            }
                        }
                    } catch (xpErr) {
                        console.error('XP Awarding error:', xpErr);
                    }
                }
            } else if (status === 'canceled') {
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    // APPLY V34 COMPLIANCE: Commercial penalty only for level 6+
                    try {
                        const { data: freelancerProfile } = await supabase
                            .from('profiles')
                            .select('id, xp, level')
                            .eq('id', job.freelancerId)
                            .single();

                        if (freelancerProfile && (freelancerProfile.level || 1) >= 6) {
                            const penaltyXP = 150; // Fixed commercial penalty
                            const newXP = Math.max(0, (freelancerProfile.xp || 0) - penaltyXP);
                            
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
                        } else {
                            console.log(`[Gamification V34] Freelancer @${job.freelancerUsername} is level ${freelancerProfile?.level || 1}. Penalty waived.`);
                        }
                    } catch (err) {
                        console.error('[JobContext] Cancellation penalty error:', err);
                    }
                }
            }
        } catch (err) {
            console.error('[JobContext] Error updating job status:', err);
        }
    };

    const extendJobDeadline = async (jobId, extraDays) => {
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
    };

    return (
        <JobContext.Provider value={{ jobs, loading, createJob, updateJobStatus, extendJobDeadline, fetchJobs }}>
            {children}
        </JobContext.Provider>
    );
};
