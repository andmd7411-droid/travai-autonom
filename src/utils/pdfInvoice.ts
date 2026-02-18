import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './format';

interface InvoiceData {
    type: 'invoice' | 'quote';
    number: string;
    date: string;
    company: {
        name: string;
        address: string;
        phone: string;
        email?: string;
        taxId?: string;
        logoUrl?: string; // Data URL or valid Image URL
    };
    client: {
        name: string;
        address: string; // Multi-line address/details
    };
    items: {
        description: string;
        quantity: number;
        price: number;
    }[];
    totals: {
        subtotal: number;
        tps?: number;
        tvq?: number;
        total: number;
    };
    lang: {
        invoice: string;
        quote: string;
        date: string;
        billTo: string;
        item: string;
        qty: string;
        price: string;
        total: string;
        subtotal: string;
        tps: string;
        tvq: string;
        thankYou: string;
    };
}

export const generateInvoicePDF = async (data: InvoiceData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Helper for right alignment
    const rightAlign = (text: string, y: number) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, pageWidth - margin - textWidth, y);
    };

    // --- Header ---
    let yPos = 20;

    // Logo (if available) - Simplified handling, normally requires base64 or pre-loaded image
    // For now we skip actual image rendering unless passed as base64 to avoid CORS/Async complexity in this step
    // If logoUrl is provided and is data uri, we could try:
    /* if (data.company.logoUrl && data.company.logoUrl.startsWith('data:image')) {
        doc.addImage(data.company.logoUrl, 'JPEG', margin, yPos, 30, 30);
    } */

    // Company Info (Left)
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(data.company.name || 'Company Name', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const splitAddress = doc.splitTextToSize(data.company.address || '', 80);
    doc.text(splitAddress, margin, yPos);
    yPos += (splitAddress.length * 5); // spacing based on lines

    if (data.company.phone) {
        doc.text(data.company.phone, margin, yPos);
        yPos += 5;
    }
    if (data.company.email) {
        doc.text(data.company.email, margin, yPos);
        yPos += 5;
    }
    if (data.company.taxId) {
        doc.text(`Tax ID: ${data.company.taxId}`, margin, yPos);
    }

    // Invoice Meta (Right)
    yPos = 20; // Reset Y for right column
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    const title = data.type === 'invoice' ? data.lang.invoice : data.lang.quote;
    rightAlign(title, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    rightAlign(`# ${data.number}`, yPos);

    yPos += 5;
    rightAlign(`${data.lang.date}: ${data.date}`, yPos);

    // --- Bill To ---
    yPos = 70;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(data.lang.billTo, margin, yPos);

    yPos += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.client.name || 'Client Name', margin, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const splitClientAddress = doc.splitTextToSize(data.client.address || '', 80);
    doc.text(splitClientAddress, margin, yPos);

    // --- Table ---
    yPos = 100;

    const tableBody = data.items.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.quantity * item.price)
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [[data.lang.item, data.lang.qty, data.lang.price, data.lang.total]],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 20, halign: 'center' }, // Qty
            2: { cellWidth: 30, halign: 'right' }, // Price
            3: { cellWidth: 30, halign: 'right' } // Total
        },
    });

    // --- Totals ---
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 10;

    const addTotalRow = (label: string, value: string, isBold: boolean = false) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(isBold ? 11 : 10);
        doc.setTextColor(0, 0, 0);

        doc.text(label, pageWidth - margin - 60, finalY);
        rightAlign(value, finalY);
        finalY += 7;
    };

    addTotalRow(data.lang.subtotal, formatCurrency(data.totals.subtotal));

    if (data.totals.tps) {
        addTotalRow(data.lang.tps, formatCurrency(data.totals.tps));
    }
    if (data.totals.tvq) {
        addTotalRow(data.lang.tvq, formatCurrency(data.totals.tvq));
    }

    finalY += 2;
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 70, finalY - 6, pageWidth - margin, finalY - 6);

    addTotalRow(data.lang.total, formatCurrency(data.totals.total), true);

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(data.lang.thankYou, pageWidth / 2, pageHeight - 30, { align: 'center' });

    // Save
    doc.save(`Invoice_${data.number}.pdf`);
};
