import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'admin' | 'reviewer' | 'analyst';
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role && role === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
