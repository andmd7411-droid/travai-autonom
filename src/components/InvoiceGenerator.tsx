import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../context/LanguageContext';
import { Share, Printer, Plus, Trash2, ArrowLeft, FileCheck, Download } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { generateInvoicePDF } from '../utils/pdfInvoice';
import type { Client } from '../types';
import '../styles/InvoiceGenerator.css';

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
}

interface InvoiceGeneratorProps {
    onBack: () => void;
    initialType?: 'invoice' | 'quote';
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ onBack, initialType = 'invoice' }) => {
    const { t } = useLanguage();
    const [type, setType] = useState<'invoice' | 'quote'>(initialType);

    const clients = useLiveQuery(() => db.clients.toArray());

    // Initialize with Global Company Profile if available
    const [companyProfile] = useState(() => {
        const saved = localStorage.getItem('companyProfile');
        return saved ? JSON.parse(saved) : {};
    });

    // Local state for editing invoice specific details (defaults to global profile)
    const [companyName, setCompanyName] = useState(companyProfile.name || '');
    const [companyAddress, setCompanyAddress] = useState(companyProfile.address || '');
    const [companyPhone, setCompanyPhone] = useState(companyProfile.phone || '');
    const [companyEmail, setCompanyEmail] = useState(companyProfile.email || '');
    const [taxId, setTaxId] = useState(companyProfile.taxId || '');

    // Invoice/Quote Info
    const [docNumber, setDocNumber] = useState('100');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');

    // Items
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: 'Services', quantity: 1, price: 100 }
    ]);

    // Tax State
    const [addTax, setAddTax] = useState(localStorage.getItem('invoice_addTax') === 'true');

    // Save tax preference
    useEffect(() => {
        localStorage.setItem('invoice_addTax', addTax.toString());
    }, [addTax]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = Number(e.target.value);
        const client = clients?.find(c => c.id === clientId);
        if (client) {
            setClientName(client.name);
            setClientAddress(`${client.address || ''}\n${client.email || ''}\n${client.phone || ''}`);
        }
    };

    const convertToInvoice = () => {
        setType('invoice');
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tps = addTax ? subtotal * 0.05 : 0;
    const tvq = addTax ? subtotal * 0.09975 : 0;
    const total = subtotal + tps + tvq;

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        await generateInvoicePDF({
            type,
            number: docNumber,
            date,
            company: {
                name: companyName,
                address: companyAddress,
                phone: companyPhone,
                email: companyEmail,
                taxId: taxId,
                logoUrl: companyProfile.logoUrl
            },
            client: {
                name: clientName,
                address: clientAddress
            },
            items,
            totals: {
                subtotal,
                tps: addTax ? tps : undefined,
                tvq: addTax ? tvq : undefined,
                total
            },
            lang: {
                invoice: t.invoice,
                quote: t.quote || 'Quote',
                date: t.date,
                billTo: t.billTo,
                item: t.itemDescription,
                qty: t.quantity,
                price: t.price,
                total: t.total,
                subtotal: t.subtotal,
                tps: t.tps,
                tvq: t.tvq,
                thankYou: t.thankYou
            }
        });
    };

    const handleEmail = () => {
        const title = type === 'invoice' ? t.invoice : 'Quote';
        const subject = `${title} #${docNumber} - ${companyName || 'Freelancer'}`;
        const body = `Please find attached the ${type} #${docNumber}.\n\nSubtotal: ${formatCurrency(subtotal)}\nTPS: ${formatCurrency(tps)}\nTVQ: ${formatCurrency(tvq)}\nTotal: ${formatCurrency(total)}\n\nThank you,\n${companyName}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="invoice-container">
            <div className="invoice-actions no-print glass-panel">
                <button className="nav-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                    <span>{t.backToDocs}</span>
                </button>
                <div className="actions-right">
                    {type === 'quote' && (
                        <button className="action-btn convert-btn" onClick={convertToInvoice} title="Convert to Invoice">
                            <FileCheck size={20} />
                            <span>Convert to Invoice</span>
                        </button>
                    )}
                    <button
                        className={`action-btn tax-btn ${addTax ? 'active' : 'inactive'}`}
                        onClick={() => setAddTax(!addTax)}
                        title={addTax ? 'Disable Taxes' : 'Enable Taxes'}
                    >
                        <span>{addTax ? 'TPS/TVQ ON' : 'TPS/TVQ OFF'}</span>
                    </button>
                    <button className="action-btn pdf-btn" onClick={handleDownloadPDF} title="Download PDF">
                        <Download size={20} />
                        <span>PDF</span>
                    </button>
                    <button className="action-btn email" onClick={handleEmail} title={t.sendEmail}>
                        <Share size={20} />
                        <span>{t.sendEmail}</span>
                    </button>
                    <button className="action-btn print" onClick={handlePrint} title={t.print}>
                        <Printer size={20} />
                        <span>{t.print}</span>
                    </button>
                </div>
            </div>

            <div className={`invoice-paper ${type === 'quote' ? 'quote-mode' : ''}`} id="invoice">
                <div className="invoice-header">
                    <div className="company-info">
                        <input
                            type="text"
                            className="editable-header"
                            placeholder={t.companyName}
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            title={t.companyName}
                        />
                        <textarea
                            className="editable-text"
                            placeholder={t.companyAddress}
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            rows={3}
                            title={t.companyAddress}
                        />
                        <input
                            type="text"
                            className="editable-text"
                            placeholder={t.profilePhone}
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            title="Phone"
                        />
                        <input
                            type="email"
                            className="editable-text"
                            placeholder={t.profileEmail}
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            title="Email"
                        />
                        <input
                            type="text"
                            className="editable-text"
                            placeholder={t.profileTaxId}
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            title="Tax ID"
                        />
                    </div>
                    <div className="invoice-meta">
                        <h1 className="invoice-title">{type === 'invoice' ? t.invoice : 'DEVIZ'}</h1>
                        <div className="meta-row">
                            <span className="meta-label"># {type === 'invoice' ? t.invoiceNumber : 'Deviz'}:</span>
                            <input
                                type="text"
                                className="meta-input"
                                value={docNumber}
                                onChange={(e) => setDocNumber(e.target.value)}
                                title={t.invoiceNumber}
                            />
                        </div>
                        <div className="meta-row">
                            <span className="meta-label">{t.date}:</span>
                            <input
                                type="date"
                                className="meta-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                title={t.date}
                            />
                        </div>
                    </div>
                </div>

                <div className="client-section">
                    <div className="bill-to">
                        <h3>{t.billTo}:</h3>
                        <div className="client-select-wrapper no-print">
                            <select onChange={handleClientSelect} defaultValue="" title={t.clients || "Select Client"}>
                                <option value="" disabled>Select Client...</option>
                                {clients?.map((client: Client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <input
                            type="text"
                            className="editable-input"
                            placeholder={t.clientName}
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            title={t.clientName}
                        />
                        <textarea
                            className="editable-textarea"
                            placeholder={t.companyAddress}
                            value={clientAddress}
                            onChange={(e) => setClientAddress(e.target.value)}
                            rows={3}
                            title="Client Address"
                        />
                    </div>
                </div>

                <table className="invoice-table">
                    <thead>
                        <tr>
                            <th className="th-desc">{t.itemDescription}</th>
                            <th className="th-qty">{t.quantity}</th>
                            <th className="th-price">{t.price}</th>
                            <th className="th-amount">{t.amount}</th>
                            <th className="th-action no-print"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <input
                                        type="text"
                                        className="item-desc"
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        placeholder={t.itemDescription}
                                        aria-label={t.itemDescription}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="item-qty"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                        placeholder={t.quantity}
                                        aria-label={t.quantity}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="item-price"
                                        value={item.price}
                                        onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                                        placeholder={t.price}
                                        aria-label={t.price}
                                    />
                                </td>
                                <td className="item-amount">
                                    {formatCurrency(item.quantity * item.price)}
                                </td>
                                <td className="no-print">
                                    <button className="remove-btn" onClick={() => handleRemoveItem(item.id)} title="Remove Item" aria-label="Remove Item">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="invoice-footer no-print">
                    <button className="add-item-btn" onClick={handleAddItem}>
                        <Plus size={16} /> {t.addItem}
                    </button>
                </div>

                <div className="invoice-totals">
                    <div className="total-row">
                        <span>{t.subtotal}:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {addTax && (
                        <>
                            <div className="total-row">
                                <span>{t.tps}:</span>
                                <span>{formatCurrency(tps)}</span>
                            </div>
                            <div className="total-row">
                                <span>{t.tvq}:</span>
                                <span>{formatCurrency(tvq)}</span>
                            </div>
                        </>
                    )}
                    <div className="total-row grand-total">
                        <span>{type === 'quote' ? 'Total Est.' : t.total}:</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>

                <div className="invoice-thank-you">
                    <p>{t.thankYou}</p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
