import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const { branding } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMicrosoftLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/login`;
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login-local', new URLSearchParams({
        username: email,
        password: password
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md card space-y-8" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(30, 41, 59, 0.7)' }}>
        <div className="flex flex-col items-center">
          <div className="mb-6 flex justify-center">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-12 w-auto" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl bg-primary text-white" style={{ backgroundColor: 'var(--primary-color)' }}>
                {branding?.app_name?.charAt(0) || 'H'}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-center">
            {branding?.app_name || 'Holiday Calendar'}
          </h1>
          <p className="text-secondary text-center mt-2">
            Sign in to continue
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLocalLogin} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@company.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            className="w-full py-3 text-lg" // Larger touch target
            disabled={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-secondary">Or continue with</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full py-3"
          onClick={handleMicrosoftLogin}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H10V10H1V1Z" fill="#F25022" />
            <path d="M11 1H20V10H11V1Z" fill="#7FBA00" />
            <path d="M1 11H10V20H1V11Z" fill="#00A4EF" />
            <path d="M11 11H20V20H11V11Z" fill="#FFB900" />
          </svg>
          Sign in with Microsoft 365
        </Button>
      </div>
    </div>
  );
};

export default Login;
