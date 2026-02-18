import React, { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Upload, File, Trash2, FileText } from 'lucide-react';
import InvoiceGenerator from '../components/InvoiceGenerator';
import { useLanguage } from '../context/LanguageContext';
import type { DocumentItem } from '../types';
import '../styles/DocumentsPage.css';

const DocumentsPage: React.FC = () => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const documents = useLiveQuery(() =>
        db.documents.orderBy('date').reverse().limit(20).toArray()
    );

    const [showInvoice, setShowInvoice] = React.useState(false);
    const [generatorMode, setGeneratorMode] = React.useState<'invoice' | 'quote'>('invoice');

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const type = file.type.startsWith('image/') ? 'photo' : 'document';

            await db.documents.add({
                title: file.name,
                type,
                fileBlob: file,
                date: new Date(),
                tags: []
            });

            // Reset
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteDoc)) {
            db.documents.delete(id);
        }
    };

    const handleOpen = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    if (showInvoice) {
        return <InvoiceGenerator onBack={() => setShowInvoice(false)} initialType={generatorMode} />;
    }

    return (
        <div className="page-container documents-page">
            <div className="docs-header">
                <h2>{t.documents}</h2>
                <div className="header-actions">
                    <button className="invoice-btn" onClick={() => { setGeneratorMode('invoice'); setShowInvoice(true); }}>
                        <FileText size={20} />
                        <span>{t.createInvoice}</span>
                    </button>
                    <button className="invoice-btn quote-btn-purple" onClick={() => { setGeneratorMode('quote'); setShowInvoice(true); }}>
                        <FileText size={20} />
                        <span>Create Quote</span>
                    </button>
                    <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={20} />
                        <span>{t.upload}</span>
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden-file-input"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    aria-label={t.upload}
                    title={t.upload}
                />
            </div>

            <div className="docs-grid">
                {documents?.map((doc: DocumentItem) => (
                    <div key={doc.id} className="doc-card glass-panel" onClick={() => handleOpen(doc.fileBlob)}>
                        <div className="doc-preview">
                            {doc.type === 'photo' ? (
                                <img src={URL.createObjectURL(doc.fileBlob)} alt={doc.title} />
                            ) : (
                                <div className="doc-icon-placeholder">
                                    <File size={48} color="var(--color-primary)" />
                                </div>
                            )}
                        </div>
                        <div className="doc-info">
                            <div className="doc-title">{doc.title}</div>
                            <div className="doc-meta">
                                <span>{doc.date.toLocaleDateString()}</span>
                                <button
                                    className="doc-delete"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id!); }}
                                    aria-label={t.confirmDeleteDoc}
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

export default DocumentsPage;
