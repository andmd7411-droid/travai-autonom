import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Plus, Trash2, Printer, Download, Share } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { generateInvoicePDF } from '../utils/pdfInvoice';
import '../styles/InvoiceGenerator.css';

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
}

interface InvoiceGeneratorProps {
    onBack?: () => void;
    initialType?: 'invoice' | 'quote';
    projectId?: string;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ onBack, initialType = 'invoice', projectId: propProjectId }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = propProjectId || searchParams.get('projectId');
    const isInitialized = useRef(false);

    const project = useLiveQuery(() =>
        projectId ? db.projects.get(Number(projectId)) : undefined
        , [projectId]);

    const activeSessions = useLiveQuery(() =>
        projectId ? db.workSessions.where('projectId').equals(Number(projectId)).toArray() : []
        , [projectId]);

    const activeExpenses = useLiveQuery(() =>
        projectId ? db.expenses.where('projectId').equals(Number(projectId)).toArray() : []
        , [projectId]);

    const clients = useLiveQuery(() => db.clients.toArray());

    const [companyProfile] = useState(() => {
        const saved = localStorage.getItem('companyProfile');
        return saved ? JSON.parse(saved) : {};
    });

    const [type, setType] = useState<'invoice' | 'quote'>(initialType);
    const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [addTax] = useState(true);

    // Editable company fields
    const [compName, setCompName] = useState(companyProfile.name || '');
    const [compAddress, setCompAddress] = useState(companyProfile.address || '');
    const [compPhone, setCompPhone] = useState(companyProfile.phone || '');
    const [compEmail, setCompEmail] = useState(companyProfile.email || '');
    const [compTaxId, setCompTaxId] = useState(companyProfile.taxId || '');

    useEffect(() => {
        if (!isInitialized.current && (activeSessions?.length || activeExpenses?.length || project)) {
            const initialItems: InvoiceItem[] = [];

            if (activeSessions && activeSessions.length > 0) {
                const totalHours = activeSessions.reduce((acc, s) => acc + (s.duration || 0) / 3600000, 0);
                initialItems.push({
                    id: '1',
                    description: `${t.work} - ${project?.name || ''}`,
                    quantity: Number(totalHours.toFixed(2)),
                    price: project?.hourlyRate || 0
                });
            }

            if (activeExpenses) {
                activeExpenses.forEach((exp, idx) => {
                    initialItems.push({
                        id: `exp-${idx}`,
                        description: exp.description || exp.category,
                        quantity: 1,
                        price: exp.amount
                    });
                });
            }

            setItems(initialItems);

            if (project?.clientId) {
                db.clients.get(project.clientId).then(c => {
                    if (c) {
                        setClientName(c.name);
                        setClientAddress(`${c.address || ''}\n${c.email || ''}`);
                    }
                });
            }

            isInitialized.current = true;
        }
    }, [activeSessions, activeExpenses, project, t]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const total = subtotal + tps + tvq;

    const handleGenerate = async () => {
        const invoiceData = {
            type,
            number: invoiceNumber,
            date,
            company: {
                name: compName,
                address: compAddress,
                phone: compPhone,
                email: compEmail,
                taxId: compTaxId,
            },
            client: {
                name: clientName,
                address: clientAddress,
            },
            items: items.map(i => ({ description: i.description, quantity: i.quantity, price: i.price })),
            totals: {
                subtotal,
                tps: addTax ? tps : 0,
                tvq: addTax ? tvq : 0,
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
                thankYou: t.thankYou,
                invoiceNumber: t.invoiceNumber
            }
        };

        await generateInvoicePDF(invoiceData);

        // Save to DB
        await db.invoices.add({
            invoiceNumber,
            date: new Date(date),
            type,
            status: 'sent',
            clientName,
            projectId: projectId ? Number(projectId) : undefined,
            items: items.map(i => ({ description: i.description, quantity: i.quantity, price: i.price })),
            totals: { subtotal, tps, tvq, total }
        });

        navigate('/invoices');
    };

    const handleEmail = () => {
        const subject = `${type === 'invoice' ? t.invoice : 'Quote'} #${invoiceNumber}`;
        const body = `Please find attached ${type} #${invoiceNumber}.\nTotal: ${formatCurrency(total)}\n\nThank you!`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="page-container invoice-generator-full">
            <header className="page-header no-print">
                <button className="back-btn" onClick={() => onBack ? onBack() : navigate(-1)} title={t.backToHome}>
                    <ArrowLeft size={20} />
                </button>
                <h2>{t.createInvoice}</h2>
                <div className="header-actions">
                    <button className="icon-btn" onClick={handleEmail} title={t.sendEmail}><Share size={20} /></button>
                    <button className="icon-btn" onClick={() => window.print()} title={t.print}><Printer size={20} /></button>
                    <button className="save-btn" onClick={handleGenerate}>
                        <Download size={18} />
                        <span>{t.print}</span>
                    </button>
                </div>
            </header>

            <div className="invoice-paper glass-panel">
                <div className="paper-header">
                    <div className="company-info">
                        <input className="input-title" value={compName} onChange={e => setCompName(e.target.value)} placeholder={t.companyName} title={t.companyName} />
                        <textarea value={compAddress} onChange={e => setCompAddress(e.target.value)} placeholder={t.companyAddress} title={t.companyAddress} />
                        <input value={compPhone} onChange={e => setCompPhone(e.target.value)} placeholder={t.profilePhone} title="Phone" />
                        <input value={compEmail} onChange={e => setCompEmail(e.target.value)} placeholder={t.profileEmail} title="Email" />
                        <input value={compTaxId} onChange={e => setCompTaxId(e.target.value)} placeholder={t.profileTaxId} title="Tax ID" />
                    </div>
                    <div className="doc-meta">
                        <select value={type} onChange={e => setType(e.target.value as 'invoice' | 'quote')} className="type-select" title="Document Type">
                            <option value="invoice">{t.invoice}</option>
                            <option value="quote">{t.quote || 'QUOTE'}</option>
                        </select>
                        <div className="meta-row">
                            <label htmlFor="inv-num">#</label>
                            <input id="inv-num" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} title={t.invoiceNumber} />
                        </div>
                        <div className="meta-row">
                            <label htmlFor="inv-date">{t.date}</label>
                            <input id="inv-date" type="date" value={date} onChange={e => setDate(e.target.value)} title={t.date} />
                        </div>
                    </div>
                </div>

                <div className="bill-to-section">
                    <h3>{t.billTo}</h3>
                    <div className="client-picker no-print">
                        <select onChange={e => {
                            const c = clients?.find(cl => cl.id === Number(e.target.value));
                            if (c) {
                                setClientName(c.name);
                                setClientAddress(`${c.address || ''}\n${c.email || ''}`);
                            }
                        }} defaultValue="" title="Select Client">
                            <option value="" disabled>Select Client...</option>
                            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <input className="input-bold" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t.clientName} title={t.clientName} />
                    <textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder={t.companyAddress} title="Client Address" />
                </div>

                <table className="items-table">
                    <thead>
                        <tr>
                            <th>{t.itemDescription}</th>
                            <th>{t.quantity}</th>
                            <th>{t.price}</th>
                            <th>{t.total}</th>
                            <th className="no-print"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id}>
                                <td><input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} aria-label={t.itemDescription} /></td>
                                <td><input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} aria-label={t.quantity} /></td>
                                <td><input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value))} aria-label={t.price} /></td>
                                <td className="text-right">{formatCurrency(item.quantity * item.price)}</td>
                                <td className="no-print">
                                    <button className="delete-btn" onClick={() => handleRemoveItem(item.id)} title="Delete"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button className="add-item-btn no-print" onClick={handleAddItem}><Plus size={16} /> {t.addItem}</button>

                <div className="invoice-summary">
                    <div className="summary-row"><span>{t.subtotal}</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="summary-row"><span>{t.tps}</span><span>{formatCurrency(tps)}</span></div>
                    <div className="summary-row"><span>{t.tvq}</span><span>{formatCurrency(tvq)}</span></div>
                    <div className="summary-row grand-total"><span>{t.total}</span><span>{formatCurrency(total)}</span></div>
                </div>

                <div className="thank-you">{t.thankYou}</div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
