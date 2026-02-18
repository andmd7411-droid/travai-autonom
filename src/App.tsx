import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import WorkPage from './pages/WorkPage';
import ExpensesPage from './pages/ExpensesPage';
import DocumentsPage from './pages/DocumentsPage';
import FinancePage from './pages/FinancePage';
import ClientsPage from './pages/ClientsPage';
import MileagePage from './pages/MileagePage';
import JobsPage from './pages/JobsPage';
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
      <Header />
      <main className="content-area">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/mileage" element={<MileagePage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Routes>
        </AnimatePresence>
      </main>
      {/* We keep the bottom nav but it serves as a secondary quick-switch */}
      <Navigation />
    </div>
  );
};

export default App;
