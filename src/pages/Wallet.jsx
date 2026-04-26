import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useActionModal } from '../context/ActionModalContext';
import { Info, Wallet as WalletIcon, CreditCard, ExternalLink } from 'lucide-react';
import '../styles/pages/Wallet.scss';

const Wallet = () => {
    const { user: authUser, updateBalance, isTutorView, supervisedUser } = useAuth();
    const { showActionModal } = useActionModal();
    const user = isTutorView ? supervisedUser : authUser;
    
    const { jobs } = useJobs();
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [filterMethod, setFilterMethod] = useState('all'); 
    const [connectedAccounts, setConnectedAccounts] = useState({
        paypal: false,
        mercadopago: false,
        binance: false
    });

    // Stats State
    const [stats, setStats] = useState({
        totalEarned: 0,
        totalSpent: 0,
        pendingClearance: 0,
        completedJobs: 0,
        byMethod: {},
        transactions: []
    });

    useEffect(() => {
        if (!user) return;

        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const { data: txs, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                let earned = 0;
                let spent = 0;
                let pending = 0;
                const methodStats = {};

                const mapped = (txs || []).map(t => {
                    const amount = parseFloat(t.amount);
                    if (t.type === 'income') earned += amount;
                    if (t.type === 'expense') spent += amount;
                    if (t.status === 'pending') pending += amount;

                    if (!methodStats[t.method]) methodStats[t.method] = { earned: 0, spent: 0, count: 0, pending: 0 };
                    if (t.type === 'income') methodStats[t.method].earned += amount;
                    if (t.type === 'expense') methodStats[t.method].spent += amount;
                    methodStats[t.method].count++;

                    return {
                        id: t.id,
                        type: t.type,
                        amount: amount,
                        method: t.method,
                        title: t.description || 'Transacción',
                        date: t.created_at,
                        status: t.status,
                        serviceLink: t.related_id ? '/dashboard' : '#'
                    };
                });

                setStats({
                    totalEarned: earned,
                    totalSpent: spent,
                    pendingClearance: pending,
                    completedJobs: txs.filter(t => t.type === 'income').length,
                    byMethod: methodStats,
                    transactions: mapped
                });
            } catch (err) {
                console.error('Error fetching transactions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();

        const channel = supabase
            .channel('wallet-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchTransactions())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const filterOptions = [
        { label: 'Todo (General)', value: 'all' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Mercado Pago', value: 'mercadopago' },
        { label: 'Binance Pay', value: 'binance' },
        { label: 'Tarjeta', value: 'card' }
    ];

    const filteredTransactions = filterMethod === 'all'
        ? stats.transactions
        : stats.transactions.filter(t => t.method === filterMethod);

    // Calculate Escrow (Pending) Balance from active jobs
    const escrowBalance = useMemo(() => {
        if (!jobs || jobs.length === 0) return 0;
        return jobs.reduce((acc, job) => {
            if (['active', 'delivered'].includes(job.status)) {
                return acc + (parseFloat(job.amount) || 0);
            }
            return acc;
        }, 0);
    }, [jobs]);

    // Update stats with escrowBalance if it changes
    useEffect(() => {
        if (escrowBalance !== stats.pendingClearance) {
            setStats(prev => ({
                ...prev,
                pendingClearance: escrowBalance
            }));
        }
    }, [escrowBalance, stats.pendingClearance]);

    useEffect(() => {
        if (user?.paymentMethods) {
            setConnectedAccounts(prev => ({ ...prev, ...user.paymentMethods }));
        }
    }, [user]);

    const handleConnect = (provider) => {
        if (isTutorView) {
            showActionModal({
                title: 'Seguridad',
                message: "Acción de seguridad: No puedes modificar métodos de pago en modo lectura.",
                severity: 'warning'
            });
            return;
        }
        const isConnected = connectedAccounts[provider];
        
        showActionModal({
            title: isConnected ? 'Desconectar' : 'Conectar',
            message: `¿Estás seguro de que quieres ${isConnected ? 'desconectar' : 'conectar'} tu cuenta de ${provider.toUpperCase()}?`,
            type: 'confirm',
            severity: isConnected ? 'error' : 'info',
            onConfirm: () => {
                const updatedAccounts = { ...connectedAccounts, [provider]: !isConnected };
                setConnectedAccounts(updatedAccounts);
                showActionModal({
                    title: '¡Éxito!',
                    message: `Cuenta de ${provider.toUpperCase()} ${isConnected ? 'desconectada' : 'conectada'} correctamente.`,
                    severity: 'success'
                });
            }
        });
    };

    if (!user) return <div className="container">Cargando...</div>;

    const getMethodName = (method) => {
        const names = { paypal: 'PayPal', mercadopago: 'Mercado Pago', binance: 'Binance Pay', card: 'Tarjeta', platform: 'Saldo Plataforma' };
        return names[method] || method;
    };

    return (
        <div className="wallet-container container">
            {/* Header Area */}
            <div className="wallet-header">
                <div className="wallet-title-group">
                    <h1 className="page-title" style={{ margin: 0 }}>Billetera & Finanzas</h1>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setActiveTab(activeTab === 'methods' ? 'overview' : 'methods')}
                    style={{ fontSize: '0.9rem', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    {activeTab === 'methods' ? 'Ver Mi Panel' : 'Gestionar Métodos'}
                </button>
            </div>


            {activeTab === 'overview' && (
                <>
                    {/* Main Balance Card */}
                    <div className="main-balance-card premium-glass">
                        <div className="balance-content">
                            <div className="balance-label">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                Saldo Disponible
                                <div className="info-tooltip-wrapper">
                                    <Info className="info-icon-svg" size={16} />
                                    <div className="tooltip-box">
                                        <strong>REGISTRO VISUAL</strong>
                                        Este saldo es un reflejo visual de tus operaciones para control personal. Los pagos reales se procesan externamente según los Términos y Condiciones.
                                    </div>
                                </div>
                            </div>
                            <p className="balance-amount">
                                {((stats.totalEarned || 0) - (stats.totalSpent || 0)) >= 0 ? '+' : '-'}${Math.abs((stats.totalEarned || 0) - (stats.totalSpent || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="currency">ARS</span>
                            </p>
                            <div className="card-dummy-number">**** **** **** {user.id.slice(-4)}</div>
                            <div className="card-holder-name">{user.first_name || user.company_name || user.username}</div>
                        </div>
                        <div className="balance-chip">
                            <div className="chip-line"></div>
                            <div className="chip-line"></div>
                            <div className="chip-line"></div>
                        </div>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="wallet-stats-grid">
                        <div className="mini-stat-card earned">
                            <div className="stat-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                                Ingresos Totales
                            </div>
                            <div className="stat-value">+${stats.totalEarned.toLocaleString()}</div>
                            <div className="stat-footer">En todos los métodos</div>
                        </div>

                        <div className="mini-stat-card spent">
                            <div className="stat-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                                Gastos Totales
                            </div>
                            <div className="stat-value">-${stats.totalSpent.toLocaleString()}</div>
                            <div className="stat-footer">Compras realizadas</div>
                        </div>

                        <div className="mini-stat-card pending">
                            <div className="stat-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Pendiente
                            </div>
                            <div className="stat-value">${stats.pendingClearance.toLocaleString()}</div>
                            <div className="stat-footer">Saldo en garantía</div>
                        </div>
                    </div>

                    {/* Methods Breakdown */}
                    <div className="methods-section">
                        <h3 className="methods-breakdown-title">Desglose por Plataforma</h3>
                        {Object.keys(stats.byMethod).length === 0 ? (
                            <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderRadius: '20px', color: 'var(--text-secondary)' }}>No hay movimientos registrados aún.</div>
                        ) : (
                            <div className="methods-grid">
                                {Object.entries(stats.byMethod).map(([method, data]) => {
                                    const totalVol = data.earned + data.spent;
                                    const ePct = totalVol > 0 ? (data.earned / totalVol) * 100 : 0;
                                    const sPct = totalVol > 0 ? (data.spent / totalVol) * 100 : 0;

                                    return (
                                        <div key={method} className="method-pill-card">
                                            <div className="method-top">
                                                <div className="method-info">
                                                    <span className="method-name">{getMethodName(method)}</span>
                                                </div>
                                                <span className="method-balance" style={{ color: (data.earned - data.spent) >= 0 ? 'var(--text-primary)' : '#ef4444' }}>
                                                    ${(data.earned - data.spent).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="progress-container">
                                                <div className="progress-track">
                                                    {ePct > 0 && <div style={{ width: `${ePct}%`, background: '#22c55e', height: '100%' }}></div>}
                                                    {sPct > 0 && <div style={{ width: `${sPct}%`, background: '#ef4444', height: '100%' }}></div>}
                                                </div>
                                                <div className="progress-labels">
                                                    <span style={{ color: '#22c55e' }}>+{data.earned.toLocaleString()}</span>
                                                    <span style={{ color: '#ef4444' }}>-{data.spent.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Transaction Activity */}
                    <div className="transaction-list-card">
                        <div className="list-header">
                            <h3>Actividad Reciente</h3>
                            <select
                                className="wallet-select"
                                value={filterMethod}
                                onChange={(e) => setFilterMethod(e.target.value)}
                            >
                                {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '20px' }}>
                                No se encontraron transacciones con este filtro.
                            </div>
                        ) : (
                            <div className="tx-list">
                                {filteredTransactions.map((t, idx) => (
                                    <div key={idx} className="tx-item">
                                        <div className="tx-left">
                                            <div className={`tx-icon ${t.type === 'income' ? 'income' : 'expense'}`}>
                                                {t.type === 'income' ? '↓' : '↑'}
                                            </div>
                                            <div className="tx-info">
                                                <div className="tx-title" onClick={() => navigate(t.serviceLink)} style={{ cursor: 'pointer' }}>{t.title}</div>
                                                <div className="tx-meta">
                                                    {new Date(t.date).toLocaleDateString()} • {getMethodName(t.method)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="tx-right">
                                            <div className={`tx-amount ${t.type === 'income' ? 'income' : 'expense'}`}>
                                                {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                                            </div>
                                            <div className="tx-status">{t.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'methods' && (
                <div className="methods-section">
                    <div className="glass transaction-list-card">
                        <h3>Cuentas Conectadas</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Gestiona tus métodos de retiro y cobro automático externos.</p>

                        <div style={{ display: 'grid', gap: '1.2rem' }}>
                            {[
                                { id: 'paypal', name: 'PayPal', desc: 'Pagos Internacionales', color: '#003087', chip: 'P' },
                                { id: 'mercadopago', name: 'Mercado Pago', desc: 'Argentina (CVU/Alias)', color: '#009ee3', chip: 'MP' },
                                { id: 'binance', name: 'Binance Pay', desc: 'Criptomonedas (USDT/BTC)', color: '#F3BA2F', chip: '₿', textColor: 'black' }
                            ].map(acc => (
                                <div key={acc.id} className="tx-item" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
                                    <div className="tx-left">
                                        <div style={{ width: '52px', height: '52px', background: acc.color, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: acc.textColor || 'white', fontWeight: '800', fontSize: '1.2rem' }}>{acc.chip}</div>
                                        <div className="tx-info">
                                            <div className="tx-title">{acc.name}</div>
                                            <div className="tx-meta">{acc.desc}</div>
                                        </div>
                                    </div>
                                    <button
                                        className={connectedAccounts[acc.id] ? 'btn-secondary' : 'btn-primary'}
                                        onClick={() => handleConnect(acc.id)}
                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                                    >
                                        {connectedAccounts[acc.id] ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
