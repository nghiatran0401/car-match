import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProfileProvider } from './context/ProfileContext';
import { CompareProvider } from './context/CompareContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProfilePage from './pages/ProfilePage';
import QuotePage from './pages/QuotePage';
import ConciergePage from './pages/ConciergePage';
import ComparePage from './pages/ComparePage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import ShowroomsPage from './pages/ShowroomsPage';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import CarsPage from './pages/CarsPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <LanguageProvider>
      <ProfileProvider>
        <CompareProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/cars" element={<CarsPage />} />
              <Route path="/vehicle/:modelSlug" element={<VehicleDetailPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/showrooms" element={<ShowroomsPage />} />
              <Route path="/concierge" element={<ConciergePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="/showroom" element={<Navigate to="/showrooms" replace />} />
            <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          </Routes>
        </CompareProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}

export default App;
