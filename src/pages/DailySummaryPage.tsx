import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Calendar, Clock, DollarSign, Map, Receipt, TrendingUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDuration } from '../utils/format';
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
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch all data
    const workSessions = useLiveQuery(() => db.workSessions.toArray());
    const expenses = useLiveQuery(() => db.expenses.toArray());
    const mileage = useLiveQuery(() => db.mileage.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());

    // Filter by date
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(selectedDate);
    dateEnd.setHours(23, 59, 59, 999);

    const dailySessions = workSessions?.filter(s => {
        const d = new Date(s.startTime);
        return d >= dateStart && d <= dateEnd;
    }) || [];

    const dailyExpenses = expenses?.filter(e => {
        const d = new Date(e.date);
        return d >= dateStart && d <= dateEnd;
    }) || [];

    const dailyMileage = mileage?.filter(m => {
        const d = new Date(m.date);
        return d >= dateStart && d <= dateEnd;
    }) || [];

    // Helper to get project info
    const getProject = (id?: number) => projects?.find(p => p.id === id);

    // Calculations
    const totalEarnedWork = dailySessions.reduce((acc, s) => acc + (s.totalEarned || 0), 0);

    // Calculate duration from sessions
    const totalDurationMs = dailySessions.reduce((acc, s) => {
        if (s.endTime) {
            return acc + (s.endTime.getTime() - s.startTime.getTime());
        }
        return acc;
    }, 0);

    const totalExpenseAmount = dailyExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalDistance = dailyMileage.reduce((acc, m) => acc + m.distance, 0);

    const netResult = totalEarnedWork - totalExpenseAmount;

    const hasActivity = dailySessions.length > 0 || dailyExpenses.length > 0 || dailyMileage.length > 0;

    return (
        <div className="page-container daily-summary-page">
            <div className="summary-header">
                <h2>{t.dailySummary}</h2>
                <div className="date-picker-container">
                    <Calendar size={20} />
                    <input
                        id="summary-date-picker"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        title={t.date}
                        aria-label={t.date}
                    />
                </div>
            </div>

            {!hasActivity ? (
                <div className="no-activity glass-panel">
                    <Calendar size={48} opacity={0.5} />
                    <p>{t.noActivity}</p>
                </div>
            ) : (
                <div className="summary-content">
                    {/* Key Metrics Cards */}
                    <div className="metrics-grid">
                        <div className="metric-card glass-panel">
                            <div className="metric-icon work">
                                <Clock size={24} />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">{t.totalHours}</span>
                                <span className="metric-value">{formatDuration(totalDurationMs)}</span>
                            </div>
                        </div>

                        <div className="metric-card glass-panel">
                            <div className="metric-icon income">
                                <DollarSign size={24} />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">{t.totalEarned}</span>
                                <span className="metric-value">{formatCurrency(totalEarnedWork)}</span>
                            </div>
                        </div>

                        <div className="metric-card glass-panel">
                            <div className="metric-icon expense">
                                <Receipt size={24} />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">{t.dailyTotalExpenses}</span>
                                <span className="metric-value">{formatCurrency(totalExpenseAmount)}</span>
                            </div>
                        </div>

                        <div className="metric-card glass-panel">
                            <div className="metric-icon distance">
                                <Map size={24} />
                            </div>
                            <div className="metric-info">
                                <span className="metric-label">{t.totalDistance}</span>
                                <span className="metric-value">{totalDistance.toFixed(1)} km</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Result Highlight */}
                    <div className={`net-result-card glass-panel ${netResult >= 0 ? 'positive' : 'negative'}`}>
                        <div className="net-label">
                            <TrendingUp size={24} />
                            <span>{t.netResult}</span>
                        </div>
                        <span className="net-value">{formatCurrency(netResult)}</span>
                    </div>

                    {/* Detailed Lists */}
                    <div className="details-section">
                        {dailySessions.length > 0 && (
                            <div className="detail-group glass-panel">
                                <h3>{t.work}</h3>
                                <ul>
                                    {dailySessions.map(s => {
                                        const project = getProject(s.projectId);
                                        return (
                                            <li key={s.id}>
                                                <div className="detail-item-content">
                                                    <span>
                                                        {s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                        {s.endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                        {dailyExpenses.length > 0 && (
                            <div className="detail-group glass-panel">
                                <h3>{t.expenses}</h3>
                                <ul>
                                    {dailyExpenses.map(e => {
                                        const project = getProject(e.projectId);
                                        // Safe access to categories
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

                        {dailyMileage.length > 0 && (
                            <div className="detail-group glass-panel">
                                <h3>{t.mileage}</h3>
                                <ul>
                                    {dailyMileage.map(m => (
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
                </div>
            )}
        </div>
    );
};

export default DailySummaryPage;
