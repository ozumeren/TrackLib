import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, LoadingOverlay } from '@mantine/core';
import Dashboard from './pages/Dashboard';
import PlayerJourney from './pages/PlayerJourney';
import Segments from './pages/Segments';
import RulesPage from './pages/RulesPage';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './AuthContext';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';
import AbandonedDepositsPage from './pages/AbandonedDepositsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminCustomerDetailPage from './pages/AdminCustomerDetailPage';

function App() {
  const { token, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay visible={true} blur={2} />;
  }

  return (
    <Box>
      {token && <Navbar />}
      
      <Box p="md">
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={token ? <Navigate to="/" /> : <RegisterPage />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/segments" element={<ProtectedRoute><Segments /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
          <Route path="/journey/:playerId" element={<ProtectedRoute><PlayerJourney /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/abandoned-deposits" element={<ProtectedRoute><AbandonedDepositsPage /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute adminOnly={true}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="/admin/customer/:id" element={<ProtectedRoute adminOnly={true}><AdminCustomerDetailPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;

