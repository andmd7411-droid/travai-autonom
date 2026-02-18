import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { TrendingUp, TrendingDown, Wallet, Download } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { exportToCSV, exportToPDF } from '../utils/export';
import { useLanguage } from '../context/LanguageContext';
import type { WorkSession, Expense } from '../types';
import '../styles/FinancePage.css';

const FinancePage: React.FC = () => {
    const { t } = useLanguage();
    const sessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const mileage = useLiveQuery(() => db.mileage.toArray());
    const clients = useLiveQuery(() => db.clients.toArray());

    const { income, expense, net } = useMemo(() => {
        const totalIncome = sessions?.reduce((acc: number, s: WorkSession) => acc + (s.totalEarned || 0), 0) || 0;
        const totalExpense = expenses?.reduce((acc: number, e: Expense) => acc + e.amount, 0) || 0;
        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense
        };
    }, [sessions, expenses]);

    const handleExport = (type: 'work' | 'expenses' | 'mileage' | 'clients', format: 'csv' | 'pdf') => {
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `${type}_${dateStr}`;
        const title = `${t[type]} Report - ${dateStr}`;

        let data: any[] = [];
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
            <h2>{t.financialSummary}</h2>

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
