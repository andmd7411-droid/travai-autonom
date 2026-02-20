import { NavLink } from 'react-router-dom';
import { Clock, Wallet, FileText, PieChart, Folder } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Navigation.css';

const Navigation: React.FC = () => {
    const { t } = useLanguage();

    return (
        <nav className="bottom-nav glass-panel">
            <NavLink to="/work" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Clock size={24} />
                <span>{t.work}</span>
            </NavLink>
            <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Wallet size={24} />
                <span>{t.expenses}</span>
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={24} />
                <span>{t.documents}</span>
            </NavLink>
            <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Folder size={24} />
                <span>{t.projects}</span>
            </NavLink>
            <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <PieChart size={24} />
                <span>{t.finance}</span>
            </NavLink>
        </nav>
    );
};

export default Navigation;
