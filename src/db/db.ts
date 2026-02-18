import Dexie, { type Table } from 'dexie';
import type { WorkSession, Expense, DocumentItem, Invoice, Client, MileageEntry, Job, Project } from '../types';

export class AutonomousWorkerDB extends Dexie {
    workSessions!: Table<WorkSession>;
    expenses!: Table<Expense>;
    documents!: Table<DocumentItem>;
    clients!: Table<Client>;
    invoices!: Table<Invoice>;
    mileage!: Table<MileageEntry>;
    jobs!: Table<Job>;
    projects!: Table<Project>;

    constructor() {
        super('AutonomousWorkerDB');
        this.version(2).stores({
            workSessions: '++id, startTime, endTime',
            expenses: '++id, date, category',
            documents: '++id, date, type, [tags]', // Multi-entry index for tags
            invoices: '++id, date, type',
            clients: '++id, name, email',
            mileage: '++id, date',
            jobs: '++id, date, status',
            projects: '++id, name, status, clientId'
        });
    }
}

export const db = new AutonomousWorkerDB();
