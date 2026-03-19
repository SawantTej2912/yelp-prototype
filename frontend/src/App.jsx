import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import PreferencesPage from './pages/PreferencesPage';
import RestaurantDetailsPage from './pages/RestaurantDetailsPage';
import AddRestaurantPage from './pages/AddRestaurantPage';
import WriteReviewPage from './pages/WriteReviewPage';
import FavoritesPage from './pages/FavoritesPage';
import HistoryPage from './pages/HistoryPage';
import ChatWidget from './components/ChatWidget';

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected pages with Navbar */}
          <Route path="/" element={<ProtectedLayout><ExplorePage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/preferences" element={<ProtectedLayout><PreferencesPage /></ProtectedLayout>} />
          <Route path="/restaurants/new" element={<ProtectedLayout><AddRestaurantPage /></ProtectedLayout>} />
          <Route path="/restaurants/:id" element={<ProtectedLayout><RestaurantDetailsPage /></ProtectedLayout>} />

          {/* Phase 5 — Reviews & Favorites */}
          <Route path="/restaurants/:id/review" element={<ProtectedLayout><WriteReviewPage /></ProtectedLayout>} />
          <Route path="/favorites" element={<ProtectedLayout><FavoritesPage /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout><HistoryPage /></ProtectedLayout>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Persistent floating AI assistant (logged-in only) */}
        <ChatWidget />
      </AuthProvider>
    </BrowserRouter>
  );
}
