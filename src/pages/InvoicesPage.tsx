import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Plus, Filter, Search } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import '../styles/InvoicesPage.css';

const InvoicesPage: React.FC = () => {
    const { t } = useLanguage();
    const invoices = useLiveQuery(() => db.invoices.orderBy('date').reverse().toArray());

    return (
        <div className="page-container invoices-page">
            <div className="page-header">
                <h2>{t.invoices}</h2>
                <button className="add-btn">
                    <Plus size={20} />
                    <span>{t.createInvoice}</span>
                </button>
            </div>

            <div className="filter-bar glass-panel">
                <div className="search-input">
                    <Search size={18} />
                    <input type="text" placeholder={t.search} />
                </div>
                <div className="filter-actions">
                    <Filter size={18} />
                    <span>{t.invoiceStatus.draft}</span>
                </div>
            </div>

            <div className="invoices-list">
                {!invoices || invoices.length === 0 ? (
                    <div className="empty-state glass-panel">
                        <FileText size={48} opacity={0.3} />
                        <p>{t.noInvoicesFound}</p>
                    </div>
                ) : (
                    invoices.map(invoice => (
                        <div key={invoice.id} className={`invoice-card glass-panel status-${invoice.status}`}>
                            <div className="invoice-info">
                                <h3>{invoice.invoiceNumber}</h3>
                                <p className="client-name">{invoice.clientName}</p>
                                <p className="invoice-date">{invoice.date.toLocaleDateString()}</p>
                            </div>
                            <div className="invoice-meta">
                                <span className={`status-badge ${invoice.status}`}>
                                    {t.invoiceStatus[invoice.status]}
                                </span>
                                <p className="amount">{formatCurrency(invoice.totals.total)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InvoicesPage;
