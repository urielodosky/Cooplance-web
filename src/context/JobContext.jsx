import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { calculateXPForJob, calculateNextLevelXP, registerActivity } from '../utils/gamification';
import * as NotificationService from '../services/NotificationService';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

export const JobProvider = ({ children }) => {
    const { user, updateUser } = useAuth(); // Need login to update user state (XP/Level)
    const [jobs, setJobs] = useState(() => {
        const stored = localStorage.getItem('cooplance_db_jobs');
        return stored ? JSON.parse(stored) : [];
    });

    React.useEffect(() => {
        localStorage.setItem('cooplance_db_jobs', JSON.stringify(jobs));
    }, [jobs]);

    const createJob = (service, buyer) => {
        const newJob = {
            id: Date.now(),
            serviceId: service.id,
            serviceTitle: service.title,
            freelancerName: service.freelancerName,
            freelancerId: service.freelancerId, // Ensure we store ID

            // Enhanced Buyer Info
            buyerId: buyer.id,
            buyerName: buyer.role === 'company' ? buyer.companyName : (buyer.firstName + ' ' + buyer.lastName),
            buyerRole: buyer.role,
            buyerAvatar: buyer.avatar || null, // Logic to get avatar should be handled by UI or utility, here we store what we have

            amount: service.price,
            tier: service.selectedTier || 'Standard',
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
            duration: service.deliveryTime || 5, // Days
            deadline: new Date(Date.now() + (service.deliveryTime || 5) * 24 * 60 * 60 * 1000).toISOString()
        };
        setJobs([...jobs, newJob]);
        console.log('Job created:', newJob);

        // Notify freelancer
        NotificationService.createNotification(newJob.freelancerId, {
            type: NotificationService.NOTIFICATION_TYPES.HIRED,
            title: '¡Nuevo pedido recibido!',
            message: `${newJob.buyerName} acaba de contratar tu servicio: ${newJob.serviceTitle}.`,
            link: `/chat/order_${newJob.id}`
        });

        // Register Activity for Buyer
        if (user) {
            const updated = registerActivity(user);
            updateUser(updated);
        }

        // Auto-approve payment for demo
        setTimeout(() => {
            updateJobStatus(newJob.id, 'active');
        }, 1000);
    };

    const updateJobStatus = (jobId, status, explicitDeliveryResult = null) => {
        setJobs(prev => prev.map(job => {
            if (job.id === jobId) {
                const updatedJob = { ...job, status };

                // Calculate deliveryResult if completing/canceling
                if (status === 'completed' || status === 'canceled') {
                    if (explicitDeliveryResult) {
                        updatedJob.deliveryResult = explicitDeliveryResult;
                    } else if (status === 'canceled') {
                        updatedJob.deliveryResult = 'Cancelado';
                    } else if (job.deadline) {
                        const now = new Date();
                        const deadline = new Date(job.deadline);
                        const diffMs = deadline - now;

                        // Buffer of 2 hours just for fairness
                        if (diffMs < -7200000) {
                            updatedJob.deliveryResult = 'Entregado fuera de plazo';
                        } else if (diffMs > 86400000) { // More than 24h early
                            updatedJob.deliveryResult = 'Entregado con anticipación';
                        } else {
                            updatedJob.deliveryResult = 'Entregado a tiempo';
                        }
                    } else {
                        updatedJob.deliveryResult = 'Entregado a tiempo';
                    }
                    updatedJob.completedAt = new Date().toISOString();
                }
                return updatedJob;
            }
            return job;
        }));

        if (status === 'completed') {
            const job = jobs.find(j => j.id === jobId);

            // Should be done via backend, but here we update LocalStorage directly for the mock
            if (job) {
                // Notify freelancer
                NotificationService.createNotification(job.freelancerId, {
                    type: NotificationService.NOTIFICATION_TYPES.ACCEPTED,
                    title: '¡Trabajo Completado!',
                    message: `El cliente ha aceptado y finalizado el servicio: ${job.serviceTitle}.`,
                    link: `/chat/order_${job.id}`
                });

                const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');

                // 1. AWARD XP TO CLIENT (User Request 24: 2x XP, 4x if new talent)
                const buyerIndex = storedUsers.findIndex(u => u.id === job.buyerId);
                if (buyerIndex !== -1) {
                    let buyer = storedUsers[buyerIndex];

                    // Find freelancer to check level
                    const freelancer = storedUsers.find(u => u.id === job.freelancerId);
                    const freelancerLevel = freelancer ? (freelancer.level || 1) : 1;

                    const xpEarned = calculateXPForJob(job.amount, buyer.level || 1, buyer.role, freelancerLevel);

                    console.log(`Awarding Client XP: ${xpEarned} (Freelancer Level: ${freelancerLevel})`);

                    // Update Buyer
                    buyer.xp = (buyer.xp || 0) + xpEarned;

                    // Register Activity
                    buyer = registerActivity(buyer);

                    const nextLevelXP = calculateNextLevelXP(buyer.level || 1);
                    if (buyer.xp >= nextLevelXP && (buyer.level || 1) < 10) {
                        buyer.level = (buyer.level || 1) + 1;
                        NotificationService.createNotification(buyer.id, {
                            type: NotificationService.NOTIFICATION_TYPES.LEVEL_UP,
                            title: '¡Subiste de Nivel!',
                            message: `¡Felicidades! Has alcanzado el nivel ${buyer.level}. Sigue así para desbloquear más beneficios.`,
                            link: `/profile/${buyer.id}`
                        });
                    }

                    storedUsers[buyerIndex] = buyer;
                    localStorage.setItem('cooplance_db_users', JSON.stringify(storedUsers));

                    if (user && user.id === buyer.id) {
                        updateUser(buyer);
                    }
                }

                // 2. AWARD XP TO FREELANCER (Standard Logic)
                const freelancerIndex = storedUsers.findIndex(u => u.id === job.freelancerId);
                if (freelancerIndex !== -1) {
                    let freelancer = storedUsers[freelancerIndex];
                    const xpEarned = calculateXPForJob(job.amount, freelancer.level || 1, 'freelancer');

                    freelancer.xp = (freelancer.xp || 0) + xpEarned;
                    freelancer = registerActivity(freelancer);

                    const nextLevelXP = calculateNextLevelXP(freelancer.level || 1);
                    if (freelancer.xp >= nextLevelXP && (freelancer.level || 1) < 10) {
                        freelancer.level = (freelancer.level || 1) + 1;
                        NotificationService.createNotification(freelancer.id, {
                            type: NotificationService.NOTIFICATION_TYPES.LEVEL_UP,
                            title: '¡Subiste de Nivel!',
                            message: `¡Felicidades! Has alcanzado el nivel ${freelancer.level}. Ahora tienes acceso a nuevos beneficios.`,
                            link: `/profile/${freelancer.id}`
                        });
                    }

                    storedUsers[freelancerIndex] = freelancer;
                    localStorage.setItem('cooplance_db_users', JSON.stringify(storedUsers));

                    if (user && user.id === freelancer.id) {
                        updateUser(freelancer);
                    }
                }
            }
        }
    };

    const extendJobDeadline = (jobId, extraDays) => {
        setJobs(prev => {
            const newJobs = prev.map(job => {
                if (job.id === jobId && job.deadline) {
                    const currentDeadline = new Date(job.deadline);
                    const baseTime = Math.max(currentDeadline.getTime(), Date.now());
                    const newDeadline = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000);
                    return { ...job, deadline: newDeadline.toISOString(), duration: job.duration + extraDays };
                }
                return job;
            });
            localStorage.setItem('cooplance_db_jobs', JSON.stringify(newJobs));
            return newJobs;
        });
    };

    return (
        <JobContext.Provider value={{ jobs, createJob, updateJobStatus, extendJobDeadline }}>
            {children}
        </JobContext.Provider>
    );
};
