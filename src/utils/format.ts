export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ro-RO', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
};

export const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));

    return `${hours}h ${minutes}m ${seconds}s`;
};
