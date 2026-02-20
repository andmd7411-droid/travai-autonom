import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Upload, File, Trash2, Camera, Download, X, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { DocumentItem } from '../types';
import '../styles/DocumentsPage.css';

const DocumentsPage: React.FC = () => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Viewer modal
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState('');
    const [viewerBlob, setViewerBlob] = useState<Blob | null>(null);

    const documents = useLiveQuery(() =>
        db.documents.orderBy('date').reverse().limit(50).toArray()
    );

    // ─── Save file to DB ───
    const saveFile = async (file: File) => {
        const type = file.type.startsWith('image/') ? 'photo' : 'document';
        await db.documents.add({
            title: file.name,
            type,
            fileBlob: file,
            date: new Date(),
            tags: []
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await saveFile(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await saveFile(file);
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteDoc)) {
            db.documents.delete(id);
        }
    };

    // ─── Open document in viewer ───
    const handleOpen = (doc: DocumentItem) => {
        const url = URL.createObjectURL(doc.fileBlob);
        setViewerUrl(url);
        setViewerTitle(doc.title);
        setViewerBlob(doc.fileBlob);
    };

    const closeViewer = () => {
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        setViewerUrl(null);
        setViewerBlob(null);
    };

    // ─── Export document as PDF ───
    // For images: wrap in a printable page and trigger print-to-PDF
    // For PDFs: open directly (browser handles PDF printing)
    const handleExportPDF = async () => {
        if (!viewerBlob || !viewerUrl) return;

        const isImage = viewerBlob.type.startsWith('image/');

        if (isImage) {
            // Create a hidden iframe with the image formatted for print
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${viewerTitle}</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
                        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <img src="${viewerUrl}" alt="${viewerTitle}" onload="window.print(); window.close();" />
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            // For PDF files, open in new tab (user can print from there)
            window.open(viewerUrl, '_blank');
        }
    };

    // ─── Direct download ───
    const handleDownload = () => {
        if (!viewerBlob || !viewerTitle) return;
        const url = URL.createObjectURL(viewerBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewerTitle;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="page-container documents-page">
            {/* ─── Header with action buttons ─── */}
            <div className="docs-header">
                <h2>{t.documents}</h2>
                <div className="header-actions">
                    {/* Camera button */}
                    <button
                        className="doc-action-btn camera-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        title="Photographier un document"
                        aria-label="Photographier un document"
                    >
                        <Camera size={20} />
                        <span>Photo</span>
                    </button>

                    {/* Upload button */}
                    <button
                        className="doc-action-btn upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title={t.upload}
                        aria-label={t.upload}
                    >
                        <Upload size={20} />
                        <span>{t.upload}</span>
                    </button>
                </div>

                {/* Camera input — opens device camera directly */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden-file-input"
                    aria-label="Caméra"
                    title="Caméra"
                />

                {/* File upload input */}
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

            {/* ─── Documents grid ─── */}
            <div className="docs-grid">
                {(!documents || documents.length === 0) && (
                    <div className="docs-empty">
                        <FileText size={48} color="#94a3b8" />
                        <p>Aucun document. Photographiez ou importez un fichier.</p>
                    </div>
                )}
                {documents?.map((doc: DocumentItem) => (
                    <div key={doc.id} className="doc-card glass-panel" onClick={() => handleOpen(doc)}>
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

            {/* ─── Document Viewer Modal ─── */}
            {viewerUrl && (
                <div className="doc-viewer-overlay" onClick={closeViewer}>
                    <div className="doc-viewer-modal" onClick={e => e.stopPropagation()}>
                        {/* Viewer header */}
                        <div className="doc-viewer-header">
                            <span className="doc-viewer-title">{viewerTitle}</span>
                            <div className="doc-viewer-actions">
                                <button
                                    className="doc-viewer-btn pdf-btn"
                                    onClick={handleExportPDF}
                                    title="Exporter en PDF"
                                    aria-label="Exporter en PDF"
                                >
                                    <Download size={18} />
                                    <span>PDF</span>
                                </button>
                                <button
                                    className="doc-viewer-btn download-btn"
                                    onClick={handleDownload}
                                    title="Télécharger"
                                    aria-label="Télécharger"
                                >
                                    <Download size={18} />
                                    <span>Sauvegarder</span>
                                </button>
                                <button
                                    className="doc-viewer-btn close-btn"
                                    onClick={closeViewer}
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Viewer content */}
                        <div className="doc-viewer-content">
                            {viewerBlob?.type.startsWith('image/') ? (
                                <img src={viewerUrl} alt={viewerTitle} className="doc-viewer-image" />
                            ) : (
                                <iframe
                                    src={viewerUrl}
                                    title={viewerTitle}
                                    className="doc-viewer-iframe"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
