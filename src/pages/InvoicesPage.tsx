import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, FileText, Trash2, CheckCircle, Clock, XCircle, Send, Mail, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import type { Invoice } from '../types';
import '../styles/InvoicesPage.css';

interface InvoicesPageProps {
    onNewInvoice: () => void;
    onViewInvoice: (invoice: Invoice) => void;
}

const statusIcon = (status: string) => {
    switch (status) {
        case 'paid': return <CheckCircle size={14} color="#10b981" />;
        case 'sent': return <Send size={14} color="#3b82f6" />;
        case 'overdue': return <XCircle size={14} color="#ef4444" />;
        case 'cancelled': return <XCircle size={14} color="#94a3b8" />;
        default: return <Clock size={14} color="#f59e0b" />;
    }
};

const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNewInvoice, onViewInvoice }) => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState<'all' | 'invoice' | 'quote'>('all');

    const invoices = useLiveQuery(() =>
        db.invoices.orderBy('date').reverse().toArray()
    );

    // Auto-mark overdue invoices
    const now = new Date();
    invoices?.forEach(inv => {
        if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < now) {
            db.invoices.update(inv.id!, { status: 'overdue' });
        }
    });

    const filtered = invoices?.filter(inv => filter === 'all' || inv.type === filter);

    const handleDelete = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(t.confirmDeleteDoc || 'Delete this invoice?')) {
            db.invoices.delete(id);
        }
    };

    const handleStatusChange = (id: number, status: Invoice['status'], e: React.MouseEvent) => {
        e.stopPropagation();
        db.invoices.update(id, { status });
    };

    const handleEmailInvoice = (inv: Invoice, e: React.MouseEvent) => {
        e.stopPropagation();
        const subject = encodeURIComponent(`Facture #${inv.invoiceNumber} - ${formatCurrency(inv.totals.total)}`);
        const body = encodeURIComponent(
            `Bonjour ${inv.clientName},\n\n` +
            `Veuillez trouver ci-joint la facture #${inv.invoiceNumber} d'un montant de ${formatCurrency(inv.totals.total)}.\n\n` +
            (inv.dueDate ? `Date d'échéance: ${new Date(inv.dueDate).toLocaleDateString('fr-CA')}\n\n` : '') +
            `Merci de votre confiance !`
        );
        const email = '';
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
        // Also mark as sent if it was draft
        if (inv.status === 'draft') {
            db.invoices.update(inv.id!, { status: 'sent' });
        }
    };

    const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((a, b) => a + b.totals.total, 0) || 0;
    const totalPending = invoices?.filter(i => i.status === 'sent' || i.status === 'draft').reduce((a, b) => a + b.totals.total, 0) || 0;
    const totalOverdue = invoices?.filter(i => i.status === 'overdue').reduce((a, b) => a + b.totals.total, 0) || 0;

    return (
        <div className="page-container invoices-page">
            {/* Summary */}
            <div className="inv-summary-row">
                <div className="inv-summary-card paid">
                    <span className="inv-sum-label">{t.invoiceStatus?.paid || 'Payées'}</span>
                    <span className="inv-sum-amount">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="inv-summary-card pending">
                    <span className="inv-sum-label">En attente</span>
                    <span className="inv-sum-amount">{formatCurrency(totalPending)}</span>
                </div>
                {totalOverdue > 0 && (
                    <div className="inv-summary-card overdue">
                        <span className="inv-sum-label">En retard</span>
                        <span className="inv-sum-amount">{formatCurrency(totalOverdue)}</span>
                    </div>
                )}
            </div>

            {/* Filter tabs */}
            <div className="inv-filter-tabs">
                {(['all', 'invoice', 'quote'] as const).map(f => (
                    <button
                        key={f}
                        className={`inv-tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? 'Toutes' : f === 'invoice' ? 'Factures' : 'Devis'}
                    </button>
                ))}
            </div>

            {/* New invoice button */}
            <button className="inv-new-btn" onClick={onNewInvoice}>
                <Plus size={20} />
                <span>Nouvelle Facture</span>
            </button>

            {/* List */}
            <div className="inv-list">
                {(!filtered || filtered.length === 0) && (
                    <div className="inv-empty">
                        <FileText size={48} color="#94a3b8" />
                        <p>{t.noInvoicesFound || 'Aucune facture trouvée.'}</p>
                    </div>
                )}
                {filtered?.map(inv => (
                    <div key={inv.id} className={`inv-card glass-panel ${inv.status === 'overdue' ? 'overdue-card' : ''}`} onClick={() => onViewInvoice(inv)}>
                        <div className="inv-card-left">
                            <div className="inv-card-number">#{inv.invoiceNumber}</div>
                            <div className="inv-card-client">{inv.clientName || '—'}</div>
                            <div className="inv-card-date">{inv.date.toLocaleDateString()}</div>
                            {inv.dueDate && (
                                <div className={`inv-card-due ${inv.status === 'overdue' ? 'overdue-text' : ''}`}>
                                    {inv.status === 'overdue' && <AlertTriangle size={12} />}
                                    Éch: {new Date(inv.dueDate).toLocaleDateString('fr-CA')}
                                </div>
                            )}
                        </div>
                        <div className="inv-card-right">
                            <div className="inv-card-total">{formatCurrency(inv.totals.total)}</div>
                            <div className="inv-card-status">
                                {statusIcon(inv.status)}
                                <span>{t.invoiceStatus?.[inv.status as keyof typeof t.invoiceStatus] || inv.status}</span>
                            </div>
                            <div className="inv-card-actions">
                                {/* Email button */}
                                <button
                                    className="inv-action-btn email"
                                    onClick={(e) => handleEmailInvoice(inv, e)}
                                    title="Envoyer par email"
                                >
                                    <Mail size={16} />
                                </button>
                                {/* Mark as paid */}
                                {(inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue') && (
                                    <button
                                        className="inv-action-btn mark-paid"
                                        onClick={(e) => handleStatusChange(inv.id!, 'paid', e)}
                                        title="Marquer payée"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                )}
                                {/* Mark as sent */}
                                {inv.status === 'draft' && (
                                    <button
                                        className="inv-action-btn mark-sent"
                                        onClick={(e) => handleStatusChange(inv.id!, 'sent', e)}
                                        title="Marquer envoyée"
                                    >
                                        <Send size={16} />
                                    </button>
                                )}
                                <button
                                    className="inv-action-btn delete"
                                    onClick={(e) => handleDelete(inv.id!, e)}
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InvoicesPage;
