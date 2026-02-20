import React, { useState, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Download, Save } from 'lucide-react';
import { db } from '../db/db';
import type { Invoice } from '../types';
import '../styles/InvoicesPage.css';

// TPS = 5%, TVQ = 9.975% (Quebec rates)
const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
}

interface InvoiceFormProps {
    onBack: () => void;
    existingInvoice?: Invoice;
}

const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onBack, existingInvoice }) => {
    const printRef = useRef<HTMLDivElement>(null);

    // Company info
    const [companyName, setCompanyName] = useState(existingInvoice ? '' : '');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');

    // Client info
    const [clientName, setClientName] = useState(existingInvoice?.clientName || '');
    const [clientAddress, setClientAddress] = useState('');

    // Invoice meta
    const [invoiceNumber] = useState(existingInvoice?.invoiceNumber || generateInvoiceNumber());
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceType, setInvoiceType] = useState<'invoice' | 'quote'>(existingInvoice?.type || 'invoice');

    // Items
    const [items, setItems] = useState<InvoiceItem[]>(
        existingInvoice?.items || [{ description: '', quantity: 1, price: 0 }]
    );

    // Taxes
    const [includeTPS, setIncludeTPS] = useState(true);
    const [includeTVQ, setIncludeTVQ] = useState(true);

    // Notes
    const [notes, setNotes] = useState(existingInvoice?.notes || '');

    // Saving state
    const [saved, setSaved] = useState(false);

    // ─── Calculations ───
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const tpsAmount = includeTPS ? subtotal * TPS_RATE : 0;
    const tvqAmount = includeTVQ ? subtotal * TVQ_RATE : 0;
    const total = subtotal + tpsAmount + tvqAmount;

    // ─── Item helpers ───
    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: field === 'description' ? value : Number(value) } : item
        ));
    };

    const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, price: 0 }]);

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Save to DB ───
    const handleSave = async () => {
        const invoice: Omit<Invoice, 'id'> = {
            invoiceNumber,
            date: new Date(invoiceDate),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            type: invoiceType,
            status: 'draft',
            clientName,
            items,
            totals: {
                subtotal,
                tps: includeTPS ? tpsAmount : undefined,
                tvq: includeTVQ ? tvqAmount : undefined,
                total
            },
            notes
        };

        if (existingInvoice?.id) {
            await db.invoices.update(existingInvoice.id, invoice);
        } else {
            await db.invoices.add(invoice);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // ─── PDF Export via browser print ───
    const handleExportPDF = () => {
        window.print();
    };

    const fmt = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });

    return (
        <div className="page-container invoice-form-page">
            {/* Header */}
            <div className="inv-form-header">
                <button className="inv-back-btn" onClick={onBack} aria-label="Retour">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="inv-form-title">
                    {invoiceType === 'invoice' ? 'Nouvelle Facture' : 'Nouveau Devis'}
                </h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setInvoiceType(invoiceType === 'invoice' ? 'quote' : 'invoice')}
                        style={{
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #6366f1',
                            background: 'transparent',
                            color: '#6366f1',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {invoiceType === 'invoice' ? '→ Devis' : '→ Facture'}
                    </button>
                </div>
            </div>

            {/* ─── Invoice Paper ─── */}
            <div className="invoice-paper" ref={printRef}>
                {/* Paper Header */}
                <div className="inv-paper-header">
                    <div className="inv-paper-company">
                        <input
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="Nom de votre entreprise"
                        />
                        <textarea
                            rows={2}
                            value={companyAddress}
                            onChange={e => setCompanyAddress(e.target.value)}
                            placeholder="Adresse, Ville, Province"
                        />
                        <input
                            value={companyPhone}
                            onChange={e => setCompanyPhone(e.target.value)}
                            placeholder="Téléphone"
                        />
                        <input
                            value={companyEmail}
                            onChange={e => setCompanyEmail(e.target.value)}
                            placeholder="Courriel"
                        />
                    </div>
                    <div className="inv-paper-badge">
                        {invoiceType === 'invoice' ? 'FACTURE' : 'DEVIS'}
                        <small>#{invoiceNumber}</small>
                    </div>
                </div>

                {/* Meta row */}
                <div className="inv-meta-row">
                    <div className="inv-meta-group">
                        <span className="inv-meta-label">Date</span>
                        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                    </div>
                    <div className="inv-meta-group">
                        <span className="inv-meta-label">Échéance</span>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                </div>

                {/* Bill to */}
                <div className="inv-bill-to">
                    <div className="inv-bill-to-title">Facturer à</div>
                    <input
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Nom du client"
                    />
                    <input
                        value={clientAddress}
                        onChange={e => setClientAddress(e.target.value)}
                        placeholder="Adresse du client"
                    />
                </div>

                {/* Items table */}
                <table className="inv-items-table">
                    <thead>
                        <tr>
                            <th className="col-desc">Description</th>
                            <th className="col-qty">Qté</th>
                            <th className="col-price">Prix unit.</th>
                            <th className="col-total">Total</th>
                            <th className="col-del"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i}>
                                <td className="col-desc">
                                    <input
                                        value={item.description}
                                        onChange={e => updateItem(i, 'description', e.target.value)}
                                        placeholder="Description du service"
                                    />
                                </td>
                                <td className="col-qty">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={item.quantity}
                                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                                    />
                                </td>
                                <td className="col-price">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.price}
                                        onChange={e => updateItem(i, 'price', e.target.value)}
                                    />
                                </td>
                                <td className="col-total">{fmt(item.quantity * item.price)}</td>
                                <td className="col-del">
                                    <button className="inv-del-btn" onClick={() => removeItem(i)} aria-label="Supprimer ligne">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button className="inv-add-item-btn" onClick={addItem}>
                    <Plus size={16} />
                    Ajouter une ligne
                </button>

                {/* Totals */}
                <div className="inv-totals">
                    <div className="inv-total-row">
                        <span>Sous-total</span>
                        <span>{fmt(subtotal)}</span>
                    </div>
                    {includeTPS && (
                        <div className="inv-total-row">
                            <span>TPS (5%)</span>
                            <span>{fmt(tpsAmount)}</span>
                        </div>
                    )}
                    {includeTVQ && (
                        <div className="inv-total-row">
                            <span>TVQ (9.975%)</span>
                            <span>{fmt(tvqAmount)}</span>
                        </div>
                    )}
                    <div className="inv-total-row grand">
                        <span>TOTAL</span>
                        <span>{fmt(total)}</span>
                    </div>
                </div>

                {/* Notes */}
                {notes && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                        <strong>Notes:</strong> {notes}
                    </div>
                )}
            </div>

            {/* Tax toggles */}
            <label className="inv-tax-toggle">
                <input
                    type="checkbox"
                    checked={includeTPS}
                    onChange={e => setIncludeTPS(e.target.checked)}
                />
                <span className="inv-tax-toggle-label">Inclure TPS (5%)</span>
            </label>

            <label className="inv-tax-toggle">
                <input
                    type="checkbox"
                    checked={includeTVQ}
                    onChange={e => setIncludeTVQ(e.target.checked)}
                />
                <span className="inv-tax-toggle-label">Inclure TVQ (9.975%)</span>
            </label>

            {/* Notes textarea */}
            <textarea
                className="inv-notes-area"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes, conditions de paiement, remerciements..."
            />

            {/* Action buttons */}
            <div className="inv-form-actions">
                <button className="inv-save-btn" onClick={handleSave}>
                    <Save size={18} style={{ display: 'inline', marginRight: '0.4rem' }} />
                    {saved ? '✓ Sauvegardée!' : 'Sauvegarder la facture'}
                </button>
                <button className="inv-pdf-btn" onClick={handleExportPDF}>
                    <Download size={18} />
                    Exporter en PDF
                </button>
            </div>
        </div>
    );
};

export default InvoiceForm;
