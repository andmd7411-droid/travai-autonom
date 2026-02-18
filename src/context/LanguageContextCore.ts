import { createContext } from 'react';
import { en } from '../locales/en';

export type Language = 'en' | 'fr';
export type Translations = typeof en;

export interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
