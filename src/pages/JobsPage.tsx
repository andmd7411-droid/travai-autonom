import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ChevronLeft, ChevronRight, Plus, X, Bell, Clock, MapPin, Trash2, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Job } from '../types';
import '../styles/JobsPage.css';

// ─── Helpers ───
const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday-first
};

const MONTH_NAMES_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAY_NAMES_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const EVENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

// ─── Notification helpers ───
async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
}

function scheduleNotification(title: string, body: string, fireAt: Date) {
    const delay = fireAt.getTime() - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        }
    }, delay);
}

const REMIND_OPTIONS = [
    { label: 'Pas de rappel', value: 0 },
    { label: '5 minutes avant', value: 5 },
    { label: '15 minutes avant', value: 15 },
    { label: '30 minutes avant', value: 30 },
    { label: '1 heure avant', value: 60 },
    { label: '2 heures avant', value: 120 },
    { label: '1 jour avant', value: 1440 },
];

const JobsPage: React.FC = () => {
    const today = new Date();

    // Calendar state
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Week view state (#11)
    const [calView, setCalView] = useState<'month' | 'week'>('month');
    const [weekStart, setWeekStart] = useState<Date>(() => {
        const d = new Date(today);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
        return d;
    });

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formTime, setFormTime] = useState('09:00');
    const [formAddress, setFormAddress] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formStatus, setFormStatus] = useState<Job['status']>('scheduled');
    const [formRemind, setFormRemind] = useState(30);
    const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted');

    // Day detail panel
    const [showDayPanel, setShowDayPanel] = useState(false);

    const jobs = useLiveQuery(() => db.jobs.orderBy('date').toArray());

    useEffect(() => {
        requestNotificationPermission().then(setNotifGranted);
    }, []);

    // ─── Navigation ───
    const prevPeriod = () => {
        if (calView === 'week') {
            setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
        } else {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
            else setViewMonth(m => m - 1);
        }
    };
    const nextPeriod = () => {
        if (calView === 'week') {
            setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
        } else {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
            else setViewMonth(m => m + 1);
        }
    };

    // Week days array
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    // ─── Get jobs for a specific day ───
    const jobsForDay = (date: Date) =>
        jobs?.filter(j => isSameDay(new Date(j.date), date)) || [];

    const selectedDayJobs = selectedDate ? jobsForDay(selectedDate) : [];

    // ─── Open form ───
    const openNewForm = (date: Date) => {
        setEditingJob(null);
        setFormTitle('');
        setFormTime('09:00');
        setFormAddress('');
        setFormNotes('');
        setFormStatus('scheduled');
        setFormRemind(30);
        setSelectedDate(date);
        setIsFormOpen(true);
        setShowDayPanel(false);
    };

    const openEditForm = (job: Job) => {
        const d = new Date(job.date);
        setEditingJob(job);
        setFormTitle(job.clientName + (job.description ? ` — ${job.description}` : ''));
        setFormTime(d.toTimeString().slice(0, 5));
        setFormAddress(job.address || '');
        setFormNotes(job.notes || '');
        setFormStatus(job.status);
        setFormRemind(0);
        setIsFormOpen(true);
        setShowDayPanel(false);
    };

    // ─── Save event ───
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate && !editingJob) return;

        const baseDate = editingJob ? new Date(editingJob.date) : selectedDate!;
        const [h, m] = formTime.split(':').map(Number);
        const eventDate = new Date(baseDate);
        eventDate.setHours(h, m, 0, 0);

        const parts = formTitle.split('—').map(s => s.trim());
        const clientName = parts[0] || formTitle;
        const description = parts[1] || '';

        const jobData: Job = { clientName, description, date: eventDate, address: formAddress, status: formStatus, notes: formNotes };

        if (editingJob?.id) {
            await db.jobs.update(editingJob.id, jobData);
        } else {
            await db.jobs.add(jobData);
        }

        if (formRemind > 0 && notifGranted) {
            const fireAt = new Date(eventDate.getTime() - formRemind * 60 * 1000);
            scheduleNotification(`📅 Rappel: ${clientName}`, `${formTitle} à ${formTime}${formAddress ? ` — ${formAddress}` : ''}`, fireAt);
        }

        setIsFormOpen(false);
        setShowDayPanel(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Supprimer cet événement?')) {
            await db.jobs.delete(id);
        }
    };

    // ─── Calendar grid ───
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} color="#10b981" />;
            case 'cancelled': return <XCircle size={14} color="#ef4444" />;
            default: return <AlertCircle size={14} color="#f59e0b" />;
        }
    };

    return (
        <div className="page-container jobs-page cal-page">
            {/* ─── Header ─── */}
            <div className="cal-nav">
                <button className="cal-nav-btn" onClick={prevPeriod} aria-label="Précédent"><ChevronLeft size={22} /></button>
                <div className="cal-month-title">
                    {calView === 'month' ? (
                        <><span className="cal-month-name">{MONTH_NAMES_FR[viewMonth]}</span><span className="cal-year">{viewYear}</span></>
                    ) : (
                        <span className="cal-month-name">
                            {weekDays[0].toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} – {weekDays[6].toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    )}
                </div>
                <button className="cal-nav-btn" onClick={nextPeriod} aria-label="Suivant"><ChevronRight size={22} /></button>
            </div>

            {/* ─── View toggle (#11) ─── */}
            <div className="cal-view-toggle">
                <button className={`cal-view-btn ${calView === 'month' ? 'active' : ''}`} onClick={() => setCalView('month')}>Mois</button>
                <button className={`cal-view-btn ${calView === 'week' ? 'active' : ''}`} onClick={() => setCalView('week')}>Semaine</button>
            </div>

            {calView === 'month' ? (
                <>
                    <div className="cal-day-names">
                        {DAY_NAMES_FR.map(d => <div key={d} className="cal-day-name">{d}</div>)}
                    </div>
                    <div className="cal-grid">
                        {Array.from({ length: totalCells }).map((_, idx) => {
                            const dayNum = idx - firstDay + 1;
                            const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                            const cellDate = isValid ? new Date(viewYear, viewMonth, dayNum) : null;
                            const isToday = cellDate ? isSameDay(cellDate, today) : false;
                            const isSelected = cellDate && selectedDate ? isSameDay(cellDate, selectedDate) : false;
                            const dayJobs = cellDate ? jobsForDay(cellDate) : [];
                            const isWeekend = idx % 7 >= 5;
                            return (
                                <div
                                    key={idx}
                                    className={['cal-cell', !isValid ? 'cal-cell-empty' : '', isToday ? 'cal-cell-today' : '', isSelected ? 'cal-cell-selected' : '', isWeekend && isValid ? 'cal-cell-weekend' : ''].join(' ')}
                                    onClick={() => { if (!cellDate) return; setSelectedDate(cellDate); setShowDayPanel(true); setIsFormOpen(false); }}
                                >
                                    {isValid && (
                                        <>
                                            <span className="cal-day-num">{dayNum}</span>
                                            <div className="cal-dots">
                                                {dayJobs.slice(0, 3).map((job, i) => (
                                                    <span key={job.id} className="cal-dot" style={{ background: EVENT_COLORS[i % EVENT_COLORS.length] }} />
                                                ))}
                                                {dayJobs.length > 3 && <span className="cal-dot-more">+{dayJobs.length - 3}</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* ─── Week View ─── */
                <div className="week-view">
                    {weekDays.map((day, i) => {
                        const dayJobs = jobsForDay(day);
                        const isToday = isSameDay(day, today);
                        return (
                            <div key={i} className={`week-day-row ${isToday ? 'week-day-today' : ''}`}>
                                <div className="week-day-header" onClick={() => { setSelectedDate(day); setShowDayPanel(true); setIsFormOpen(false); }}>
                                    <span className="week-day-name">{DAY_NAMES_FR[i]}</span>
                                    <span className="week-day-num">{day.getDate()}</span>
                                    <button className="week-add-btn" onClick={e => { e.stopPropagation(); openNewForm(day); }} aria-label="Ajouter"><Plus size={14} /></button>
                                </div>
                                <div className="week-day-events">
                                    {dayJobs.length === 0 ? (
                                        <span className="week-no-event">—</span>
                                    ) : dayJobs.map((job, ji) => (
                                        <div
                                            key={job.id}
                                            className="week-event-chip"
                                            style={{ borderLeft: `3px solid ${EVENT_COLORS[ji % EVENT_COLORS.length]}` }}
                                            onClick={() => openEditForm(job)}
                                        >
                                            <Clock size={11} />
                                            <span>{new Date(job.date).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="week-event-title">{job.clientName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Day Panel ─── */}
            <AnimatePresence>
                {showDayPanel && selectedDate && (
                    <motion.div key="day-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="day-panel glass-panel">
                        <div className="day-panel-header">
                            <div className="day-panel-title">
                                <span className="day-panel-date">{selectedDate.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </div>
                            <div className="day-panel-actions">
                                <button className="day-add-btn" onClick={() => openNewForm(selectedDate)} aria-label="Ajouter événement">
                                    <Plus size={18} /><span>Ajouter</span>
                                </button>
                                <button className="day-close-btn" onClick={() => setShowDayPanel(false)} aria-label="Fermer"><X size={18} /></button>
                            </div>
                        </div>
                        {selectedDayJobs.length === 0 ? (
                            <div className="day-empty"><p>Aucun événement. Appuyez sur <strong>Ajouter</strong>.</p></div>
                        ) : (
                            <div className="day-events">
                                {selectedDayJobs.map((job, i) => {
                                    const d = new Date(job.date);
                                    return (
                                        <div key={job.id} className="day-event-card" style={{ borderLeft: `4px solid ${EVENT_COLORS[i % EVENT_COLORS.length]}` }}>
                                            <div className="day-event-left">
                                                <div className="day-event-time"><Clock size={13} />{d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</div>
                                                <div className="day-event-title">{job.clientName}</div>
                                                {job.description && <div className="day-event-desc">{job.description}</div>}
                                                {job.address && <div className="day-event-addr"><MapPin size={12} /> {job.address}</div>}
                                                <div className="day-event-status">{getStatusIcon(job.status)}<span>{job.status === 'completed' ? 'Terminé' : job.status === 'cancelled' ? 'Annulé' : 'Planifié'}</span></div>
                                            </div>
                                            <div className="day-event-actions">
                                                <button className="ev-btn edit" onClick={() => openEditForm(job)} aria-label="Modifier"><Edit2 size={15} /></button>
                                                <button className="ev-btn delete" onClick={() => handleDelete(job.id!)} aria-label="Supprimer"><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Event Form Modal ─── */}
            <AnimatePresence>
                {isFormOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)}>
                        <motion.div className="modal-content glass-panel" initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingJob ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
                                {selectedDate && !editingJob && (
                                    <span className="modal-date-badge">{selectedDate.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>
                                )}
                                <button className="modal-close-btn" onClick={() => setIsFormOpen(false)} aria-label="Fermer"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSave} className="event-form">
                                <div className="ev-form-group">
                                    <label className="ev-label">Titre / Client</label>
                                    <input type="text" className="ev-input" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Réunion avec Jean..." autoFocus title="Titre" />
                                </div>
                                <div className="ev-form-group">
                                    <label className="ev-label"><Clock size={15} /> Heure</label>
                                    <input type="time" className="ev-input" required value={formTime} onChange={e => setFormTime(e.target.value)} title="Heure" />
                                </div>
                                <div className="ev-form-group">
                                    <label className="ev-label"><MapPin size={15} /> Adresse (optionnel)</label>
                                    <input type="text" className="ev-input" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Adresse ou lieu" title="Adresse" />
                                </div>
                                <div className="ev-form-group">
                                    <label className="ev-label">Notes</label>
                                    <textarea className="ev-input ev-textarea" rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes supplémentaires..." title="Notes" />
                                </div>
                                <div className="ev-form-group">
                                    <label className="ev-label">Statut</label>
                                    <select className="ev-input" value={formStatus} onChange={e => setFormStatus(e.target.value as Job['status'])} title="Statut">
                                        <option value="scheduled">Planifié</option>
                                        <option value="completed">Terminé</option>
                                        <option value="cancelled">Annulé</option>
                                    </select>
                                </div>
                                <div className="ev-form-group">
                                    <label className="ev-label">
                                        <Bell size={15} /> Rappel
                                        {!notifGranted && (
                                            <button type="button" className="notif-enable-btn" onClick={async () => { const ok = await requestNotificationPermission(); setNotifGranted(ok); }}>
                                                Activer les notifications
                                            </button>
                                        )}
                                    </label>
                                    <select className="ev-input" value={formRemind} onChange={e => setFormRemind(Number(e.target.value))} title="Rappel" disabled={!notifGranted}>
                                        {REMIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    {!notifGranted && <p className="notif-hint">Activez les notifications pour recevoir des rappels.</p>}
                                </div>
                                <div className="ev-form-actions">
                                    <button type="button" className="ev-cancel-btn" onClick={() => setIsFormOpen(false)}>Annuler</button>
                                    <button type="submit" className="ev-save-btn">Sauvegarder</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobsPage;
