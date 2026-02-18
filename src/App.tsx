import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import WorkPage from './pages/WorkPage';
import ExpensesPage from './pages/ExpensesPage';
import DocumentsPage from './pages/DocumentsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import FinancePage from './pages/FinancePage';
import ClientsPage from './pages/ClientsPage';
import MileagePage from './pages/MileagePage';
import JobsPage from './pages/JobsPage';
import DailySummaryPage from './pages/DailySummaryPage';
import SettingsPage from './pages/SettingsPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceGenerator from './pages/InvoiceGenerator';
import FinancialToolsPage from './pages/FinancialToolsPage';
import { LanguageProvider } from './context/LanguageContext';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <Router>
        <AppContent />
      </Router>
    </LanguageProvider>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();

  return (
    <div className="app-container">
      {/* We need to handle the lock screen state here or in a wrapper */}
      <LockScreenWrapper>
        <Header />
        <main className="content-area">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/mileage" element={<MileagePage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/daily-summary" element={<DailySummaryPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/new" element={<InvoiceGenerator />} />
              <Route path="/fin-tools" element={<FinancialToolsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AnimatePresence>
        </main>
        {/* We keep the bottom nav but it serves as a secondary quick-switch */}
        <Navigation />
      </LockScreenWrapper>
    </div>
  );
};

import LockScreen from './components/LockScreen';
import { useState } from 'react';

const LockScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return <>{children}</>;
};

export default App;
