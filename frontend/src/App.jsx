import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell, LoadingOverlay } from '@mantine/core';
import Dashboard from './pages/Dashboard';
import PlayerJourney from './pages/PlayerJourney';
import Segments from './pages/Segments';
import RulesPage from './pages/RulesPage';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import AppNavbar from './components/Navbar';
import { AppHeader } from './components/AppHeader';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './AuthContext';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminCustomerDetailPage from './pages/AdminCustomerDetailPage';
import AbandonedDepositsPage from './pages/AbandonedDepositsPage';
import PlayerProfile from './pages/PlayerProfile';
import IPConflictsPage from './pages/IPConflictsPage';
import FraudAlerts from './pages/FraudAlerts';
import RiskProfiles from './pages/RiskProfiles';

function App() {
  const { token, loading } = useAuth();
  const [opened, setOpened] = useState(false); // Mobil menü durumu için

  if (loading) {
    return <LoadingOverlay visible={true} blur={2} />;
  }

  // Eğer kullanıcı giriş yapmamışsa, sadece Login/Register sayfalarını göster
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Kullanıcı giriş yapmışsa, AppShell düzenini göster
  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: { sm: 200, lg: 300 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
    >
      <AppHeader opened={opened} toggle={() => setOpened((o) => !o)} />
      <AppNavbar />
      
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/segments" element={<ProtectedRoute><Segments /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
	        <Route path="/abandoned-deposits" element={<ProtectedRoute><AbandonedDepositsPage /></ProtectedRoute>} />
          <Route path="/journey/:playerId" element={<ProtectedRoute><PlayerJourney /></ProtectedRoute>} />
          <Route path="/player/:playerId" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute adminOnly={true}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="/admin/customer/:id" element={<ProtectedRoute adminOnly={true}><AdminCustomerDetailPage /></ProtectedRoute>} />
          <Route path="/ip-conflicts" element={<ProtectedRoute><IPConflictsPage /></ProtectedRoute>} />
          <Route path="/fraud/alerts" element={<ProtectedRoute><FraudAlerts /></ProtectedRoute>} />
          <Route path="/fraud/risk-profiles" element={<ProtectedRoute><RiskProfiles /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;

