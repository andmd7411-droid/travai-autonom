import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, Edit2, Trash2, MapPin, Calendar, Navigation, Play, Square } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { MileageEntry } from '../types';
import '../styles/MileagePage.css';

import { formatDuration } from '../utils/format';
import { getAddressFromCoords } from '../utils/geocoding';
import { calculateDistance } from '../utils/distance';
import { useInterval } from 'react-use';

const MileagePage: React.FC = () => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Tracking State
    const [isTracking, setIsTracking] = useState(false);
    const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
    const [tripStartPos, setTripStartPos] = useState<{ lat: number; lng: number } | null>(null);
    const [elapsed, setElapsed] = useState(0);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startAddress, setStartAddress] = useState('');
    const [endAddress, setEndAddress] = useState('');
    const [distance, setDistance] = useState('');
    const [purpose, setPurpose] = useState('');

    // Restore tracking state
    useEffect(() => {
        const savedTracking = localStorage.getItem('mileageTracking');
        if (savedTracking) {
            const data = JSON.parse(savedTracking);
            setIsTracking(true);
            setTripStartTime(new Date(data.startTime));
            setTripStartPos(data.startPos);
        }
    }, []);

    useInterval(() => {
        if (isTracking && tripStartTime) {
            setElapsed(Date.now() - tripStartTime.getTime());
        }
    }, isTracking ? 1000 : null);

    const handleStartTrip = () => {
        if (!navigator.geolocation) {
            alert(t.gpsRequired);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const now = new Date();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const startPos = { lat, lng };

            // Get address
            const addr = await getAddressFromCoords(lat, lng);
            setStartAddress(addr);

            setIsTracking(true);
            setTripStartTime(now);
            setTripStartPos(startPos);
            setElapsed(0);

            // Save state
            localStorage.setItem('mileageTracking', JSON.stringify({
                startTime: now,
                startPos: startPos
            }));

        }, (err) => alert(t.gpsError), { enableHighAccuracy: true });
    };

    const handleStopTrip = () => {
        if (!tripStartTime || !tripStartPos) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const now = new Date();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const dist = calculateDistance(tripStartPos.lat, tripStartPos.lng, lat, lng);
            const addr = await getAddressFromCoords(lat, lng);

            setEndAddress(addr);
            setDistance(dist.toString());
            setDate(now.toISOString().split('T')[0]);

            // Auto open form with prefilled data
            setEditingId(null);
            setIsFormOpen(true);

            // Reset tracking
            setIsTracking(false);
            setTripStartTime(null);
            setTripStartPos(null);
            setElapsed(0);
            localStorage.removeItem('mileageTracking');

        }, (err) => alert(t.gpsError), { enableHighAccuracy: true });
    };

    const mileageEntries = useLiveQuery(() =>
        db.mileage.orderBy('date').reverse().toArray()
    );

    const filteredEntries = mileageEntries?.filter((entry: MileageEntry) =>
        entry.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.startAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.endAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setEditingId(null);
        setDate(new Date().toISOString().split('T')[0]);
        setStartAddress('');
        setEndAddress('');
        setDistance('');
        setPurpose('');
        setIsFormOpen(false);
    };

    const handleEdit = (entry: MileageEntry) => {
        setEditingId(entry.id!);
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        setDate(entryDate.toISOString().split('T')[0]);
        setStartAddress(entry.startAddress);
        setEndAddress(entry.endAddress);
        setDistance(entry.distance.toString());
        setPurpose(entry.purpose);
        setIsFormOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteMileage)) {
            db.mileage.delete(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const entryData = {
            date: new Date(date),
            startAddress,
            endAddress,
            distance: parseFloat(distance),
            purpose
        };

        if (editingId) {
            await db.mileage.update(editingId, entryData);
        } else {
            await db.mileage.add(entryData);
        }

        resetForm();
    };

    return (
        <div className="page-container mileage-page">
            <div className="mileage-header">
                <h2>{t.mileage}</h2>
                <div className="header-actions">
                    {/* Tracking UI */}
                    <div className={`tracking-controls ${isTracking ? 'active' : ''}`}>
                        {isTracking ? (
                            <div className="tracking-status glass-panel">
                                <div className="tracking-timer">
                                    <span className="pulsing-dot"></span>
                                    {formatDuration(elapsed)}
                                </div>
                                <button className="stop-btn" onClick={handleStopTrip}>
                                    <Square size={20} fill="currentColor" />
                                    <span>{t.stopTrip}</span>
                                </button>
                            </div>
                        ) : (
                            <button className="start-btn" onClick={handleStartTrip}>
                                <Play size={20} fill="currentColor" />
                                <span>{t.startTrip}</span>
                            </button>
                        )}
                    </div>

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
                        <span>{t.addMileage}</span>
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
                            <h3>{editingId ? t.editMileage : t.addMileage}</h3>
                            <form onSubmit={handleSubmit}>
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
                                    <label>{t.startAddress}</label>
                                    <div className="input-with-icon">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            placeholder={t.startAddressPlaceholder}
                                            value={startAddress}
                                            onChange={(e) => setStartAddress(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.endAddress}</label>
                                    <div className="input-with-icon">
                                        <Navigation size={18} />
                                        <input
                                            type="text"
                                            required
                                            placeholder={t.endAddressPlaceholder}
                                            value={endAddress}
                                            onChange={(e) => setEndAddress(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.distance} (km)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            placeholder="0.0"
                                            value={distance}
                                            onChange={(e) => setDistance(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.purpose}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={t.purposePlaceholder}
                                            value={purpose}
                                            onChange={(e) => setPurpose(e.target.value)}
                                        />
                                    </div>
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

            <div className="mileage-grid">
                {filteredEntries?.length === 0 ? (
                    <div className="empty-state">
                        <Navigation size={48} opacity={0.3} />
                        <p>{t.noMileageFound}</p>
                    </div>
                ) : (
                    filteredEntries?.map((entry: MileageEntry) => (
                        <motion.div
                            key={entry.id}
                            className="mileage-card glass-panel"
                            layout
                        >
                            <div className="card-header">
                                <span className="date-badge">
                                    {entry.date instanceof Date ? entry.date.toLocaleDateString() : new Date(entry.date).toLocaleDateString()}
                                </span>
                                <div className="card-actions">
                                    <button onClick={() => handleEdit(entry)} className="icon-btn edit" title={t.editMileage} aria-label={t.editMileage}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(entry.id!)} className="icon-btn delete" title={t.confirmDeleteMileage} aria-label={t.confirmDeleteMileage}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="route-info">
                                <div className="route-point">
                                    <MapPin size={16} className="icon-start" />
                                    <span>{entry.startAddress || t.notSpecified}</span>
                                </div>
                                <div className="route-line"></div>
                                <div className="route-point">
                                    <Navigation size={16} className="icon-end" />
                                    <span>{entry.endAddress}</span>
                                </div>
                            </div>
                            <div className="card-footer">
                                <div className="distance-badge">
                                    {entry.distance} km
                                </div>
                                <div className="purpose-text">
                                    {entry.purpose}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MileagePage;
