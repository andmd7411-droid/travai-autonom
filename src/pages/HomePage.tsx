import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, FileText, PieChart, Users, Map, Calendar, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import '../styles/HomePage.css';

interface DashboardIconProps {
    color: string;
    icon: React.ReactNode;
}

const DashboardIcon: React.FC<DashboardIconProps> = ({ color, icon }) => {
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (iconRef.current) {
            iconRef.current.style.setProperty('--bg-color', `${color}20`);
            iconRef.current.style.setProperty('--icon-color', color);
        }
    }, [color]);

    return (
        <div ref={iconRef} className="card-icon">
            {icon}
        </div>
    );
};

const HomePage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const menuItems = [
        { id: 'work', title: t.work, icon: <Clock size={32} />, path: '/work', color: '#3b82f6' },
        { id: 'expenses', title: t.expenses, icon: <DollarSign size={32} />, path: '/expenses', color: '#ef4444' },
        { id: 'documents', title: t.documents, icon: <FileText size={32} />, path: '/documents', color: '#8b5cf6' },
        { id: 'finance', title: t.finance, icon: <PieChart size={32} />, path: '/finance', color: '#10b981' },
        { id: 'clients', title: t.clients, icon: <Users size={32} />, path: '/clients', color: '#3b82f6' },
        { id: 'mileage', title: t.mileage, icon: <Map size={32} />, path: '/mileage', color: '#f59e0b' },
        { id: 'jobs', title: t.agenda, icon: <Calendar size={32} />, path: '/jobs', color: '#6366f1' },
        { id: 'invoices', title: t.invoices, icon: <FileText size={32} />, path: '/invoices', color: '#f59e0b' },
        { id: 'fin-tools', title: t.financialTools, icon: <PieChart size={32} />, path: '/fin-tools', color: '#10b981' },
        { id: 'daily', title: t.dailySummary, icon: <PieChart size={32} />, path: '/daily-summary', color: '#ec4899' },
        { id: 'settings', title: t.settings, icon: <Shield size={32} />, path: '/settings', color: '#64748b' }
    ];

    return (
        <div className="page-container home-page">
            <header className="home-header">
                <h1>{t.appTitle}</h1>
                <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </header>

            <div className="dashboard-grid">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        className="dashboard-card glass-panel"
                        onClick={() => navigate(item.path)}
                        whileHover={{ scale: 1.02, translateY: -5 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <DashboardIcon color={item.color} icon={item.icon} />
                        <h3>{item.title}</h3>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
