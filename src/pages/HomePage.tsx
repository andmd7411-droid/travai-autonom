import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
    Clock, DollarSign, FileText, PieChart, Users, Map,
    Calendar, Shield, Receipt, TrendingUp, TrendingDown,
    Wallet, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/format';
import '../styles/HomePage.css';

const HomePage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const sessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const invoices = useLiveQuery(() => db.invoices.toArray());
    const jobs = useLiveQuery(() => db.jobs.orderBy('date').toArray());

    // Monthly income
    const monthIncome = sessions
        ?.filter(s => new Date(s.startTime) >= startOfMonth)
        .reduce((acc, s) => acc + (s.totalEarned || 0), 0) || 0;

    // Monthly expenses
    const monthExpense = expenses
        ?.filter(e => new Date(e.date) >= startOfMonth)
        .reduce((acc, e) => acc + e.amount, 0) || 0;

    // Hours this week
    const weekHours = sessions
        ?.filter(s => new Date(s.startTime) >= startOfWeek && s.endTime)
        .reduce((acc, s) => {
            const ms = new Date(s.endTime!).getTime() - new Date(s.startTime).getTime();
            return acc + ms / 3600000;
        }, 0) || 0;

    // Pending invoices
    const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'draft') || [];
    const pendingTotal = pendingInvoices.reduce((a, b) => a + b.totals.total, 0);

    // Next event
    const nextJob = jobs?.find(j => new Date(j.date) >= now);

    const menuItems = [
        { id: 'work', title: t.work, icon: <Clock size={32} />, path: '/work', color: '#3b82f6' },
        { id: 'expenses', title: t.expenses, icon: <DollarSign size={32} />, path: '/expenses', color: '#ef4444' },
        { id: 'documents', title: t.documents, icon: <FileText size={32} />, path: '/documents', color: '#8b5cf6' },
        { id: 'finance', title: t.finance, icon: <PieChart size={32} />, path: '/finance', color: '#10b981' },
        { id: 'clients', title: t.clients, icon: <Users size={32} />, path: '/clients', color: '#0ea5e9' },
        { id: 'mileage', title: t.mileage, icon: <Map size={32} />, path: '/mileage', color: '#f59e0b' },
        { id: 'jobs', title: t.agenda, icon: <Calendar size={32} />, path: '/jobs', color: '#6366f1' },
        { id: 'daily', title: t.dailySummary, icon: <PieChart size={32} />, path: '/daily-summary', color: '#ec4899' },
        { id: 'invoices', title: 'Facturation', icon: <Receipt size={32} />, path: '/invoices', color: '#14b8a6' },
        { id: 'settings', title: t.settings, icon: <Shield size={32} />, path: '/settings', color: '#64748b' }
    ];

    return (
        <div className="page-container home-page">

            {/* ─── Live Stats Banner ─── */}
            <motion.div
                className="dashboard-stats"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="stat-card income" onClick={() => navigate('/finance')}>
                    <div className="stat-icon"><TrendingUp size={18} /></div>
                    <div className="stat-body">
                        <div className="stat-label">Ce mois</div>
                        <div className="stat-value">{formatCurrency(monthIncome)}</div>
                    </div>
                </div>

                <div className="stat-card expense" onClick={() => navigate('/expenses')}>
                    <div className="stat-icon"><TrendingDown size={18} /></div>
                    <div className="stat-body">
                        <div className="stat-label">Dépenses</div>
                        <div className="stat-value">{formatCurrency(monthExpense)}</div>
                    </div>
                </div>

                <div className="stat-card net" onClick={() => navigate('/finance')}>
                    <div className="stat-icon"><Wallet size={18} /></div>
                    <div className="stat-body">
                        <div className="stat-label">Net</div>
                        <div className={`stat-value ${monthIncome - monthExpense >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(monthIncome - monthExpense)}
                        </div>
                    </div>
                </div>

                <div className="stat-card hours" onClick={() => navigate('/work')}>
                    <div className="stat-icon"><Clock size={18} /></div>
                    <div className="stat-body">
                        <div className="stat-label">Cette semaine</div>
                        <div className="stat-value">{weekHours.toFixed(1)}h</div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Alerts row ─── */}
            {(pendingInvoices.length > 0 || nextJob) && (
                <motion.div
                    className="dashboard-alerts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    {pendingInvoices.length > 0 && (
                        <div className="alert-chip invoice" onClick={() => navigate('/invoices')}>
                            <AlertCircle size={14} />
                            <span>{pendingInvoices.length} facture{pendingInvoices.length > 1 ? 's' : ''} en attente · {formatCurrency(pendingTotal)}</span>
                        </div>
                    )}
                    {nextJob && (
                        <div className="alert-chip event" onClick={() => navigate('/jobs')}>
                            <Calendar size={14} />
                            <span>
                                {nextJob.clientName} · {new Date(nextJob.date).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ─── Navigation Grid ─── */}
            <div className="dashboard-grid">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.04 }}
                    >
                        <div className="colored-card" style={{ '--card-color': item.color } as React.CSSProperties}>
                            <div className="colored-card-icon">{item.icon}</div>
                            <div className="colored-card-label">{item.title}</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
