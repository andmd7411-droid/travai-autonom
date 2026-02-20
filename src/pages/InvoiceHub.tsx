import React, { useState } from 'react';
import InvoicesPage from './InvoicesPage';
import InvoiceForm from './InvoiceForm';
import type { Invoice } from '../types';

type View = 'list' | 'new' | 'view';

const InvoiceHub: React.FC = () => {
    const [view, setView] = useState<View>('list');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined);

    if (view === 'new') {
        return <InvoiceForm onBack={() => setView('list')} />;
    }

    if (view === 'view' && selectedInvoice) {
        return <InvoiceForm onBack={() => setView('list')} existingInvoice={selectedInvoice} />;
    }

    return (
        <InvoicesPage
            onNewInvoice={() => setView('new')}
            onViewInvoice={(inv) => {
                setSelectedInvoice(inv);
                setView('view');
            }}
        />
    );
};

export default InvoiceHub;
