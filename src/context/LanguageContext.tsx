import { useContext, useState, type ReactNode } from 'react';
import { en } from '../locales/en';
import { fr } from '../locales/fr';
import { LanguageContext } from './LanguageContextCore';
import type { Language, LanguageContextType } from './LanguageContextCore';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('fr'); // Default to French

    const getTranslation = (lang: Language) => {
        switch (lang) {
            case 'en': return en;
            default: return fr as typeof en;
        }
    };

    const t = getTranslation(language);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
