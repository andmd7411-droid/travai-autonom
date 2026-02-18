import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Trash2, Tag, DollarSign } from 'lucide-react';
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
            projectId: selectedProjectId
        });

        setAmount('');
        setDescription('');
        setSelectedProjectId(undefined);
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
            {/* ... header and form ... */}
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
        </div>
    );

};

export default ExpensesPage;
