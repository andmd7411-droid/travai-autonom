import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Play, Square, MapPin, DollarSign, Trash2 } from 'lucide-react';
import { formatCurrency, formatDuration } from '../utils/format';
import { getAddressFromCoords } from '../utils/geocoding';
import { useInterval } from 'react-use';
import { useLanguage } from '../context/LanguageContext';
import type { WorkSession } from '../types';
import '../styles/WorkPage.css';

const WorkPage: React.FC = () => {
    const { t } = useLanguage();
    const [isWorking, setIsWorking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [hourlyRate, setHourlyRate] = useState(100); // Default 100 MDL/hr or similar
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

    // Restore state from unfinished session if any
    useEffect(() => {
        const checkActiveSession = async () => {
            const activeSession = await db.workSessions
                .filter((session: WorkSession) => !session.endTime)
                .first();

            if (activeSession) {
                setIsWorking(true);
                setStartTime(activeSession.startTime);
                setCurrentSessionId(activeSession.id!);
            }
        };
        checkActiveSession();
    }, []);

    // Timer tick
    useInterval(() => {
        if (isWorking && startTime) {
            setElapsed(Date.now() - startTime.getTime());
        }
    }, isWorking ? 1000 : null);

    const handleStartWork = async () => {
        if (!navigator.geolocation) {
            alert(t.gpsRequired);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const now = new Date();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const address = await getAddressFromCoords(lat, lng);

            const id = await db.workSessions.add({
                startTime: now,
                startLocation: {
                    lat,
                    lng,
                    address
                },
                hourlyRate: hourlyRate
            });

            setStartTime(now);
            setCurrentSessionId(id as number);
            setIsWorking(true);
        }, (err) => {
            alert('Error getting location: ' + err.message);
        }, { enableHighAccuracy: true });
    };

    const handleStopWork = async () => {
        if (!currentSessionId || !startTime) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const now = new Date();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const address = await getAddressFromCoords(lat, lng);

            const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            const earned = durationHours * hourlyRate;

            await db.workSessions.update(currentSessionId, {
                endTime: now,
                endLocation: {
                    lat,
                    lng,
                    address
                },
                totalEarned: earned
            });

            setIsWorking(false);
            setStartTime(null);
            setElapsed(0);
            setCurrentSessionId(null);
        }, (err) => {
            alert('Error getting location: ' + err.message);
        }, { enableHighAccuracy: true });
    };

    const handleDelete = (id: number) => {
        if (confirm(t.confirmDeleteWork)) {
            db.workSessions.delete(id);
        }
    };

    // Recent history
    const recentSessions = useLiveQuery(() =>
        db.workSessions.orderBy('startTime').reverse().limit(5).toArray()
    );

    const currentEarned = (elapsed / (1000 * 60 * 60)) * hourlyRate;

    return (
        <div className="page-container work-page">
            <div className="status-card glass-panel">
                <div className="rate-input">
                    <DollarSign size={16} />
                    <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        disabled={isWorking}
                        aria-label={t.hourlyRate}
                    />
                    <span>{t.perHour}</span>
                </div>

                <div className="timer-display">
                    {formatDuration(elapsed)}
                </div>

                <div className="earnings-display">
                    {formatCurrency(currentEarned)}
                </div>

                <button
                    className={`action-btn ${isWorking ? 'stop' : 'start'}`}
                    onClick={isWorking ? handleStopWork : handleStartWork}
                >
                    {isWorking ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                    <span>{isWorking ? t.stopWork : t.startWork}</span>
                </button>
            </div>

            <div className="history-section">
                <h3>{t.recentHistory}</h3>
                <div className="history-list">
                    {recentSessions?.map((session: WorkSession) => (
                        <div key={session.id} className="history-item glass-panel">
                            <div className="history-date">
                                {session.startTime.toLocaleDateString()}
                            </div>
                            <div className="history-details">
                                <span>{session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                    {session.endTime ? session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                </span>
                                <span className="history-amount">
                                    {session.totalEarned ? formatCurrency(session.totalEarned) : t.inProgress}
                                </span>
                            </div>
                            {session.startLocation && (
                                <div className="history-location">
                                    <MapPin size={12} />
                                    <span>
                                        {session.startLocation.address || `${session.startLocation.lat.toFixed(4)}, ${session.startLocation.lng.toFixed(4)}`}
                                    </span>
                                </div>
                            )}
                            <button
                                className="delete-btn-absolute"
                                onClick={(e) => { e.stopPropagation(); handleDelete(session.id!); }}
                                aria-label="Delete session"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default WorkPage;
