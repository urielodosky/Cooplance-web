import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useJobs } from '../context/JobContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/pages/Dashboard.scss';

const Wallet = () => {
    const { user: authUser, updateBalance, isTutorView, supervisedUser } = useAuth();
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
        transactions: [] // NEW: Store all transactions
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

        // Optional: Real-time subscription for wallet
        const channel = supabase
            .channel('wallet-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchTransactions())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Derived stats
    const currentStats = filterMethod === 'all'
        ? { earned: stats.totalEarned, spent: stats.totalSpent, pending: stats.pendingClearance }
        : {
            earned: stats.byMethod[filterMethod]?.earned || 0,
            spent: stats.byMethod[filterMethod]?.spent || 0,
            pending: stats.byMethod[filterMethod]?.pending || 0
        };

    const filteredTransactions = filterMethod === 'all'
        ? stats.transactions
        : stats.transactions.filter(t => t.method === filterMethod);

    // Load initial state from user profile
    useEffect(() => {
        if (user?.paymentMethods) {
            setConnectedAccounts(prev => ({ ...prev, ...user.paymentMethods }));
        }
    }, [user]);

    const handleConnect = (provider) => {
        if (isTutorView) {
            alert("Acción de seguridad: No puedes modificar métodos de pago en modo lectura.");
            return;
        }
        const isConnected = connectedAccounts[provider];
        let newStatus = !isConnected;

        if (!isConnected) {
            if (!confirm(`¿Conectar cuenta de ${provider.toUpperCase()}?`)) return;
        } else {
            if (!confirm(`¿Desconectar cuenta de ${provider.toUpperCase()}?`)) return;
        }

        const updatedAccounts = { ...connectedAccounts, [provider]: newStatus };
        setConnectedAccounts(updatedAccounts);

        // Persist to user profile logic (mock)
        // updateUser({ ...user, paymentMethods: updatedAccounts });
        console.log("Updated accounts:", updatedAccounts);
    };

    if (!user) return <div className="container">Cargando...</div>;

    const getMethodIcon = (method) => {
        switch (method) {
            case 'paypal': return <div style={{ width: '32px', height: '32px', background: '#003087', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>P</div>;
            case 'mercadopago': return <div style={{ width: '32px', height: '32px', background: '#009ee3', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>MP</div>;
            case 'binance': return <div style={{ width: '32px', height: '32px', background: '#F3BA2F', borderRadius: '50%', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>₿</div>;
            case 'card': return <div style={{ width: '32px', height: '32px', background: '#333', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>💳</div>;
            default: return <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>★</div>;
        }
    };

    const getMethodName = (method) => {
        const names = {
            paypal: 'PayPal',
            mercadopago: 'Mercado Pago',
            binance: 'Binance Pay',
            card: 'Tarjeta',
            platform: 'Saldo Plataforma'
        };
        return names[method] || method;
    };

    return (
        <div className="container" style={{ padding: '2rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Billetera & Finanzas</h1>
                <button
                    className={`btn-primary ${activeTab === 'methods' ? 'active' : ''}`}
                    onClick={() => setActiveTab(activeTab === 'methods' ? 'overview' : 'methods')}
                    style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {activeTab === 'methods' ? 'Ver Resumen' : 'Métodos de Pago'}
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="dashboard-grid">
                    {/* Main Balance Card */}
                    <div className="glass stat-card" style={{
                        gridColumn: '1 / -1',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)',
                        border: 'none',
                        borderRadius: '24px',
                        padding: '2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Ganancias Netas / Saldo</h4>
                                <p style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    {((stats.totalEarned || 0) - (stats.totalSpent || 0)) >= 0 ? '+' : '-'}${Math.abs((stats.totalEarned || 0) - (stats.totalSpent || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span style={{ fontSize: '1.5rem', opacity: 0.8, marginLeft: '0.5rem' }}>ARS</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Overall Stats (General) */}
                    <div className="glass stat-card">
                        <h4 style={{ color: 'var(--text-secondary)' }}>Ganancias Totales</h4>
                        <p style={{ fontSize: '2rem', color: '#22c55e', fontWeight: 'bold' }}>+${stats.totalEarned.toLocaleString()} ARS</p>
                        <small style={{ color: 'var(--text-secondary)' }}>En todos los métodos</small>
                    </div>

                    <div className="glass stat-card">
                        <h4 style={{ color: 'var(--text-secondary)' }}>Gastos Totales</h4>
                        <p style={{ fontSize: '2rem', color: '#ef4444', fontWeight: 'bold' }}>-${stats.totalSpent.toLocaleString()} ARS</p>
                        <small style={{ color: 'var(--text-secondary)' }}>Compras realizadas</small>
                    </div>

                    <div className="glass stat-card">
                        <h4 style={{ color: 'var(--text-secondary)' }}>Pendiente</h4>
                        <p style={{ fontSize: '2rem', color: '#f59e0b', fontWeight: 'bold' }}>${stats.pendingClearance.toLocaleString()} ARS</p>
                        <small style={{ color: 'var(--text-secondary)' }}>En garantía</small>
                    </div>

                    {/* Breakdown by Payment Method Grid (Always Visible) */}
                    <div style={{
                        gridColumn: '1 / -1',
                        borderRadius: '24px',
                        padding: '1rem 0'
                    }}>
                        {Object.keys(stats.byMethod).length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No hay movimientos registrados aún.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {Object.entries(stats.byMethod).map(([method, data]) => {
                                    const totalVolume = data.earned + data.spent;
                                    const earnedPct = totalVolume > 0 ? (data.earned / totalVolume) * 100 : 0;
                                    const spentPct = totalVolume > 0 ? (data.spent / totalVolume) * 100 : 0;

                                    return (
                                        <div key={method} className="glass stat-card" style={{
                                            background: 'var(--bg-card)',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{getMethodName(method)}</span>
                                                <span style={{ fontWeight: 'bold', color: (data.earned - data.spent) >= 0 ? 'var(--text-primary)' : '#ef4444' }}>
                                                    ${(data.earned - data.spent).toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Visual Bar Graph */}
                                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                                {earnedPct > 0 && (
                                                    <div style={{ width: `${earnedPct}%`, background: '#22c55e', height: '100%' }}></div>
                                                )}
                                                {spentPct > 0 && (
                                                    <div style={{ width: `${spentPct}%`, background: '#ef4444', height: '100%' }}></div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ingresos</span>
                                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>+${data.earned.toLocaleString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Gastos</span>
                                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-${data.spent.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filtered Transactions List */}
                    <div className="glass dashboard-card" style={{
                        gridColumn: '1 / -1',
                        borderRadius: '24px',
                        padding: '2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Registro de Actividad</h3>
                            <div className="custom-select-wrapper" style={{ position: 'relative', minWidth: '200px' }}>
                                <select
                                    value={filterMethod}
                                    onChange={(e) => setFilterMethod(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem 2.5rem 0.6rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        fontWeight: '500'
                                    }}
                                >
                                    <option value="all">Todo (General)</option>
                                    <option value="paypal">PayPal</option>
                                    <option value="mercadopago">Mercado Pago</option>
                                    <option value="binance">Binance Pay</option>
                                    <option value="card">Tarjeta</option>
                                </select>
                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>▼</div>
                            </div>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No hay registros para este filtro.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {filteredTransactions.map((t, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1rem',
                                        background: 'var(--bg-card-hover)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px',
                                                borderRadius: '50%',
                                                background: t.type === 'income' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: t.type === 'income' ? '#22c55e' : '#ef4444'
                                            }}>
                                                {t.type === 'income' ? '↓' : '↑'}
                                            </div>
                                            <div>
                                                <div
                                                    style={{ fontWeight: '600', cursor: 'pointer', display: 'inline-block' }}
                                                    onClick={() => navigate(t.serviceLink)}
                                                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                                >
                                                    {t.title}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {new Date(t.date).toLocaleDateString()} •
                                                    <span style={{ fontWeight: '500' }}>
                                                        {getMethodName(t.method)}
                                                    </span>
                                                    {t.partnerName && (
                                                        <>
                                                            •
                                                            <span
                                                                style={{ cursor: 'pointer', color: 'var(--primary)' }}
                                                                onClick={() => navigate(t.partnerLink)}
                                                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                                            >
                                                                {t.partnerName}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()} ARS
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'methods' && (
                <div className="dashboard-grid">
                    <div className="glass dashboard-card" style={{ gridColumn: '1 / -1' }}>
                        <h3>Cuentas Conectadas</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Gestiona tus métodos de retiro y cobro automático.</p>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {/* PayPal */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#003087', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>P</div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>PayPal</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pagos Internacionales</span>
                                    </div>
                                </div>
                                <button
                                    className={connectedAccounts.paypal ? 'btn-secondary' : 'btn-primary'}
                                    onClick={() => handleConnect('paypal')}
                                >
                                    {connectedAccounts.paypal ? 'Desconectar' : 'Conectar'}
                                </button>
                            </div>

                            {/* Mercado Pago */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#009ee3', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>MP</div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>Mercado Pago</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Argentina (CVU/Alias)</span>
                                    </div>
                                </div>
                                <button
                                    className={connectedAccounts.mercadopago ? 'btn-secondary' : 'btn-primary'}
                                    onClick={() => handleConnect('mercadopago')}
                                >
                                    {connectedAccounts.mercadopago ? 'Desconectar' : 'Conectar'}
                                </button>
                            </div>

                            {/* Binance */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#F3BA2F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold' }}>₿</div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>Binance Pay</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Criptomonedas (USDT/BTC)</span>
                                    </div>
                                </div>
                                <button
                                    className={connectedAccounts.binance ? 'btn-secondary' : 'btn-primary'}
                                    onClick={() => handleConnect('binance')}
                                >
                                    {connectedAccounts.binance ? 'Desconectar' : 'Conectar'}
                                </button>
                            </div>

                            {/* Credit Card */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#333', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>💳</div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>Tarjeta de Crédito/Débito</h4>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visa, Mastercard (Cuotas)</span>
                                    </div>
                                </div>
                                <button className="btn-secondary" onClick={() => alert('Gestionado por procesador de pagos')}>
                                    Gestionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
