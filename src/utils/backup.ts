import { db } from '../db/db';

export const exportData = async () => {
    try {
        const workSessions = await db.workSessions.toArray();
        const expenses = await db.expenses.toArray();
        const clients = await db.clients.toArray();
        const mileage = await db.mileage.toArray();
        const jobs = await db.jobs.toArray();

        const data = {
            version: 1,
            timestamp: new Date().toISOString(),
            workSessions,
            expenses,
            clients,
            mileage,
            jobs
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `travai-autonom-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

export const importData = async (file: File) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const json = e.target?.result as string;
                if (!json) throw new Error('Empty file');

                const data = JSON.parse(json);

                // Basic validation
                if (!data.workSessions || !data.expenses) {
                    throw new Error('Invalid backup file format');
                }

                await db.transaction('rw', [db.workSessions, db.expenses, db.clients, db.mileage, db.jobs], async () => {
                    // Clear existing data
                    await db.workSessions.clear();
                    await db.expenses.clear();
                    await db.clients.clear();
                    await db.mileage.clear();
                    await db.jobs.clear();

                    // Import new data
                    if (data.workSessions?.length) await db.workSessions.bulkAdd(data.workSessions.map((i: any) => ({
                        ...i,
                        startTime: new Date(i.startTime),
                        endTime: i.endTime ? new Date(i.endTime) : undefined // Handle null/undefined dates
                    })));

                    if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses.map((i: any) => ({
                        ...i,
                        date: new Date(i.date)
                    })));

                    if (data.clients?.length) await db.clients.bulkAdd(data.clients);

                    if (data.mileage?.length) await db.mileage.bulkAdd(data.mileage.map((i: any) => ({
                        ...i,
                        date: new Date(i.date),
                        startTime: i.startTime ? new Date(i.startTime) : undefined,
                        endTime: i.endTime ? new Date(i.endTime) : undefined
                    })));

                    if (data.jobs?.length) await db.jobs.bulkAdd(data.jobs.map((i: any) => ({
                        ...i,
                        date: new Date(i.date)
                    })));
                });

                resolve(true);
            } catch (error) {
                console.error('Import failed:', error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsText(file);
    });
};
