import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { TrendingUp, TrendingDown, Wallet, Download, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { exportToCSV, exportToPDF } from '../utils/export';
import { useLanguage } from '../context/LanguageContext';
import { BarChart, PieChart } from '../components/AnalyticsCharts';
import type { CategoryData } from '../components/AnalyticsCharts';

import '../styles/FinancePage.css';

const FinancePage: React.FC = () => {
    const { t } = useLanguage();
    const sessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const mileage = useLiveQuery(() => db.mileage.toArray());
    const clients = useLiveQuery(() => db.clients.toArray());

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // --- Aggregation Logic ---
    const { income, expense, net, monthlyData, categoryData, stats } = useMemo(() => {
        if (!sessions || !expenses) return {
            income: 0,
            expense: 0,
            net: 0,
            monthlyData: [],
            categoryData: [],
            stats: { totalHours: 0, topClient: { id: -1, income: 0, name: 'N/A' } }
        };

        // Filter by Year
        const yearSessions = sessions.filter(s => new Date(s.startTime).getFullYear() === selectedYear);
        const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear);

        // Totals
        const totalIncome = yearSessions.reduce((acc, s) => acc + (s.totalEarned || 0), 0);
        const totalExpense = yearExpenses.reduce((acc, e) => acc + e.amount, 0);

        // Monthly Data (Bar Chart)
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            return {
                month: date.toLocaleString('default', { month: 'short' }),
                income: 0,
                expense: 0
            };
        });

        yearSessions.forEach(s => {
            const month = new Date(s.startTime).getMonth();
            months[month].income += (s.totalEarned || 0);
        });

        yearExpenses.forEach(e => {
            const month = new Date(e.date).getMonth();
            months[month].expense += e.amount;
        });

        // Category Data (Pie Chart)
        const catMap = new Map<string, number>();
        yearExpenses.forEach(e => {
            // @ts-expect-error Category indexing fix
            const cat = t.categories[e.category] || e.category;
            catMap.set(cat, (catMap.get(cat) || 0) + e.amount);
        });

        const colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', '#00BCD4'];
        const categoryData: CategoryData[] = Array.from(catMap.entries()).map(([category, amount], i) => ({
            category,
            amount,
            percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
            color: colors[i % colors.length]
        })).sort((a, b) => b.amount - a.amount);

        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense,
            monthlyData: months,
            categoryData,
            stats: {
                totalHours: yearSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600000,
                topClient: (() => {
                    const clientIncome = new Map<number, number>();
                    yearSessions.forEach(s => {
                        if (s.clientId) {
                            clientIncome.set(s.clientId, (clientIncome.get(s.clientId) || 0) + (s.totalEarned || 0));
                        }
                    });
                    let maxIncome = 0;
                    let topClientId = -1;
                    clientIncome.forEach((income, id) => {
                        if (income > maxIncome) {
                            maxIncome = income;
                            topClientId = id;
                        }
                    });
                    return {
                        id: topClientId,
                        income: maxIncome,
                        name: clients?.find(c => c.id === topClientId)?.name || 'N/A'
                    };
                })()
            }
        };
    }, [sessions, expenses, clients, selectedYear, t]);

    const handleExport = (type: 'work' | 'expenses' | 'mileage' | 'clients', format: 'csv' | 'pdf') => {
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${type}_${dateStr}`;
        const title = `${t[type]} Report - ${dateStr}`;

        let data: unknown[] = [];
        switch (type) {
            case 'work': data = sessions || []; break;
            case 'expenses': data = expenses || []; break;
            case 'mileage': data = mileage || []; break;
            case 'clients': data = clients || []; break;
        }

        if (format === 'csv') {
            exportToCSV(data, filename);
        } else {
            exportToPDF(data, filename, title, type);
        }
    };

    return (
        <div className="page-container finance-page">
            <div className="finance-header">
                <h2>{t.financialSummary}</h2>
                <div className="year-selector">
                    <Filter size={16} />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        title="Filter by Year"
                        aria-label="Filter by Year"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="summary-cards">
                <div className="card glass-panel income">
                    <div className="card-icon"><TrendingUp /></div>
                    <div className="card-label">{t.totalIncome}</div>
                    <div className="card-value">{formatCurrency(income)}</div>
                </div>

                <div className="card glass-panel expense">
                    <div className="card-icon"><TrendingDown /></div>
                    <div className="card-label">{t.expenses}</div>
                    <div className="card-value">{formatCurrency(expense)}</div>
                </div>

                <div className="card glass-panel net">
                    <div className="card-icon"><Wallet /></div>
                    <div className="card-label">{t.netProfit}</div>
                    <div className={`card-value ${net >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(net)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-panel glass-panel">
                    <h3>Monthly Overview</h3>
                    <BarChart data={monthlyData} />
                </div>
                <div className="chart-panel glass-panel">
                    <h3>Expenses Breakdown</h3>
                    <PieChart data={categoryData} />
                </div>
            </div>

            {/* Insights Section */}
            <div className="charts-grid">
                <div className="card glass-panel">
                    <div className="card-label">Avg Hourly Rate</div>
                    <div className="card-value">
                        {stats.totalHours > 0
                            ? formatCurrency(income / stats.totalHours)
                            : formatCurrency(0)
                        }/h
                    </div>
                </div>
                <div className="card glass-panel">
                    <div className="card-label">Top Client</div>
                    <div className="card-value top-client-name">
                        {stats.topClient.name}
                    </div>
                    <div className="card-subvalue top-client-income">
                        {formatCurrency(stats.topClient.income)}
                    </div>
                </div>
            </div>

            <div className="export-section glass-panel">
                <h3>{t.exportData}</h3>
                <p>{t.exportNote}</p>
                <div className="export-buttons">
                    <div className="export-group">
                        <h4>CSV (Excel)</h4>
                        <div className="btn-row">
                            <button onClick={() => handleExport('work', 'csv')} className="export-btn">
                                <Download size={16} /> {t.work}
                            </button>
                            <button onClick={() => handleExport('expenses', 'csv')} className="export-btn">
                                <Download size={16} /> {t.expenses}
                            </button>
                            <button onClick={() => handleExport('mileage', 'csv')} className="export-btn">
                                <Download size={16} /> {t.mileage}
                            </button>
                            <button onClick={() => handleExport('clients', 'csv')} className="export-btn">
                                <Download size={16} /> {t.clients}
                            </button>
                        </div>
                    </div>

                    <div className="export-group">
                        <h4>PDF</h4>
                        <div className="btn-row">
                            <button onClick={() => handleExport('work', 'pdf')} className="export-btn pdf" title={`${t.work} (PDF)`} aria-label={`${t.work} (PDF)`}>
                                <Download size={16} /> {t.work}
                            </button>
                            <button onClick={() => handleExport('expenses', 'pdf')} className="export-btn pdf" title={`${t.expenses} (PDF)`} aria-label={`${t.expenses} (PDF)`}>
                                <Download size={16} /> {t.expenses}
                            </button>
                            <button onClick={() => handleExport('mileage', 'pdf')} className="export-btn pdf" title={`${t.mileage} (PDF)`} aria-label={`${t.mileage} (PDF)`}>
                                <Download size={16} /> {t.mileage}
                            </button>
                            <button onClick={() => handleExport('clients', 'pdf')} className="export-btn pdf" title={`${t.clients} (PDF)`} aria-label={`${t.clients} (PDF)`}>
                                <Download size={16} /> {t.clients}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default FinancePage;
