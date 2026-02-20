import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved color theme on startup
const COLOR_THEMES: Record<string, string> = {
  '#6366f1': '#4f46e5',
  '#3b82f6': '#2563eb',
  '#10b981': '#059669',
  '#f59e0b': '#d97706',
  '#ef4444': '#dc2626',
  '#ec4899': '#db2777',
  '#14b8a6': '#0d9488',
  '#8b5cf6': '#7c3aed',
};
const savedTheme = localStorage.getItem('colorTheme');
if (savedTheme && COLOR_THEMES[savedTheme]) {
  document.documentElement.style.setProperty('--color-primary', savedTheme);
  document.documentElement.style.setProperty('--color-primary-dark', COLOR_THEMES[savedTheme]);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
