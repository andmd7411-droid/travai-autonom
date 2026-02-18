import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './format';

export const exportToCSV = (data: unknown[], filename: string) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = Object.keys(data[0] as object);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = (row as Record<string, unknown>)[header];
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (typeof value === 'string') {
                // Escape quotes and wrap in quotes
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const exportToPDF = (data: unknown[], filename: string, title: string, type: 'work' | 'expenses' | 'mileage' | 'clients') => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let head: string[][] = [];
    let body: (string | number)[][] = [];

    switch (type) {
        case 'work':
            head = [['Date', 'Start Time', 'End Time', 'Duration (h)', 'Earned']];
            body = (data as Record<string, unknown>[]).map(item => [
                new Date(item.startTime as string).toLocaleDateString(),
                new Date(item.startTime as string).toLocaleTimeString(),
                item.endTime ? new Date(item.endTime as string).toLocaleTimeString() : '-',
                item.duration ? ((item.duration as number) / 3600000).toFixed(2) : '-',
                formatCurrency((item.totalEarned as number) || 0)
            ]);
            break;
        case 'expenses':
            head = [['Date', 'Category', 'Description', 'Amount']];
            body = (data as Record<string, unknown>[]).map(item => [
                new Date(item.date as string).toLocaleDateString(),
                item.category as string,
                item.description as string,
                formatCurrency(item.amount as number)
            ]);
            break;
        case 'mileage':
            head = [['Date', 'Start Address', 'End Address', 'Distance (km)', 'Purpose']];
            body = (data as Record<string, unknown>[]).map(item => [
                new Date(item.date as string).toLocaleDateString(),
                item.startAddress as string,
                item.endAddress as string,
                item.distance as string,
                item.purpose as string
            ]);
            break;
        case 'clients':
            head = [['Name', 'Phone', 'Email', 'Address']];
            body = (data as Record<string, unknown>[]).map(item => [
                item.name as string,
                item.phone as string,
                item.email as string,
                item.address as string
            ]);
            break;
    }

    autoTable(doc, {
        head: head,
        body: body,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(`${filename}.pdf`);
};
