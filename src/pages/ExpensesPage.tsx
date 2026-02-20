import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Trash2, Tag, DollarSign, Camera, X, CheckCircle, TrendingUp, TrendingDown, Loader } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';
import type { Expense } from '../types';
import '../styles/ExpensesPage.css';

const CATEGORIES = ['materials', 'fuel', 'rent', 'food', 'other'] as const;

// ─── OCR: extract the largest dollar amount from text ───
function extractAmount(text: string): number | null {
    // Match patterns like: $12.50, 12,50, 12.50, TOTAL 12.50, etc.
    const patterns = [
        /TOTAL[^\d]*(\d[\d\s,.']*\d)/gi,
        /MONTANT[^\d]*(\d[\d\s,.']*\d)/gi,
        /\$\s*(\d[\d,.']*)/g,
        /(\d{1,6}[.,]\d{2})/g,
    ];

    const amounts: number[] = [];

    for (const pattern of patterns) {
        let match;
        const re = new RegExp(pattern.source, pattern.flags);
        while ((match = re.exec(text)) !== null) {
            const raw = match[1].replace(/\s/g, '').replace(',', '.');
            const val = parseFloat(raw);
            if (!isNaN(val) && val > 0 && val < 100000) {
                amounts.push(val);
            }
        }
    }

    if (amounts.length === 0) return null;
    // Return the largest amount found (likely the total)
    return Math.max(...amounts);
}

const ExpensesPage: React.FC = () => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>(CATEGORIES[0]);
    const [description, setDescription] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
    // Tags state
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    // Tag filter
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

    // Receipt scanner state
    const [scanning, setScanning] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
    const [scannedAmount, setScannedAmount] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);

    const expenses = useLiveQuery(() =>
        db.expenses.orderBy('date').reverse().toArray()
    );

    const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray());
    const recurringItems = useLiveQuery(() => db.recurringItems.where('active').equals(1).toArray());

    // ─── #7 Auto-generate recurring expenses ───
    useEffect(() => {
        if (!recurringItems) return;
        const now = new Date();
        recurringItems.forEach(async (item) => {
            let next = new Date(item.nextDate);
            while (next <= now) {
                if (item.type === 'expense') {
                    await db.expenses.add({
                        amount: item.amount,
                        category: item.category,
                        description: `[Récurrent] ${item.title}`,
                        date: new Date(next),
                        title: item.title,
                        projectId: item.projectId,
                        tags: ['récurrent']
                    });
                }
                // Advance nextDate
                const advanced = new Date(next);
                if (item.frequency === 'weekly') advanced.setDate(advanced.getDate() + 7);
                else if (item.frequency === 'monthly') advanced.setMonth(advanced.getMonth() + 1);
                else advanced.setFullYear(advanced.getFullYear() + 1);
                next = advanced;
            }
            // Update nextDate in DB
            await db.recurringItems.update(item.id!, { nextDate: next, lastGeneratedDate: now });
        });
    }, [recurringItems]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        await db.expenses.add({
            amount: parseFloat(amount),
            category,
            description,
            date: new Date(),
            title: description || category,
            projectId: selectedProjectId,
            receiptPhoto: receiptBlob || undefined,
            tags: tags.length > 0 ? tags : undefined
        });

        setAmount('');
        setDescription('');
        setSelectedProjectId(undefined);
        setReceiptBlob(null);
        setReceiptPreview(null);
        setTags([]);
        setTagInput('');
        setShowForm(false);
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteExpense)) {
            db.expenses.delete(id);
        }
    };

    // ─── Receipt photo handler ───
    const handleReceiptPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview
        const url = URL.createObjectURL(file);
        setReceiptPreview(url);
        setReceiptBlob(file);
        setScanning(true);
        setOcrError(null);
        setShowConfirm(false);

        try {
            // Dynamic import to avoid bundle bloat
            const Tesseract = await import('tesseract.js');
            const result = await Tesseract.recognize(file, 'fra+eng', {
                logger: () => { }, // suppress logs
                // @ts-ignore
                tessedit_pageseg_mode: '6', // Assume a single uniform block of text
            });

            const text = result.data.text;
            const found = extractAmount(text);

            if (found !== null) {
                setScannedAmount(found);
                setShowConfirm(true);
            } else {
                setOcrError('Montant non détecté. Entrez-le manuellement.');
                setShowForm(true);
            }
        } catch {
            setOcrError('Erreur de scan. Entrez le montant manuellement.');
            setShowForm(true);
        } finally {
            setScanning(false);
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Confirm scanned amount as expense ───
    const confirmAsExpense = async () => {
        if (scannedAmount === null) return;
        await db.expenses.add({
            amount: scannedAmount,
            category: 'other',
            description: 'Reçu scanné',
            date: new Date(),
            title: 'Reçu scanné',
            receiptPhoto: receiptBlob || undefined
        });
        resetScanner();
    };

    // ─── Confirm scanned amount as income (work session) ───
    const confirmAsIncome = async () => {
        if (scannedAmount === null) return;
        // Add as a work session with totalEarned
        await db.workSessions.add({
            startTime: new Date(),
            endTime: new Date(),
            hourlyRate: 0,
            totalEarned: scannedAmount,
            duration: 0,
            notes: 'Revenu scanné depuis reçu'
        });
        resetScanner();
    };

    const resetScanner = () => {
        setScannedAmount(null);
        setShowConfirm(false);
        setReceiptPreview(null);
        setReceiptBlob(null);
        setOcrError(null);
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

            {/* ─── FAB buttons row ─── */}
            <div className="expenses-fab-row">
                <button className="add-fab" onClick={() => setShowForm(!showForm)} aria-label="Ajouter dépense">
                    <Plus size={24} style={{ transform: showForm ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                <button
                    className="scan-fab"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Scanner reçu"
                    disabled={scanning}
                >
                    {scanning ? <Loader size={22} className="spin-icon" /> : <Camera size={22} />}
                </button>
                {/* Hidden file input — accepts camera or gallery */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptPhoto}
                    style={{ display: 'none' }}
                    aria-label="Photo reçu"
                />
            </div>

            {/* ─── OCR Error ─── */}
            {ocrError && (
                <div className="ocr-error glass-panel">
                    <span>{ocrError}</span>
                    <button onClick={() => setOcrError(null)} aria-label="Fermer"><X size={16} /></button>
                </div>
            )}

            {/* ─── Scanning indicator ─── */}
            {scanning && (
                <div className="ocr-scanning glass-panel">
                    <Loader size={20} className="spin-icon" />
                    <span>Analyse du reçu en cours...</span>
                </div>
            )}

            {/* ─── Confirm scanned amount ─── */}
            {showConfirm && scannedAmount !== null && (
                <div className="ocr-confirm glass-panel">
                    {receiptPreview && (
                        <img src={receiptPreview} alt="Reçu" className="receipt-thumb" />
                    )}
                    <div className="ocr-confirm-amount">
                        Montant détecté: <strong>{formatCurrency(scannedAmount)}</strong>
                    </div>
                    <p className="ocr-confirm-question">Ajouter comme:</p>
                    <div className="ocr-confirm-btns">
                        <button className="ocr-btn expense-btn" onClick={confirmAsExpense}>
                            <TrendingDown size={18} />
                            Dépense
                        </button>
                        <button className="ocr-btn income-btn" onClick={confirmAsIncome}>
                            <TrendingUp size={18} />
                            Revenu
                        </button>
                    </div>
                    <button className="ocr-cancel-btn" onClick={resetScanner}>
                        <X size={14} /> Annuler
                    </button>
                </div>
            )}

            {/* ─── Manual form ─── */}
            {showForm && (
                <form className="expense-form glass-panel" onSubmit={handleAdd}>
                    <h3>{t.addExpense}</h3>

                    {receiptPreview && (
                        <div className="receipt-preview-row">
                            <img src={receiptPreview} alt="Reçu" className="receipt-thumb-small" />
                            <span>Photo jointe</span>
                            <button type="button" onClick={() => { setReceiptPreview(null); setReceiptBlob(null); }} aria-label="Retirer photo">
                                <X size={14} />
                            </button>
                        </div>
                    )}

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

                    {/* Tags input */}
                    <div className="form-group tags-input-group">
                        <div className="tags-chips">
                            {tags.map(tag => (
                                <span key={tag} className="tag-chip">
                                    #{tag}
                                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} aria-label={`Retirer ${tag}`}>
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="tag-input-row">
                            <Tag size={14} />
                            <input
                                type="text"
                                placeholder="Ajouter un tag (Entrée)"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => {
                                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                                        e.preventDefault();
                                        const newTag = tagInput.trim().replace(/^#/, '');
                                        if (!tags.includes(newTag)) setTags([...tags, newTag]);
                                        setTagInput('');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="save-btn">{t.save}</button>
                </form>
            )}

            <div className="expenses-list">
                {/* Tag filter bar */}
                {(() => {
                    const allTags = Array.from(new Set(expenses?.flatMap(e => e.tags || []) || []));
                    return allTags.length > 0 ? (
                        <div className="tag-filter-bar">
                            <button
                                className={`tag-filter-chip ${activeTagFilter === null ? 'active' : ''}`}
                                onClick={() => setActiveTagFilter(null)}
                            >Tous</button>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    className={`tag-filter-chip ${activeTagFilter === tag ? 'active' : ''}`}
                                    onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                                >#{tag}</button>
                            ))}
                        </div>
                    ) : null;
                })()}
                {expenses?.filter(e => !activeTagFilter || (e.tags || []).includes(activeTagFilter)).map(expense => {
                    const normalizedCategory = LegacyCategoryMap[expense.category] || expense.category;
                    const label = t.categories[normalizedCategory as keyof typeof t.categories] || expense.category;

                    return (
                        <div key={expense.id} className="expense-item glass-panel">
                            <div className="expense-left">
                                <div className="expense-cat">{label}</div>
                                <div className="expense-desc">{expense.description}</div>
                                {expense.tags && expense.tags.length > 0 && (
                                    <div className="expense-tags">
                                        {expense.tags.map(tag => <span key={tag} className="expense-tag">#{tag}</span>)}
                                    </div>
                                )}
                                <div className="expense-date">{expense.date.toLocaleDateString()}</div>
                            </div>
                            <div className="expense-right">
                                {expense.receiptPhoto && (
                                    <button
                                        className="receipt-view-btn"
                                        onClick={() => {
                                            const url = URL.createObjectURL(expense.receiptPhoto!);
                                            window.open(url, '_blank');
                                        }}
                                        aria-label="Voir reçu"
                                        title="Voir le reçu"
                                    >
                                        <CheckCircle size={16} color="#10b981" />
                                    </button>
                                )}
                                <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                                <button className="delete-btn" onClick={() => handleDelete(expense.id!)} aria-label="Supprimer">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExpensesPage;
