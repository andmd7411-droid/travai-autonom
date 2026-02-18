import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

interface PDFInvoiceData {
    type: 'invoice' | 'quote';
    number: string;
    date: string;
    company: {
        name: string;
        address: string;
        phone: string;
        email: string;
        taxId: string;
    };
    client: {
        name: string;
        address: string;
    };
    items: {
        description: string;
        quantity: number;
        price: number;
    }[];
    totals: {
        subtotal: number;
        tps: number;
        tvq: number;
        total: number;
    };
    lang: Record<string, string>;
}

export const generateInvoicePDF = async (data: PDFInvoiceData) => {
    const doc = new jsPDF();
    const { lang } = data;

    // Company Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(data.company.name || lang.companyName, 20, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.company.address || '', 20, 37);
    doc.text(data.company.phone || '', 20, 42);
    doc.text(data.company.email || '', 20, 47);
    if (data.company.taxId) doc.text(`Tax ID: ${data.company.taxId}`, 20, 52);

    // Invoice Title & Info
    doc.setFontSize(28);
    doc.setTextColor(0);
    doc.text(lang.invoice, 140, 30);

    doc.setFontSize(10);
    doc.text(`${lang.date}: ${data.date}`, 140, 40);
    doc.text(`${lang.invoiceNumber}: ${data.number}`, 140, 45);

    // Bill To
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(lang.billTo, 20, 70);
    doc.setFontSize(10);
    doc.text(data.client.name, 20, 77);
    doc.text(data.client.address || '', 20, 82);

    // Table
    const tableData = data.items.map(item => [
        item.description,
        item.quantity.toString(),
        `$${item.price.toFixed(2)}`,
        `$${(item.quantity * item.price).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 95,
        head: [[lang.item, lang.qty, lang.price, lang.total]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] }
    } as UserOptions);

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    const rightMargin = 190;
    doc.text(`${lang.subtotal}:`, 140, finalY);
    doc.text(`$${data.totals.subtotal.toFixed(2)}`, rightMargin, finalY, { align: 'right' });

    doc.text(`${lang.tps}:`, 140, finalY + 7);
    doc.text(`$${data.totals.tps.toFixed(2)}`, rightMargin, finalY + 7, { align: 'right' });

    doc.text(`${lang.tvq}:`, 140, finalY + 14);
    doc.text(`$${data.totals.tvq.toFixed(2)}`, rightMargin, finalY + 14, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`${lang.total}:`, 140, finalY + 25);
    doc.text(`$${data.totals.total.toFixed(2)}`, rightMargin, finalY + 25, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(lang.thankYou, 105, 280, { align: 'center' });

    doc.save(`${data.type}_${data.number}.pdf`);
};
