import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Briefcase, Receipt, FileText, PieChart, Users, Map, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/HomePage.css';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 100 }
    },
    hover: {
        scale: 1.05,
        boxShadow: "0px 10px 20px rgba(0,0,0,0.1)",
        transition: { duration: 0.3 }
    },
    tap: { scale: 0.95 }
};

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const menuItems = [
        { id: 'work', title: t.work, icon: <Briefcase size={32} />, path: '/work', color: 'var(--color-primary)' },
        { id: 'expenses', title: t.expenses, icon: <Receipt size={32} />, path: '/expenses', color: '#f43f5e' },
        { id: 'documents', title: t.documents, icon: <FileText size={32} />, path: '/documents', color: '#8b5cf6' },
        { id: 'finance', title: t.finance, icon: <PieChart size={32} />, path: '/finance', color: '#10b981' },
        { id: 'clients', title: t.clients, icon: <Users size={32} />, path: '/clients', color: '#3b82f6' },
        { id: 'mileage', title: t.mileage, icon: <Map size={32} />, path: '/mileage', color: '#f59e0b' },
        { id: 'jobs', title: t.agenda, icon: <Calendar size={32} />, path: '/jobs', color: '#6366f1' }
    ];

    return (
        <div className="page-container home-page">
            <motion.nav
                className="dashboard-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {menuItems.map((item) => (
                    <motion.div
                        key={item.id}
                        className="dashboard-card glass-panel"
                        variants={itemVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => navigate(item.path)}
                        style={{ '--card-color': item.color } as React.CSSProperties}
                    >
                        <div className="card-icon-large">
                            {item.icon}
                        </div>
                        <h2 className="card-title">{item.title}</h2>
                    </motion.div>
                ))}
            </motion.nav>
        </div>
    );
};

export default HomePage;
