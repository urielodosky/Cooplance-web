import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useActionModal } from '../context/ActionModalContext';
import '../styles/pages/AdminFinanceDashboard.scss';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(value);
};

// CÓDIGO MAESTRO REMOVIDO DEL FRONTEND POR SEGURIDAD
// La validación ahora se hace en el servidor Express (/server/index.js)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminFinanceDashboard = () => {
    const [authStep, setAuthStep] = useState(0); // 0 = request code, 2 = authorized
    const [passcode, setPasscode] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showActionModal } = useActionModal();

    // Security States
    const [loginAttempts, setLoginAttempts] = useState(() => {
        return parseInt(localStorage.getItem('admin_login_attempts') || '0', 10);
    });
    const [lockoutUntil, setLockoutUntil] = useState(() => {
        const time = localStorage.getItem('admin_lockout_until');
        return time ? parseInt(time, 10) : null;
    });
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Data States
    const [metrics, setMetrics] = useState({
        totalVolume: 0,
        platformGrossRevenue: 0,
        estimatedIva: 0,
        estimatedIibb: 0,
        estimatedChequeTax: 0,
        netRevenue: 0,
    });
    const [transactions, setTransactions] = useState([]);
    const [reports, setReports] = useState([]);
    const [activeTab, setActiveTab] = useState('finance'); // 'finance' or 'reports'

    useEffect(() => {
        if (authStep === 2) {
            calculateMetrics();
            fetchReports();
        }
    }, [authStep]);

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*, reporter:profiles!reporter_id(username, first_name, last_name)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error("Error fetching reports:", err);
        }
    };

    const handleUpdateReportStatus = async (reportId, newStatus) => {
        try {
            const { error } = await supabase
                .from('reports')
                .update({ status: newStatus })
                .eq('id', reportId);
            
            if (error) throw error;
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
        } catch (err) {
            console.error("Error updating report status:", err);
            showActionModal({
                title: 'Error de Sistema',
                message: "Hubo un error al actualizar el estado del reporte. Inténtalo de nuevo.",
                severity: 'error'
            });
        }
    };

    // Timer for Lockout Countdown
    useEffect(() => {
        let interval;
        if (lockoutUntil && Date.now() < lockoutUntil) {
            setTimeRemaining(Math.ceil((lockoutUntil - Date.now()) / 1000));
            interval = setInterval(() => {
                const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    setLockoutUntil(null);
                    setLoginAttempts(0);
                    localStorage.removeItem('admin_lockout_until');
                    localStorage.setItem('admin_login_attempts', '0');
                    setTimeRemaining(0);
                    clearInterval(interval);
                } else {
                    setTimeRemaining(remaining);
                }
            }, 1000);
        } else if (lockoutUntil) {
            // Lockout expired while away
            setLockoutUntil(null);
            setLoginAttempts(0);
            localStorage.removeItem('admin_lockout_until');
            localStorage.setItem('admin_login_attempts', '0');
        }
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    const calculateMetrics = async () => {
        try {
            // 1. Fetch Completed Jobs from Supabase
            // We join with profiles (owner_id) to get the freelancer level
            const { data: jobs, error } = await supabase
                .from('jobs')
                .select('*, profiles!freelancer_id(level, username, first_name, last_name)')
                .eq('status', 'completed');

            if (error) throw error;

            // Helper to get commission rate based on level
            const getCommissionRate = (level) => {
                const lvl = parseInt(level) || 1;
                if (lvl >= 1 && lvl <= 5) return 0.12;
                if (lvl === 6) return 0.11;
                if (lvl === 7) return 0.10;
                if (lvl === 8) return 0.09;
                if (lvl === 9) return 0.08;
                if (lvl >= 10) return 0.06;
                return 0.12; // default
            };

            let totalVol = 0;
            let grossRevenue = 0;
            let recentTrans = [];

            (jobs || []).forEach(job => {
                const freelancerLevel = job.profiles?.level || 1;
                const commissionRate = getCommissionRate(freelancerLevel);
                const actualCommission = job.amount * commissionRate;

                totalVol += job.amount;
                grossRevenue += actualCommission;

                recentTrans.push({
                    id: job.id,
                    date: job.completed_at || job.created_at,
                    title: job.service_title || job.title,
                    amount: job.amount,
                    commission: actualCommission,
                    ratePercentage: Math.round(commissionRate * 100),
                    buyer: job.buyer_name || 'Desconocido', // In production, we'd join with buyer profile
                    freelancer: job.profiles ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}`.trim() || job.profiles.username : 'Desconocido',
                    level: freelancerLevel
                });
            });

            // Tax estimates
            const iva = grossRevenue * 0.21;
            const iibb = grossRevenue * 0.05; 
            const chequeTax = grossRevenue * 0.012; 

            const totalTaxes = iva + iibb + chequeTax;
            const net = grossRevenue - totalTaxes;

            setMetrics({
                totalVolume: totalVol,
                platformGrossRevenue: grossRevenue,
                estimatedIva: iva,
                estimatedIibb: iibb,
                estimatedChequeTax: chequeTax,
                netRevenue: net
            });

            setTransactions(recentTrans);
        } catch (err) {
            console.error("Error calculating admin metrics:", err);
        }
    };

    const handlePasscodeSubmit = async (e) => {
        e.preventDefault();

        if (lockoutUntil && Date.now() < lockoutUntil) {
            return;
        }

        setAuthError('');
        setIsLoading(true);

        try {
            const resp = await fetch(`${API_URL}/admin/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode })
            });

            const data = await resp.json();

            if (resp.ok && data.success) {
                // Success
                setLoginAttempts(0);
                localStorage.setItem('admin_login_attempts', '0');
                setAuthStep(2); // Fully authorized directly
            } else {
                // Failure
                const newAttempts = loginAttempts + 1;
                setLoginAttempts(newAttempts);
                localStorage.setItem('admin_login_attempts', newAttempts.toString());

                if (newAttempts >= 3) {
                    const lockoutTime = Date.now() + 10 * 60 * 1000; // 10 minutes
                    setLockoutUntil(lockoutTime);
                    localStorage.setItem('admin_lockout_until', lockoutTime.toString());
                    setAuthError('Demasiados intentos. Sistema bloqueado.');
                } else {
                    setAuthError(data.message || `Código incorrecto. Te quedan ${3 - newAttempts} intentos.`);
                }
            }
        } catch (err) {
            console.error("Auth error:", err);
            setAuthError('Error de conexión con el servidor de seguridad.');
        } finally {
            setIsLoading(false);
        }
    };

    if (authStep < 2) {
        return (
            <div className="admin-auth-container glass-strong">
                <div
                    className="admin-auth-card"
                >
                    <div className="auth-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lock-icon">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <h2>Acceso Restringido</h2>
                        <p>Área exclusiva de administración financiera de Cooplance.</p>
                    </div>

                    <div className="auth-transitions">
                        {lockoutUntil ? (
                            <div className="auth-form" style={{ textAlign: 'center' }}>
                                <div className="verification-notice" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                    <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Acceso Bloqueado</h3>
                                    Has superado el límite de intentos.
                                    <strong>Espera {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} para intentar nuevamente.</strong>
                                </div>
                            </div>
                        ) : (
                            <form
                                key="step1"
                                onSubmit={handlePasscodeSubmit}
                                className="auth-form"
                            >
                                <div className="input-group">
                                    <label>Código de Seguridad</label>
                                    <input
                                        type="password"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        placeholder="Ingresa el código maestro"
                                        autoFocus
                                    />
                                </div>
                                {authError && <div className="auth-error">{authError}</div>}
                                <button type="submit" className="btn-primary auth-btn" disabled={isLoading || !passcode}>
                                    {isLoading ? 'Verificando...' : 'Acceder al Dashboard'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-finance-dashboard">
            <div className="dashboard-header">
                <div className="title-section">
                    <h1>Administración Cooplance</h1>
                    <p>Gestión global de finanzas y moderación de contenido</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button 
                        onClick={() => setActiveTab('finance')}
                        className={`btn-tab ${activeTab === 'finance' ? 'active' : ''}`}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none',
                            background: activeTab === 'finance' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: 'white', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        Finanzas
                    </button>
                    <button 
                        onClick={() => setActiveTab('reports')}
                        className={`btn-tab ${activeTab === 'reports' ? 'active' : ''}`}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '12px', border: 'none',
                            background: activeTab === 'reports' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: 'white', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        Reportes
                        {reports.filter(r => r.status === 'pending').length > 0 && (
                            <span style={{ background: '#ef4444', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                                {reports.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <div className="badge-secure" style={{ marginLeft: '1rem' }}>Conexión Segura</div>
                </div>
            </div>

            {activeTab === 'finance' ? (
                <>
                    <div className="metrics-grid">
                        {/* Ingresos Brutos */}
                        <div className="metric-card gross-card">
                            <div className="icon-wrapper">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                            <div className="metric-content">
                                <h3>Comisión Bruta Generada</h3>
                                <div className="value">{formatCurrency(metrics.platformGrossRevenue)}</div>
                                <div className="subtitle">Calculado según nivel del freelancer en cada pago: {formatCurrency(metrics.totalVolume)}</div>
                            </div>
                        </div>

                        {/* Impuestos Consolidados */}
                        <div className="metric-card tax-card">
                            <div className="icon-wrapper">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                            <div className="metric-content">
                                <h3>Retenciones & Impuestos</h3>
                                <div className="value danger">-{formatCurrency(metrics.estimatedIva + metrics.estimatedIibb + metrics.estimatedChequeTax)}</div>
                                <div className="tax-breakdown">
                                    <span>IVA (21%): {formatCurrency(metrics.estimatedIva)}</span>
                                    <span>IIBB (5%): {formatCurrency(metrics.estimatedIibb)}</span>
                                    <span>Cheque (1.2%): {formatCurrency(metrics.estimatedChequeTax)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Ganancia Neta */}
                        <div className="metric-card net-card">
                            <div className="icon-wrapper">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                            </div>
                            <div className="metric-content">
                                <h3>Ingreso Neto Estimado</h3>
                                <div className="value success">{formatCurrency(metrics.netRevenue)}</div>
                                <div className="subtitle">Monto final aproximado pre-ganancias anuales.</div>
                            </div>
                        </div>
                    </div>

                    <div className="transactions-section">
                        <h2>Historial de Ingresos de Plataforma (Trabajos Completados)</h2>
                        {transactions.length > 0 ? (
                            <div className="table-responsive">
                                <table className="finance-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Servicio</th>
                                            <th>Cliente ➔ Freelancer</th>
                                            <th>Monto Total</th>
                                            <th className="highlight">Comisión Cooplance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((t, idx) => (
                                            <tr key={idx}>
                                                <td>{new Date(t.date).toLocaleDateString()}</td>
                                                <td className="bold-cell">{t.title}</td>
                                                <td>
                                                    {t.buyer} ➔ {t.freelancer}
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>(Nvl {t.level || 1})</span>
                                                </td>
                                                <td>{formatCurrency(t.amount)}</td>
                                                <td className="highlight-cell success-text">
                                                    +{formatCurrency(t.commission)} <span style={{ fontSize: '0.85rem' }}>({t.ratePercentage}%)</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-data">No hay transacciones completadas aún en la plataforma.</div>
                        )}
                    </div>
                </>
            ) : (
                <div className="reports-section">
                    <h2>Moderación de Contenido - Reportes de Usuarios</h2>
                    {reports.length > 0 ? (
                        <div className="table-responsive">
                            <table className="finance-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th>Motivo</th>
                                        <th>Información</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((r) => (
                                        <tr key={r.id}>
                                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`status-badge ${r.reported_item_type}`}>
                                                    {r.reported_item_type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="bold-cell">{r.reason}</td>
                                            <td>
                                                <div style={{ fontSize: '0.9rem' }}>
                                                    <strong>Reporter:</strong> @{r.reporter?.username || 'user'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '250px' }}>
                                                    {r.details || 'Sin detalles adicionales.'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', marginTop: '4px', fontStyle: 'italic', color: 'var(--primary)' }}>
                                                    ID Item: {r.reported_item_id}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${r.status}`}>
                                                    {r.status === 'pending' ? 'Pendiente' : r.status === 'reviewed' ? 'Revisado' : r.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {r.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleUpdateReportStatus(r.id, 'reviewed')}
                                                            className="btn-primary"
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px' }}
                                                        >
                                                            Marcar Revisado
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            showActionModal({
                                                                title: 'Acción de Moderación',
                                                                message: '¿Estás seguro de que deseas dar de baja este contenido? Esta acción es definitiva.',
                                                                type: 'confirm',
                                                                severity: 'error',
                                                                onConfirm: () => {
                                                                    handleUpdateReportStatus(r.id, 'resolved');
                                                                    showActionModal({
                                                                        title: 'Contenido Removido',
                                                                        message: 'El contenido ha sido dado de baja exitosamente.',
                                                                        severity: 'success'
                                                                    });
                                                                }
                                                            });
                                                        }}
                                                        className="btn-danger"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', background: '#ef4444', border: 'none', color: 'white' }}
                                                    >
                                                        Dar de Baja
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-data">No hay reportes activos en este momento.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminFinanceDashboard;
