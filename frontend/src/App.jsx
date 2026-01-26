import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

// Configure React Router future flags
const future = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

// Handlers for lazy loading could go here, but keeping it simple for now
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import AdminBranding from './pages/admin/Branding';
import BusinessUnits from './pages/admin/BusinessUnits';
import Users from './pages/admin/Users';
import Approvals from './pages/Approvals';
import Team from './pages/Team';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Placeholder pages
const AuthCallback = () => {
  const { login } = useAuth();
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      login(token);
      window.location.href = '/';
    } else {
      window.location.href = '/login?error=no_token';
    }
  }, [login]);
  return <div>Authenticating...</div>;
};

function App() {
  return (
    <Routes future={future}>
      <Route path="/login" element={<Login />} future={future}/>
      <Route path="/auth/callback" element={<AuthCallback />} future={future}/>

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      } future={future}>
        <Route index element={<Dashboard />} future={future}/>
        <Route path="calendar" element={<CalendarPage />} future={future}/>
        <Route path="admin/branding" element={<AdminBranding />} future={future}/>
        <Route path="admin/business-units" element={<BusinessUnits />} future={future}/>
        <Route path="admin/users" element={<Users />} future={future}/>
        <Route path="approvals" element={<Approvals />} future={future}/>
        <Route path="team" element={<Team />} future={future}/>
      </Route>
    </Routes>
  );
}

export default App;
