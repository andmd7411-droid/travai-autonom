import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Play, Square, MapPin, DollarSign, Trash2, Pause, ChevronDown, ChevronRight, MessageSquare, Save } from 'lucide-react';
import { formatCurrency, formatDuration } from '../utils/format';
import { getAddressFromCoords } from '../utils/geocoding';
import { useInterval } from 'react-use';
import { useLanguage } from '../context/LanguageContext';
import type { WorkSession } from '../types';
import '../styles/WorkPage.css';

const WorkPage: React.FC = () => {
    const { t } = useLanguage();
    const [isWorking, setIsWorking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [pausedElapsed, setPausedElapsed] = useState(0); // ms accumulated before pause
    const [hourlyRate, setHourlyRate] = useState(() => {
        const saved = localStorage.getItem('hourlyRate');
        return saved ? Number(saved) : 100;
    });
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

    const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray());

    useEffect(() => {
        localStorage.setItem('hourlyRate', hourlyRate.toString());
    }, [hourlyRate]);

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
                if (activeSession.projectId) {
                    setSelectedProjectId(activeSession.projectId);
                }
                if (activeSession.hourlyRate) {
                    setHourlyRate(activeSession.hourlyRate);
                }
            }
        };
        checkActiveSession();
    }, []);

    // Timer tick — stops when paused
    useInterval(() => {
        if (isWorking && !isPaused && startTime) {
            setElapsed(pausedElapsed + (Date.now() - startTime.getTime()));
        }
    }, isWorking && !isPaused ? 1000 : null);

    const handlePause = () => {
        if (!isWorking || isPaused) return;
        const now = Date.now();
        setPausedElapsed(prev => prev + (now - (startTime?.getTime() ?? now)));
        setStartTime(null);
        setIsPaused(true);
    };

    const handleResume = () => {
        if (!isPaused) return;
        setStartTime(new Date());
        setIsPaused(false);
    };

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
                hourlyRate: hourlyRate,
                projectId: selectedProjectId,
                clientId: projects?.find(p => p.id === selectedProjectId)?.clientId
            });

            setStartTime(now);
            setCurrentSessionId(id as number);
            setIsWorking(true);
        }, (err) => {
            alert('Error getting location: ' + err.message);
        }, { enableHighAccuracy: true });
    };

    const handleStopWork = async () => {
        if (!currentSessionId) return;

        // If paused, use accumulated elapsed; otherwise compute live
        const totalMs = isPaused
            ? pausedElapsed
            : pausedElapsed + (startTime ? Date.now() - startTime.getTime() : 0);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const now = new Date();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const address = await getAddressFromCoords(lat, lng);

            const durationHours = totalMs / (1000 * 60 * 60);
            const earned = durationHours * hourlyRate;

            await db.workSessions.update(currentSessionId, {
                endTime: now,
                endLocation: { lat, lng, address },
                totalEarned: earned
            });

            setIsWorking(false);
            setIsPaused(false);
            setStartTime(null);
            setElapsed(0);
            setPausedElapsed(0);
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

    // History and Notes
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [dailyNoteInputs, setDailyNoteInputs] = useState<Record<string, string>>({});

    const allSessions = useLiveQuery(() =>
        db.workSessions.orderBy('startTime').reverse().toArray()
    );

    const dailyNotes = useLiveQuery(() => db.dailyNotes.toArray());

    const groupedSessions = React.useMemo(() => {
        const groups: Record<string, WorkSession[]> = {};
        allSessions?.forEach(s => {
            const key = s.startTime.toISOString().split('T')[0];
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });
        return groups;
    }, [allSessions]);

    useEffect(() => {
        if (dailyNotes) {
            setDailyNoteInputs(prev => {
                const inputs: Record<string, string> = { ...prev };
                dailyNotes.forEach(dn => {
                    inputs[dn.date] = dn.content;
                });
                return inputs;
            });
        }
    }, [dailyNotes]);

    const handleSaveNote = async (date: string) => {
        const content = dailyNoteInputs[date] || '';
        await db.dailyNotes.put({ date, content });
    };

    const toggleDay = (date: string) => {
        setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const sortedDates = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));

    const currentEarned = (elapsed / (1000 * 60 * 60)) * hourlyRate;

    return (
        <div className="page-container work-page">
            <div className="status-card glass-panel">
                <div className="project-selector">
                    <select
                        value={selectedProjectId || ''}
                        onChange={(e) => {
                            const pId = Number(e.target.value) || undefined;
                            setSelectedProjectId(pId);
                            if (pId && projects) {
                                const project = projects.find(p => p.id === pId);
                                if (project && project.hourlyRate) {
                                    setHourlyRate(project.hourlyRate);
                                }
                            }
                        }}
                        disabled={isWorking}
                        aria-label={t.projects || "Projects"}
                        className="project-dropdown"
                    >
                        <option value="">{t.select || "No Project"}</option>
                        {projects?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

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

                <div className={`timer-display ${isPaused ? 'paused' : ''}`}>
                    {formatDuration(elapsed)}
                    {isPaused && <span className="paused-badge">EN PAUSE</span>}
                </div>

                <div className="earnings-display">
                    {formatCurrency(currentEarned)}
                </div>

                <div className="timer-controls">
                    {isWorking && (
                        <button
                            className={`action-btn pause-btn ${isPaused ? 'resume' : 'pause'}`}
                            onClick={isPaused ? handleResume : handlePause}
                        >
                            {isPaused
                                ? <><Play size={22} fill="currentColor" /><span>Reprendre</span></>
                                : <><Pause size={22} fill="currentColor" /><span>Pause</span></>}
                        </button>
                    )}
                    <button
                        className={`action-btn ${isWorking ? 'stop' : 'start'}`}
                        onClick={isWorking ? handleStopWork : handleStartWork}
                    >
                        {isWorking ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                        <span>{isWorking ? t.stopWork : t.startWork}</span>
                    </button>
                </div>
            </div>

            <div className="history-section">
                <h3>{t.work}</h3>
                <div className="history-list">
                    {sortedDates.length === 0 ? (
                        <div className="no-activity glass-panel">
                            <p>{t.noInvoicesFound || "Nicio sesiune găsită"}</p>
                        </div>
                    ) : (
                        sortedDates.map(dateStr => {
                            const sessions = groupedSessions[dateStr];
                            const isExpanded = expandedDays[dateStr];
                            const dateObj = new Date(dateStr + 'T12:00:00');
                            const weekday = dateObj.toLocaleDateString('ro-RO', { weekday: 'long' });
                            const displayDate = `${dateStr}-${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`;

                            return (
                                <div key={dateStr} className="daily-group-container">
                                    <div
                                        className={`daily-group-header glass-panel ${isExpanded ? 'active' : ''}`}
                                        onClick={() => toggleDay(dateStr)}
                                    >
                                        <div className="header-left">
                                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            <span className="date-text">{displayDate}</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="daily-group-details-work">
                                            {sessions.map((session: WorkSession) => (
                                                <div key={session.id} className="history-item glass-panel">
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
                                                                <strong>Départ : </strong>
                                                                {session.startLocation.address || `${session.startLocation.lat.toFixed(4)}, ${session.startLocation.lng.toFixed(4)}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {session.endLocation && (
                                                        <div className="history-location history-location-end">
                                                            <MapPin size={12} />
                                                            <span>
                                                                <strong>Arrivée : </strong>
                                                                {session.endLocation.address || `${session.endLocation.lat.toFixed(4)}, ${session.endLocation.lng.toFixed(4)}`}
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

                                            <div className="daily-note-section glass-panel">
                                                <div className="note-header">
                                                    <MessageSquare size={16} />
                                                    <span>Note</span>
                                                </div>
                                                <div className="note-input-container">
                                                    <textarea
                                                        value={dailyNoteInputs[dateStr] || ''}
                                                        onChange={(e) => setDailyNoteInputs(prev => ({ ...prev, [dateStr]: e.target.value }))}
                                                        placeholder="Introduceți un text pentru această zi..."
                                                    />
                                                    <button onClick={() => handleSaveNote(dateStr)} title="Salvează">
                                                        <Save size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};


export default WorkPage;
