import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Calendar, Clock, DollarSign, Map, Receipt, ChevronDown, ChevronRight, MessageSquare, Save } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDuration } from '../utils/format';
import type { WorkSession, Expense, MileageEntry } from '../types';
import '../styles/DailySummaryPage.css';

interface ProjectTagProps {
    name: string;
    color?: string;
}

const ProjectTag: React.FC<ProjectTagProps> = ({ name, color }) => {
    const tagRef = useRef<HTMLSpanElement>(null);
    const dotRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (tagRef.current && color) {
            tagRef.current.style.setProperty('--tag-color', color);
        }
        if (dotRef.current && color) {
            dotRef.current.style.setProperty('--dot-color', color);
        }
    }, [color]);

    return (
        <span ref={tagRef} className="project-tag">
            <span ref={dotRef} className="project-dot"></span>
            {name}
        </span>
    );
};

const DailySummaryPage = () => {
    const { t } = useLanguage();
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [dailyNoteInputs, setDailyNoteInputs] = useState<Record<string, string>>({});

    // Fetch all data
    const workSessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const mileage = useLiveQuery(() => db.mileage.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());
    const dailyNotes = useLiveQuery(() => db.dailyNotes.toArray());

    const getProject = (id?: number) => projects?.find(p => p.id === id);

    // Grouping by date
    const groupedData = React.useMemo(() => {
        const groups: Record<string, {
            sessions: WorkSession[],
            expenses: Expense[],
            mileage: MileageEntry[],
            totalEarned: number,
            totalDuration: number,
            totalExpense: number,
            totalDistance: number
        }> = {};

        const addToGroup = (date: Date) => {
            const key = date.toISOString().split('T')[0];
            if (!groups[key]) {
                groups[key] = {
                    sessions: [],
                    expenses: [],
                    mileage: [],
                    totalEarned: 0,
                    totalDuration: 0,
                    totalExpense: 0,
                    totalDistance: 0
                };
            }
            return key;
        };

        workSessions?.forEach(s => {
            const key = addToGroup(s.startTime);
            groups[key].sessions.push(s);
            groups[key].totalEarned += (s.totalEarned || 0);
            if (s.endTime) {
                groups[key].totalDuration += (s.endTime.getTime() - s.startTime.getTime());
            }
        });

        expenses?.forEach(e => {
            const key = addToGroup(e.date);
            groups[key].expenses.push(e);
            groups[key].totalExpense += e.amount;
        });

        mileage?.forEach(m => {
            const key = addToGroup(m.date);
            groups[key].mileage.push(m);
            groups[key].totalDistance += m.distance;
        });

        return groups;
    }, [workSessions, expenses, mileage]);

    // Initialize inputs from DB
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

    const sortedDates = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    return (
        <div className="page-container daily-summary-page">
            <div className="summary-header">
                <h2>{t.dailySummary}</h2>
            </div>

            {sortedDates.length === 0 ? (
                <div className="no-activity glass-panel">
                    <Calendar size={48} opacity={0.5} />
                    <p>{t.noActivity}</p>
                </div>
            ) : (
                <div className="summary-content">
                    {sortedDates.map(dateStr => {
                        const data = groupedData[dateStr];
                        const dateObj = new Date(dateStr + 'T12:00:00'); // Midday to avoid TZ issues
                        const isExpanded = expandedDays[dateStr];
                        const netResult = data.totalEarned - data.totalExpense;

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
                                    <div className="header-right">
                                        <span className={`net-summary ${netResult >= 0 ? 'positive' : 'negative'}`}>
                                            {formatCurrency(netResult)}
                                        </span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="daily-group-details">
                                        <div className="metrics-grid mini">
                                            <div className="metric-card glass-panel">
                                                <Clock size={16} />
                                                <span>{formatDuration(data.totalDuration)}</span>
                                            </div>
                                            <div className="metric-card glass-panel">
                                                <DollarSign size={16} />
                                                <span>{formatCurrency(data.totalEarned)}</span>
                                            </div>
                                            <div className="metric-card glass-panel">
                                                <Receipt size={16} />
                                                <span>{formatCurrency(data.totalExpense)}</span>
                                            </div>
                                            <div className="metric-card glass-panel">
                                                <Map size={16} />
                                                <span>{data.totalDistance.toFixed(1)} km</span>
                                            </div>
                                        </div>

                                        <div className="details-section">
                                            {data.sessions.length > 0 && (
                                                <div className="detail-group glass-panel">
                                                    <h3>{t.work}</h3>
                                                    <ul>
                                                        {data.sessions.map(s => {
                                                            const project = getProject(s.projectId);
                                                            return (
                                                                <li key={s.id}>
                                                                    <div className="detail-item-content">
                                                                        <span>
                                                                            {s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            {s.endTime ? ` - ${s.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '...'}
                                                                        </span>
                                                                        {project && <ProjectTag name={project.name} color={project.color} />}
                                                                    </div>
                                                                    <span>{formatCurrency(s.totalEarned || 0)}</span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}

                                            {data.expenses.length > 0 && (
                                                <div className="detail-group glass-panel">
                                                    <h3>{t.expenses}</h3>
                                                    <ul>
                                                        {data.expenses.map(e => {
                                                            const project = getProject(e.projectId);
                                                            const catLabel = (t.categories as Record<string, string>)[e.category.toLowerCase()] ||
                                                                (t.categories as Record<string, string>)[e.category] ||
                                                                e.category;

                                                            return (
                                                                <li key={e.id}>
                                                                    <div className="detail-item-content">
                                                                        <span>{e.title} ({catLabel})</span>
                                                                        {project && <ProjectTag name={project.name} color={project.color} />}
                                                                    </div>
                                                                    <span className="expense-amount">-{formatCurrency(e.amount)}</span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}

                                            {data.mileage.length > 0 && (
                                                <div className="detail-group glass-panel">
                                                    <h3>{t.mileage}</h3>
                                                    <ul>
                                                        {data.mileage.map(m => (
                                                            <li key={m.id}>
                                                                <div className="mileage-details">
                                                                    <span className="route">{m.startAddress} -&gt; {m.endAddress}</span>
                                                                    <span className="purpose">{m.purpose}</span>
                                                                </div>
                                                                <span>{m.distance} km</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

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
                    })}
                </div>
            )}
        </div>
    );
};

export default DailySummaryPage;
