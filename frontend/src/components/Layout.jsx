import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Calendar,
  LogOut,
  Settings,
  Users,
  Building2,
  Briefcase,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { branding } = useTheme();

  const closeSidebar = () => window.innerWidth < 1024 && setIsOpen(false);

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 transform bg-surface border-r border-border transition-transform duration-200 lg:static lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `} style={{
        backgroundColor: 'var(--surface-color)',
        borderColor: 'var(--border-color)'
      }}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-border" style={{ borderColor: 'var(--border-color)' }}>
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="Logo" className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-bold text-primary" style={{ color: 'var(--primary-color)' }}>
              {branding?.app_name || 'Holidays'}
            </span>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden ml-auto"
            style={{ color: 'var(--text-secondary-color)' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem to="/" icon={<Briefcase size={20} />} onClick={closeSidebar}>Dashboard</NavItem>
          <NavItem to="/calendar" icon={<Calendar size={20} />} onClick={closeSidebar}>Calendar</NavItem>

          {isManager && (
            <>
              <div className="mt-8 mb-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>
                Management
              </div>
              <NavItem to="/approvals" icon={<React.Fragment>✓</React.Fragment>} onClick={closeSidebar}>Approvals</NavItem>
              <NavItem to="/team" icon={<Users size={20} />} onClick={closeSidebar}>My Team</NavItem>
            </>
          )}

          {isAdmin && (
            <>
              <div className="mt-8 mb-2 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary-color)' }}>
                Administration
              </div>
              <NavItem to="/admin/users" icon={<Users size={20} />} onClick={closeSidebar}>Users</NavItem>
              <NavItem to="/admin/business-units" icon={<Building2 size={20} />} onClick={closeSidebar}>Business Units</NavItem>
              <NavItem to="/admin/branding" icon={<Settings size={20} />} onClick={closeSidebar}>Branding</NavItem>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-4">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
                {user?.display_name?.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.display_name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary-color)' }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors hover:bg-card"
            style={{ color: 'var(--danger-color)' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors
      ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-card hover:text-text-primary'}
    `}
    style={({ isActive }) => isActive ? {
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      color: 'var(--primary-color)'
    } : {
      color: 'var(--text-secondary-color)'
    }}
  >
    {icon}
    {children}
  </NavLink>
);

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center h-16 px-4 border-b border-border bg-surface"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-color)' }}
        >
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-card">
            <Menu size={24} />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
