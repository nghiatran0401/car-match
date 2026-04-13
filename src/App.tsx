import { Routes, Route, Navigate } from 'react-router-dom';
import { ProfileProvider } from './context/ProfileContext';
import HomePage from './pages/HomePage';
import RecommendationsPage from './pages/RecommendationsPage';
import DashboardPage from './pages/DashboardPage';
import QuotePage from './pages/QuotePage';
import SpecificationsPage from './pages/SpecificationsPage';
import ConciergePage from './pages/ConciergePage';

function App() {
  return (
    <ProfileProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/showroom" element={<Navigate to="/recommendations" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/specifications" element={<SpecificationsPage />} />
        <Route path="/concierge" element={<ConciergePage />} />
      </Routes>
    </ProfileProvider>
  );
}

export default App;
