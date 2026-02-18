export interface WorkSession {
    id?: number;
    startTime: Date;
    endTime?: Date;
    startLocation?: { lat: number; lng: number; address?: string };
    endLocation?: { lat: number; lng: number; address?: string };
    hourlyRate: number;
    totalEarned?: number;
    notes?: string;
}

export interface Expense {
    id?: number;
    title: string;
    amount: number;
    category: string; // 'Materials', 'Fuel', 'Rent', 'Other'
    date: Date;
    description?: string;
    receiptPhoto?: Blob;
}

export interface DocumentItem {
    id?: number;
    title: string;
    type: 'photo' | 'document';
    fileBlob: Blob;
    date: Date;
    tags?: string[];
}

export interface Invoice {
    id?: number;
    date: Date;
    type: 'invoice' | 'quote';
    clientName: string;
    amount: number;
    fileBlob?: Blob; // If we save the PDF
}

export interface Client {
    id?: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
}

export interface MileageEntry {
    id?: number;
    date: Date;
    startAddress: string;
    endAddress: string;
    distance: number;
    purpose: string;
}

export interface Job {
    id?: number;
    clientName: string;
    clientId?: number;
    date: Date;
    description: string;
    address: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
}
