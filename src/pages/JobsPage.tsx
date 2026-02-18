import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { Job } from '../types';
import '../styles/JobsPage.css';

const JobsPage: React.FC = () => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [clientName, setClientName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
    const [notes, setNotes] = useState('');

    const jobs = useLiveQuery(() =>
        db.jobs.orderBy('date').toArray()
    );

    const filteredJobs = jobs?.filter((job: Job) =>
        job.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setEditingId(null);
        setClientName('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('09:00');
        setAddress('');
        setDescription('');
        setStatus('scheduled');
        setNotes('');
        setIsFormOpen(false);
    };

    const handleEdit = (job: Job) => {
        setEditingId(job.id!);
        setClientName(job.clientName);
        const jobDate = job.date instanceof Date ? job.date : new Date(job.date);
        setDate(jobDate.toISOString().split('T')[0]);
        setTime(jobDate.toTimeString().slice(0, 5));
        setAddress(job.address);
        setDescription(job.description);
        setStatus(job.status);
        setNotes(job.notes || '');
        setIsFormOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteJob || 'Delete this job?')) {
            db.jobs.delete(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const dateTime = new Date(`${date}T${time}`);

        const jobData: Job = {
            clientName,
            date: dateTime,
            address,
            description,
            status,
            notes
        };

        if (editingId) {
            await db.jobs.update(editingId, jobData);
        } else {
            await db.jobs.add(jobData);
        }

        resetForm();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} color="var(--color-secondary)" />;
            case 'cancelled': return <XCircle size={16} color="#ef4444" />;
            default: return <AlertCircle size={16} color="#f59e0b" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return t.completed || 'Completed';
            case 'cancelled': return t.cancelled || 'Cancelled';
            default: return t.scheduled || 'Scheduled';
        }
    };

    return (
        <div className="page-container jobs-page">
            <div className="jobs-header">
                <h2>{t.agenda || 'Agenda'}</h2>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="add-btn" onClick={() => { resetForm(); setIsFormOpen(true); }}>
                        <Plus size={20} />
                        <span>{t.addJob || 'Add Job'}</span>
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isFormOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="modal-content glass-panel"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h3>{editingId ? (t.editJob || 'Edit Job') : (t.addJob || 'Add Job')}</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>{t.clientName || 'Client Name'}</label>
                                    <input
                                        type="text"
                                        required
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        placeholder="Client Name"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.date}</label>
                                        <div className="input-with-icon">
                                            <Calendar size={18} />
                                            <input
                                                type="date"
                                                required
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                title={t.date}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.time}</label>
                                        <div className="input-with-icon">
                                            <Clock size={18} />
                                            <input
                                                type="time"
                                                required
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                title={t.time}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.address}</label>
                                    <div className="input-with-icon">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Address"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.description}</label>
                                    <input
                                        type="text"
                                        required
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Job Description"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t.status}</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value as Job['status'])} title={t.status}>
                                        <option value="scheduled">{t.scheduled}</option>
                                        <option value="completed">{t.completed}</option>
                                        <option value="cancelled">{t.cancelled}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.notes}</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes..."
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setIsFormOpen(false)}>{t.cancel}</button>
                                    <button type="submit" className="save-btn">{t.save}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="jobs-grid">
                {filteredJobs?.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} opacity={0.3} />
                        <p>{t.noJobsFound}</p>
                    </div>
                ) : (
                    filteredJobs?.map((job: Job) => (
                        <motion.div
                            key={job.id}
                            className={`job-card glass-panel status-${job.status}`}
                            layout
                        >
                            <div className="card-header">
                                <div className="job-date">
                                    <Calendar size={14} />
                                    <span>
                                        {job.date instanceof Date ? job.date.toLocaleDateString() : new Date(job.date).toLocaleDateString()}
                                    </span>
                                    <Clock size={14} style={{ marginLeft: '8px' }} />
                                    <span>
                                        {job.date instanceof Date ? job.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(job.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`status-badge ${job.status}`}>
                                    {getStatusIcon(job.status)}
                                    <span>{getStatusLabel(job.status)}</span>
                                </div>
                            </div>

                            <h3>{job.clientName}</h3>
                            <p className="job-desc">{job.description}</p>

                            <div className="job-location">
                                <MapPin size={16} />
                                <span>{job.address}</span>
                            </div>

                            <div className="card-actions">
                                <button onClick={() => handleEdit(job)} className="icon-btn edit" title={t.editJob} aria-label={t.editJob}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(job.id!)} className="icon-btn delete" title={t.confirmDeleteJob} aria-label={t.confirmDeleteJob}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default JobsPage;
