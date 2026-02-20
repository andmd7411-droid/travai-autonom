import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Building2, X, Loader, UserPlus, ExternalLink, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Client } from '../types';
import '../styles/ClientsPage.css';

// ─── Nominatim result type ───
interface NominatimResult {
    place_id: number;
    display_name: string;
    name: string;
    address: {
        house_number?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
    lat: string;
    lon: string;
    type: string;
    extratags?: {
        phone?: string;
        email?: string;
        website?: string;
    };
}

// ─── Format Nominatim address ───
function formatAddress(r: NominatimResult): string {
    const a = r.address;
    const parts = [
        [a.house_number, a.road].filter(Boolean).join(' '),
        a.city || a.town || a.village,
        a.state,
        a.postcode,
        a.country
    ].filter(Boolean);
    return parts.join(', ');
}

const ClientsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
    const navigate = useNavigate();

    // Business search state
    const [bizQuery, setBizQuery] = useState('');
    const [bizResults, setBizResults] = useState<NominatimResult[]>([]);
    const [bizLoading, setBizLoading] = useState(false);
    const [bizError, setBizError] = useState<string | null>(null);
    const [showBizSearch, setShowBizSearch] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clients = useLiveQuery(() => db.clients.toArray());
    const invoices = useLiveQuery(() => db.invoices.toArray());
    const workSessions = useLiveQuery(() => db.workSessions.toArray());

    const filteredClients = clients?.filter((client: Client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ─── Business search via Nominatim ───
    const searchBusiness = async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setBizResults([]);
            return;
        }
        setBizLoading(true);
        setBizError(null);
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&limit=6&accept-language=fr`;
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'fr' }
            });
            if (!res.ok) throw new Error('Erreur réseau');
            const data: NominatimResult[] = await res.json();
            // Filter to places that have a name (businesses, not just roads)
            const filtered = data.filter(r => r.name && r.name.trim() !== '');
            setBizResults(filtered);
            if (filtered.length === 0) setBizError('Aucun résultat. Essayez avec la ville: "Tim Hortons Montréal"');
        } catch {
            setBizError('Erreur de recherche. Vérifiez votre connexion.');
        } finally {
            setBizLoading(false);
        }
    };

    const handleBizQueryChange = (val: string) => {
        setBizQuery(val);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => searchBusiness(val), 600);
    };

    // ─── Select a result → pre-fill the client form ───
    const selectBizResult = (r: NominatimResult) => {
        const address = formatAddress(r);
        setCurrentClient({
            name: r.name || r.display_name.split(',')[0],
            address,
            phone: r.extratags?.phone || '',
            email: r.extratags?.email || '',
            notes: r.extratags?.website ? `Site: ${r.extratags.website}` : ''
        });
        setShowBizSearch(false);
        setBizResults([]);
        setBizQuery('');
        setIsEditing(true);
    };

    // ─── Save client ───
    const handleSave = async (e: React.FormEvent) => {
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
        if (confirm('Supprimer ce client?')) {
            await db.clients.delete(id);
        }
    };

    const startEdit = (client: Client) => {
        setCurrentClient(client);
        setIsEditing(true);
        setShowBizSearch(false);
    };

    const startNew = () => {
        setCurrentClient({});
        setIsEditing(true);
        setShowBizSearch(false);
    };

    const openBizSearch = () => {
        setShowBizSearch(true);
        setIsEditing(false);
        setBizResults([]);
        setBizQuery('');
        setBizError(null);
    };

    return (
        <div className="page-container clients-page">
            {/* ─── Header ─── */}
            <div className="clients-header">
                <h2>Clients</h2>
                <div className="clients-header-btns">
                    <button className="biz-search-btn" onClick={openBizSearch} title="Rechercher une entreprise">
                        <Building2 size={18} />
                        <span>Rechercher</span>
                    </button>
                    <button className="add-btn" onClick={startNew}>
                        <Plus size={18} />
                        <span>Ajouter</span>
                    </button>
                </div>
            </div>

            {/* ─── Business Search Panel ─── */}
            <AnimatePresence>
                {showBizSearch && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="biz-search-panel glass-panel"
                    >
                        <div className="biz-search-header">
                            <Building2 size={18} color="#6366f1" />
                            <span>Rechercher une entreprise</span>
                            <button className="biz-close-btn" onClick={() => setShowBizSearch(false)} aria-label="Fermer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="biz-search-input-row">
                            <Search size={18} color="#888" />
                            <input
                                type="text"
                                placeholder='Ex: "Tim Hortons Montréal" ou "Dépanneur Laval"'
                                value={bizQuery}
                                onChange={e => handleBizQueryChange(e.target.value)}
                                autoFocus
                                className="biz-search-input"
                                title="Rechercher une entreprise"
                            />
                            {bizLoading && <Loader size={18} className="spin-icon" color="#6366f1" />}
                            {bizQuery && !bizLoading && (
                                <button onClick={() => { setBizQuery(''); setBizResults([]); }} aria-label="Effacer" className="biz-clear-btn">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <p className="biz-search-hint">
                            💡 Incluez la ville pour de meilleurs résultats
                        </p>

                        {bizError && (
                            <div className="biz-error">{bizError}</div>
                        )}

                        {/* Results */}
                        <div className="biz-results">
                            {bizResults.map(r => (
                                <div key={r.place_id} className="biz-result-card">
                                    <div className="biz-result-info">
                                        <div className="biz-result-name">{r.name || r.display_name.split(',')[0]}</div>
                                        <div className="biz-result-address">
                                            <MapPin size={12} />
                                            <span>{formatAddress(r)}</span>
                                        </div>
                                        {r.extratags?.phone && (
                                            <div className="biz-result-phone">
                                                <Phone size={12} />
                                                <span>{r.extratags.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="biz-result-actions">
                                        <button
                                            className="biz-add-btn"
                                            onClick={() => selectBizResult(r)}
                                            title="Ajouter comme client"
                                            aria-label="Ajouter comme client"
                                        >
                                            <UserPlus size={16} />
                                            <span>Ajouter</span>
                                        </button>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' ' + formatAddress(r))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="biz-maps-btn"
                                            title="Voir sur Google Maps"
                                            aria-label="Voir sur Google Maps"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Client list search bar ─── */}
            {!isEditing && !showBizSearch && (
                <div className="search-bar glass-panel">
                    <Search size={20} color="#888" />
                    <input
                        type="text"
                        placeholder="Filtrer les clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        title="Rechercher dans les clients"
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="client-form glass-panel"
                    >
                        <h3>{currentClient.id ? 'Modifier Client' : 'Nouveau Client'}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    required
                                    value={currentClient.name || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, name: e.target.value })}
                                    placeholder="Nom / Entreprise"
                                    title="Nom"
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="email"
                                    value={currentClient.email || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, email: e.target.value })}
                                    placeholder="Courriel"
                                    title="Courriel"
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="tel"
                                    value={currentClient.phone || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, phone: e.target.value })}
                                    placeholder="Téléphone"
                                    title="Téléphone"
                                />
                            </div>
                            <div className="form-group">
                                <textarea
                                    value={currentClient.address || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, address: e.target.value })}
                                    rows={3}
                                    placeholder="Adresse"
                                    title="Adresse"
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="text"
                                    value={(currentClient as Client & { notes?: string }).notes || ''}
                                    onChange={e => setCurrentClient({ ...currentClient, notes: e.target.value } as Partial<Client>)}
                                    placeholder="Notes (site web, etc.)"
                                    title="Notes"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Annuler</button>
                                <button type="submit" className="save-btn">Sauvegarder</button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        className="clients-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {(!filteredClients || filteredClients.length === 0) && !showBizSearch && (
                            <div className="clients-empty">
                                <Building2 size={48} color="#94a3b8" />
                                <p>Aucun client. Recherchez une entreprise ou ajoutez manuellement.</p>
                            </div>
                        )}
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
                                    {/* Client stats */}
                                    {(() => {
                                        const clientInvoices = invoices?.filter(i => i.clientId === client.id) || [];
                                        const clientSessions = workSessions?.filter(s => s.clientId === client.id) || [];
                                        const totalEarned = clientSessions.reduce((a, s) => a + (s.totalEarned || 0), 0);
                                        const pendingInvoices = clientInvoices.filter(i => i.status === 'sent' || i.status === 'draft').length;
                                        return (clientInvoices.length > 0 || clientSessions.length > 0) ? (
                                            <div className="client-stats">
                                                {clientSessions.length > 0 && <span><Clock size={12} /> {clientSessions.length} sessions · {totalEarned.toFixed(0)}$</span>}
                                                {clientInvoices.length > 0 && <span><FileText size={12} /> {clientInvoices.length} factures{pendingInvoices > 0 ? ` (${pendingInvoices} en attente)` : ''}</span>}
                                            </div>
                                        ) : null;
                                    })()}

                                    {/* Expanded history */}
                                    {expandedClientId === client.id && (
                                        <div className="client-history">
                                            {invoices?.filter(i => i.clientId === client.id).slice(0, 5).map(inv => (
                                                <div key={inv.id} className="client-history-item">
                                                    <FileText size={12} />
                                                    <span>#{inv.invoiceNumber} — {inv.totals.total.toFixed(2)}$ ({inv.status})</span>
                                                </div>
                                            ))}
                                            {workSessions?.filter(s => s.clientId === client.id).slice(0, 5).map(s => (
                                                <div key={s.id} className="client-history-item">
                                                    <Clock size={12} />
                                                    <span>{new Date(s.startTime).toLocaleDateString('fr-CA')} — {(s.totalEarned || 0).toFixed(2)}$</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="client-actions">
                                    <button
                                        onClick={() => navigate('/documents?newInvoice=1&clientId=' + client.id + '&clientName=' + encodeURIComponent(client.name))}
                                        className="icon-btn invoice"
                                        title="Créer une facture"
                                        aria-label="Créer une facture"
                                    >
                                        <FileText size={18} />
                                    </button>
                                    <button
                                        onClick={() => setExpandedClientId(expandedClientId === client.id ? null : client.id!)}
                                        className="icon-btn history"
                                        title="Historique"
                                        aria-label="Historique"
                                    >
                                        <Clock size={18} />
                                    </button>
                                    <button onClick={() => startEdit(client)} className="icon-btn edit" title="Modifier" aria-label="Modifier">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(client.id!)} className="icon-btn delete" title="Supprimer" aria-label="Supprimer">
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
