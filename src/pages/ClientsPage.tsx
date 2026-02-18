import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
// import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Client } from '../types';
import '../styles/ClientsPage.css';

const ClientsPage: React.FC = () => {
    // const { t } = useLanguage(); // Translations to be added later
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});

    const clients = useLiveQuery(() =>
        db.clients.toArray()
    );

    const filteredClients = clients?.filter((client: Client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveString = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClient.name) return;

        if (currentClient.id) {
            await db.clients.update(currentClient.id, currentClient as Client);
        } else {
            await db.clients.add(currentClient as Client);
        }
        setIsEditing(false);
        setCurrentClient({});
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this client?')) {
            await db.clients.delete(id);
        }
    };

    const startEdit = (client: Client) => {
        setCurrentClient(client);
        setIsEditing(true);
    };

    const startNew = () => {
        setCurrentClient({});
        setIsEditing(true);
    };

    return (
        <div className="page-container clients-page">
            <div className="clients-header">
                <h2>Clients</h2>
                <button className="add-btn" onClick={startNew}>
                    <Plus size={20} />
                    <span>Add Client</span>
                </button>
            </div>

            {!isEditing && (
                <div className="search-bar glass-panel">
                    <Search size={20} color="#888" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="client-form glass-panel"
                    >
                        <h3>{currentClient.id ? 'Edit Client' : 'New Client'}</h3>
                        <form onSubmit={handleSaveString}>
                            <div className="form-group">
                                <label>{/*Name*/}</label>
                                <input
                                    type="text"
                                    required
                                    value={currentClient.name || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, name: e.target.value })}
                                    placeholder="Name"
                                    title="Name"
                                />
                            </div>
                            <div className="form-group">
                                <label>{/*Email*/}</label>
                                <input
                                    type="email"
                                    value={currentClient.email || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, email: e.target.value })}
                                    placeholder="Email"
                                    title="Email"
                                />
                            </div>
                            <div className="form-group">
                                <label>{/*Phone*/}</label>
                                <input
                                    type="tel"
                                    value={currentClient.phone || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, phone: e.target.value })}
                                    placeholder="Phone"
                                    title="Phone"
                                />
                            </div>
                            <div className="form-group">
                                <label>{/*Address*/}</label>
                                <textarea
                                    value={currentClient.address || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, address: e.target.value })}
                                    rows={3}
                                    placeholder="Address"
                                    title="Address"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                                <button type="submit" className="save-btn">Save</button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        className="clients-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {filteredClients?.map((client: Client) => (
                            <div key={client.id} className="client-card glass-panel">
                                <div className="client-info">
                                    <h3>{client.name}</h3>
                                    {client.phone && (
                                        <div className="client-detail">
                                            <Phone size={14} /> <span>{client.phone}</span>
                                        </div>
                                    )}
                                    {client.email && (
                                        <div className="client-detail">
                                            <Mail size={14} /> <span>{client.email}</span>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="client-detail">
                                            <MapPin size={14} /> <span>{client.address}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="client-actions">
                                    <button onClick={() => startEdit(client)} className="icon-btn edit" title="Edit Client" aria-label="Edit Client">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(client.id!)} className="icon-btn delete" title="Delete Client" aria-label="Delete Client">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientsPage;
