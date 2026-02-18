import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import '../styles/ExpensesPage.css';
import { Plus, Trash2, Tag, DollarSign, Camera, Paperclip, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';
import type { Expense } from '../types';
import '../styles/ExpensesPage.css';

const CATEGORIES = ['materials', 'fuel', 'rent', 'food', 'other'] as const;

const ExpensesPage: React.FC = () => {
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>(CATEGORIES[0]);
    const [description, setDescription] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
    const [receiptPhoto, setReceiptPhoto] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null); // URL for modal
    const [isScanning, setIsScanning] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleOCR = async (file: File) => {
        setIsScanning(true);
        try {
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(file);
            console.log('OCR text:', text);

            const amountMatches = text.match(/\d+[.,]\d{2}/g);
            if (amountMatches) {
                const amounts = amountMatches.map(a => parseFloat(a.replace(',', '.')));
                const maxAmount = Math.max(...amounts);
                if (!isNaN(maxAmount)) {
                    setAmount(maxAmount.toString());
                }
            }

            const lines = text.split('\n').filter(l => l.trim().length > 3);
            if (lines.length > 0) {
                setDescription(lines[0].trim().slice(0, 50));
            }

            await worker.terminate();
        } catch (error) {
            console.error('OCR failed:', error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReceiptPhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
            handleOCR(file);
        }
    };

    const expenses = useLiveQuery(() =>
        db.expenses.orderBy('date').reverse().toArray()
    );

    const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray());

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        await db.expenses.add({
            amount: parseFloat(amount),
            category,
            description,
            date: new Date(),
            title: description || category, // fallback
            projectId: selectedProjectId,
            receiptPhoto: receiptPhoto || undefined
        });

        setAmount('');
        setDescription('');
        setSelectedProjectId(undefined);
        setReceiptPhoto(null);
        setPreviewUrl(null);
        setShowForm(false);
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteExpense)) {
            db.expenses.delete(id);
        }
    };

    const total = expenses?.reduce((acc: number, curr: Expense) => acc + curr.amount, 0) || 0;

    const LegacyCategoryMap: Record<string, string> = {
        'Materiale': 'materials',
        'Benzină': 'fuel',
        'Chirie': 'rent',
        'Mâncare': 'food',
        'Altele': 'other'
    };

    return (
        <div className="page-container expenses-page">
            <div className="header-summary glass-panel">
                <span className="label">{t.totalExpenses}</span>
                <span className="amount-total">{formatCurrency(total)}</span>
            </div>

            <button className="add-fab" onClick={() => setShowForm(!showForm)} aria-label="Adauga cheltuiala">
                <Plus size={24} style={{ transform: showForm ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showForm && (
                <form className="expense-form glass-panel" onSubmit={handleAdd}>
                    <h3>{t.addExpense}</h3>

                    <div className="form-group">
                        <DollarSign size={18} />
                        <input
                            type="number"
                            placeholder={`${t.amount} ($)`}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <Tag size={18} />
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(Number(e.target.value) || undefined)}
                            aria-label={t.projects || "Projects"}
                            className="project-dropdown-small"
                        >
                            <option value="">{t.select || "No Project"}</option>
                            {projects?.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <Tag size={18} />
                        <select value={category} onChange={e => setCategory(e.target.value)} aria-label={t.category}>
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>
                                    {t.categories[c as keyof typeof t.categories]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <input
                            type="text"
                            placeholder={t.description}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Camera / Receipt Upload */}
                    <div className="form-group receipt-upload-group">
                        <input
                            id="receipt-upload"
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden-file-input"
                            title="Upload Receipt"
                        />
                        <button
                            type="button"
                            className={`img-btn ${isScanning ? 'scanning' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                        >
                            {isScanning ? <RefreshCw className="spin" size={18} /> : <Camera size={18} />}
                            <span>{isScanning ? 'Scanning...' : (previewUrl ? 'Change Photo' : 'Add Receipt Photo')}</span>
                        </button>
                        {previewUrl && (
                            <div className="image-preview-container">
                                <img src={previewUrl} alt="Preview" className="image-preview-item" />
                            </div>
                        )}
                    </div>

                    <button type="submit" className="save-btn">{t.save}</button>
                </form>
            )}

            <div className="expenses-list">
                {expenses?.map(expense => {
                    const normalizedCategory = LegacyCategoryMap[expense.category] || expense.category;
                    const label = t.categories[normalizedCategory as keyof typeof t.categories] || expense.category;

                    return (
                        <div key={expense.id} className="expense-item glass-panel">
                            <div className="expense-left">
                                <div className="expense-cat">
                                    {label}
                                    {expense.receiptPhoto && (
                                        <button
                                            onClick={() => setViewingReceipt(URL.createObjectURL(expense.receiptPhoto!))}
                                            className="receipt-view-btn"
                                            title="View Receipt"
                                        >
                                            <Paperclip size={14} color="var(--color-primary)" />
                                        </button>
                                    )}
                                </div>
                                <div className="expense-desc">{expense.description}</div>
                                <div className="expense-date">{expense.date.toLocaleDateString()}</div>
                            </div>
                            <div className="expense-right">
                                <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                                <button className="delete-btn" onClick={() => handleDelete(expense.id!)} aria-label="Sterge">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Receipt Modal */}
            {viewingReceipt && (
                <div
                    className="receipt-modal-overlay"
                    onClick={() => setViewingReceipt(null)}
                >
                    <img src={viewingReceipt} alt="Receipt" className="receipt-modal-image" />
                </div>
            )}
        </div>
    );
};

export default ExpensesPage;
