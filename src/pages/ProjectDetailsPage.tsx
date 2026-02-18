import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ArrowLeft, Clock, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDuration } from '../utils/format';
import { BarChart, PieChart } from '../components/AnalyticsCharts';
import '../styles/global.css';
import '../styles/ProjectDetailsPage.css';

const ProjectDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const projectId = Number(id);

    const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
    const client = useLiveQuery(() => project?.clientId ? db.clients.get(project.clientId) : undefined, [project]);

    const sessions = useLiveQuery(() =>
        db.workSessions.where('projectId').equals(projectId).reverse().sortBy('startTime'),
        [projectId]
    );

    const expenses = useLiveQuery(() =>
        db.expenses.where('projectId').equals(projectId).reverse().sortBy('date'),
        [projectId]
    );

    const stats = useMemo(() => {
        if (!sessions || !expenses) return { hours: 0, income: 0, expenseTotal: 0, net: 0 };

        const hours = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600000;
        const income = sessions.reduce((acc, s) => acc + (s.totalEarned || 0), 0);
        const expenseTotal = expenses.reduce((acc, e) => acc + e.amount, 0);

        return {
            hours,
            income,
            expenseTotal,
            net: income - expenseTotal
        };
    }, [sessions, expenses]);

    const chartData = useMemo(() => {
        if (!sessions || !expenses) return { monthly: [], categories: [] };

        // Monthly Data (Income vs Expense)
        const monthMap = new Map<string, { income: number, expense: number }>();

        sessions.forEach(s => {
            const month = s.startTime.toLocaleString('default', { month: 'short' });
            const curr = monthMap.get(month) || { income: 0, expense: 0 };
            curr.income += s.totalEarned || 0;
            monthMap.set(month, curr);
        });

        expenses.forEach(e => {
            const month = e.date.toLocaleString('default', { month: 'short' });
            const curr = monthMap.get(month) || { income: 0, expense: 0 };
            curr.expense += e.amount;
            monthMap.set(month, curr);
        });

        const monthly = Array.from(monthMap.entries()).map(([month, data]) => ({
            month,
            income: data.income,
            expense: data.expense
        }));

        // Category Data
        const catMap = new Map<string, number>();
        expenses.forEach(e => {
            const curr = catMap.get(e.category) || 0;
            catMap.set(e.category, curr + e.amount);
        });

        const totalExp = Array.from(catMap.values()).reduce((a, b) => a + b, 0);
        const categories = Array.from(catMap.entries()).map(([cat, amount], index) => {
            // Safe access using keyof checks or type assertion if strict
            // t.categories is object of strings. cat is string.
            // We can assume cat is one of the keys or fallback.
            const label = (t.categories as Record<string, string>)[cat] || cat;
            return {
                category: label,
                amount,
                percentage: totalExp ? (amount / totalExp) * 100 : 0,
                color: `hsl(${index * 60 + 200}, 70%, 60%)`
            };
        });

        return { monthly, categories };
    }, [sessions, expenses, t]);

    if (!project) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container project-details-page">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="back-btn" aria-label={t.backToHome}>
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2>
                        <span className="color-dot" style={{ backgroundColor: project.color }}></span>
                        {project.name}
                    </h2>
                    <p className="subtitle">{client?.name || t.notSpecified} • {project.status}</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card glass-panel">
                    <div className="stat-icon"><Clock size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">{t.totalHours}</span>
                        <span className="stat-value">{stats.hours.toFixed(1)}h</span>
                    </div>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-icon income"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">{t.totalIncome}</span>
                        <span className="stat-value">{formatCurrency(stats.income)}</span>
                    </div>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-icon expense"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">{t.totalExpenses}</span>
                        <span className="stat-value">{formatCurrency(stats.expenseTotal)}</span>
                    </div>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-icon profit"><PieChartIcon size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">{t.netProfit}</span>
                        <span className="stat-value" style={{ color: stats.net >= 0 ? '#4ade80' : '#f87171' }}>
                            {formatCurrency(stats.net)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="charts-section">
                <div className="chart-card glass-panel">
                    <h3>{t.financialSummary}</h3>
                    <BarChart data={chartData.monthly} />
                </div>
                <div className="chart-card glass-panel">
                    <h3>{t.expenses}</h3>
                    <PieChart data={chartData.categories} />
                </div>
            </div>

            <div className="lists-container">
                <div className="list-section glass-panel">
                    <h3>{t.work}</h3>
                    <div className="simple-list">
                        {sessions?.slice(0, 5).map(s => (
                            <div key={s.id} className="list-item">
                                <span>{s.startTime.toLocaleDateString()}</span>
                                <span>{formatDuration(s.duration || 0)}</span>
                                <span>{formatCurrency(s.totalEarned || 0)}</span>
                            </div>
                        ))}
                        {(!sessions || sessions.length === 0) && <p className="empty-text">{t.noActivity}</p>}
                    </div>
                </div>

                <div className="list-section glass-panel">
                    <h3>{t.expenses}</h3>
                    <div className="simple-list">
                        {expenses?.slice(0, 5).map(e => (
                            <div key={e.id} className="list-item">
                                <span>{e.date.toLocaleDateString()}</span>
                                <span>{(t.categories as Record<string, string>)[e.category] || e.category}</span>
                                <span>{formatCurrency(e.amount)}</span>
                            </div>
                        ))}
                        {(!expenses || expenses.length === 0) && <p className="empty-text">{t.noActivity}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;
