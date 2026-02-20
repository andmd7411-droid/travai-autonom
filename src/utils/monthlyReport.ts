import { db } from '../db/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * #16 Monthly Report — generates a PDF report for a given month
 */
export async function generateMonthlyReport(year: number, month: number): Promise<void> {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const MONTH_NAMES_FR = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Fetch data
    const sessions = await db.workSessions
        .filter(s => new Date(s.startTime) >= start && new Date(s.startTime) <= end)
        .toArray();

    const expenses = await db.expenses
        .filter(e => new Date(e.date) >= start && new Date(e.date) <= end)
        .toArray();

    const invoices = await db.invoices
        .filter(i => new Date(i.date) >= start && new Date(i.date) <= end)
        .toArray();

    // Calculations
    const totalRevenue = sessions.reduce((acc, s) => acc + (s.totalEarned || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netIncome = totalRevenue - totalExpenses;
    const totalHours = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600000;

    const fmt = (n: number) => `${n.toFixed(2)} $`;

    const doc = new jsPDF();
    const title = `Rapport mensuel — ${MONTH_NAMES_FR[month]} ${year}`;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text('Travai Autonom', 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`, 14, 38);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Résumé', 14, 50);

    autoTable(doc, {
        startY: 54,
        head: [['Indicateur', 'Valeur']],
        body: [
            ['Heures travaillées', `${totalHours.toFixed(1)} h`],
            ['Revenus bruts', fmt(totalRevenue)],
            ['Dépenses totales', fmt(totalExpenses)],
            ['Revenu net', fmt(netIncome)],
            ['Factures émises', invoices.length.toString()],
        ],
        headStyles: { fillColor: [99, 102, 241] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Work sessions
    if (sessions.length > 0) {
        const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Sessions de travail', 14, y);
        autoTable(doc, {
            startY: y + 4,
            head: [['Date', 'Durée (h)', 'Revenu']],
            body: sessions.map(s => [
                new Date(s.startTime).toLocaleDateString('fr-CA'),
                ((s.duration || 0) / 3600000).toFixed(2),
                fmt(s.totalEarned || 0),
            ]),
            headStyles: { fillColor: [16, 185, 129] },
        });
    }

    // Expenses
    if (expenses.length > 0) {
        const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Dépenses', 14, y);
        autoTable(doc, {
            startY: y + 4,
            head: [['Date', 'Description', 'Catégorie', 'Montant']],
            body: expenses.map(e => [
                new Date(e.date).toLocaleDateString('fr-CA'),
                e.title || e.description || '',
                e.category,
                fmt(e.amount),
            ]),
            headStyles: { fillColor: [239, 68, 68] },
        });
    }

    // Save
    doc.save(`rapport-${MONTH_NAMES_FR[month].toLowerCase()}-${year}.pdf`);
}
