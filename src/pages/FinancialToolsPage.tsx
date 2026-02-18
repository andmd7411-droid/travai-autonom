import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../context/LanguageContext';
import { Calculator, RefreshCw, Scan, Plus } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { RecurringItem } from '../types';
import '../styles/FinancialToolsPage.css';

const FinancialToolsPage: React.FC = () => {
    const { t } = useLanguage();
    const workSessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const recurring = useLiveQuery(() => db.recurringItems.toArray());

    const totalIncome = workSessions?.reduce((sum, s) => sum + (s.totalEarned || 0), 0) || 0;
    const totalExp = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const netProfit = totalIncome - totalExp;

    // Simple tax estimation logic (e.g. 25% of net profit)
    const estimatedTax = netProfit > 0 ? netProfit * 0.25 : 0;

    return (
        <div className="page-container fin-tools-page">
            <div className="page-header">
                <h2>{t.financialTools}</h2>
            </div>

            <div className="tools-grid">
                {/* Tax Estimation Card */}
                <div className="tool-card glass-panel">
                    <div className="tool-header">
                        <Calculator size={24} className="icon-tax" />
                        <h3>{t.taxEstimation}</h3>
                    </div>
                    <div className="tool-content">
                        <div className="stat-row">
                            <span>{t.netProfit}:</span>
                            <span className="value">{formatCurrency(netProfit)}</span>
                        </div>
                        <div className="stat-row highlight">
                            <span>{t.estimatedTax} (25%):</span>
                            <span className="value">{formatCurrency(estimatedTax)}</span>
                        </div>
                        <p className="tool-note">Estimation based on current earnings and expenses.</p>
                    </div>
                </div>

                {/* Recurring Items Card */}
                <div className="tool-card glass-panel">
                    <div className="tool-header">
                        <RefreshCw size={24} className="icon-recurring" />
                        <h3>{t.recurringItems}</h3>
                        <button className="icon-btn" title={t.addRecurring}>
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="tool-content">
                        {!recurring || recurring.length === 0 ? (
                            <p className="empty-msg">No recurring items setup.</p>
                        ) : (
                            <div className="recurring-list">
                                {recurring.map((item: RecurringItem) => (
                                    <div key={item.id} className="recurring-item">
                                        <span>{item.title}</span>
                                        <span>{formatCurrency(item.amount)} / {String(t[item.frequency as keyof typeof t])}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* OCR Receipt Card */}
                <div className="tool-card glass-panel">
                    <div className="tool-header">
                        <Scan size={24} className="icon-ocr" />
                        <h3>{t.ocrScanning}</h3>
                    </div>
                    <div className="tool-content">
                        <p>Automatically extract details from receipts using AI.</p>
                        <button className="action-btn">
                            <Scan size={18} />
                            <span>Try Scanner</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialToolsPage;
