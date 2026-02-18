import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Header.css';

const Header: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const isHome = location.pathname === '/';

    const toggleLanguage = () => {
        setLanguage(language === 'fr' ? 'en' : 'fr');
    };

    return (
        <header className="app-header glass-panel">
            <div className="header-left">
                {!isHome && (
                    <button className="back-btn" onClick={() => navigate('/')} aria-label={t.backToHome}>
                        <ChevronLeft size={24} />
                    </button>
                )}
                <h1>{t.appTitle}</h1>
            </div>

            <div className="header-actions">
                <button className="lang-btn" onClick={toggleLanguage} aria-label="Switch Language">
                    <span className="lang-text">{language.toUpperCase()}</span>
                    <Globe size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;
