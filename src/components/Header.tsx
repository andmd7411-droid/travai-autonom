import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, ChevronLeft, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/Header.css';

const Header: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
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
                <button
                    className="theme-btn"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="lang-btn" onClick={toggleLanguage} aria-label="Switch Language">
                    <span className="lang-text">{language.toUpperCase()}</span>
                    <Globe size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;
