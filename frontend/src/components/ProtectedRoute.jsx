import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LoadingOverlay } from '@mantine/core';

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay visible={true} />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // YENİ: Admin rolü kontrolü
  if (adminOnly && user?.role !== 'ADMIN') {
    // Eğer sayfa sadece admin içinse ama kullanıcı admin değilse, ana sayfaya yönlendir.
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;

