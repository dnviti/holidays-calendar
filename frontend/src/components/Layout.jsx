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
  X,
  RefreshCw
} from 'lucide-react';
import {
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Button,
  CssBaseline,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { branding } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));

  const closeSidebar = () => isMobile && setIsOpen(false);

  const navItems = [
    { to: '/', icon: <Briefcase size={20} />, text: 'Dashboard' },
    { to: '/calendar', icon: <Calendar size={20} />, text: 'Calendar' },
  ];

  const managerItems = [
    { to: '/approvals', icon: <span>✓</span>, text: 'Approvals' },
    { to: '/team', icon: <Users size={20} />, text: 'My Team' },
  ];

  const adminItems = [
    { to: '/admin/users', icon: <Users size={20} />, text: 'Users' },
    { to: '/admin/business-units', icon: <Building2 size={20} />, text: 'Business Units' },
    { to: '/admin/microsoft-sync', icon: <RefreshCw size={20} />, text: 'Microsoft Sync' },
    { to: '/admin/branding', icon: <Settings size={20} />, text: 'Branding' },
  ];

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={!isMobile || isOpen}
      onClose={() => setIsOpen(false)}
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          color: 'text.primary',
        },
      }}
    >
      <Toolbar sx={{
        height: '64px',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt="Logo" style={{ height: '32px', width: 'auto' }} />
        ) : (
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {branding?.app_name || 'Holidays'}
          </Typography>
        )}
        {isMobile && (
          <IconButton onClick={() => setIsOpen(false)}>
            <X size={24} />
          </IconButton>
        )}
      </Toolbar>

      <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
        {/* Navigation */}
        <List>
          {navItems.map((item) => (
            <ListItem key={item.to} disablePadding>
              <NavLink
                to={item.to}
                onClick={closeSidebar}
                style={{ textDecoration: 'none', width: '100%' }}
              >
                {({ isActive }) => (
                  <ListItemButton
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      backgroundColor: isActive ? 'primary.light' : 'transparent',
                      color: isActive ? 'primary.main' : 'text.primary',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} sx={{ color: isActive ? 'primary.main' : 'text.primary' }} />
                  </ListItemButton>
                )}
              </NavLink>
            </ListItem>
          ))}
        </List>

        {isManager && (
          <>
            <Divider sx={{ my: 2 }}>Management</Divider>
            <List>
              {managerItems.map((item) => (
                <ListItem key={item.to} disablePadding>
                  <NavLink
                    to={item.to}
                    onClick={closeSidebar}
                    style={{ textDecoration: 'none', width: '100%' }}
                  >
                    {({ isActive }) => (
                      <ListItemButton
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          backgroundColor: isActive ? 'primary.light' : 'transparent',
                          color: isActive ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} sx={{ color: isActive ? 'primary.main' : 'text.primary' }} />
                      </ListItemButton>
                    )}
                  </NavLink>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {isAdmin && (
          <>
            <Divider sx={{ my: 2 }}>Administration</Divider>
            <List>
              {adminItems.map((item) => (
                <ListItem key={item.to} disablePadding>
                  <NavLink
                    to={item.to}
                    onClick={closeSidebar}
                    style={{ textDecoration: 'none', width: '100%' }}
                  >
                    {({ isActive }) => (
                      <ListItemButton
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          backgroundColor: isActive ? 'primary.light' : 'transparent',
                          color: isActive ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} sx={{ color: isActive ? 'primary.main' : 'text.primary' }} />
                      </ListItemButton>
                    )}
                  </NavLink>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>

      {/* User Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {user?.avatar_url ? (
            <Avatar src={user.avatar_url} alt={user.display_name} />
          ) : (
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user?.display_name?.charAt(0)}
            </Avatar>
          )}
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" noWrap>{user?.display_name}</Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={logout}
          startIcon={<LogOut size={16} />}
          fullWidth
          variant="outlined"
          sx={{ color: 'error.main', borderColor: 'error.main', '&:hover': { borderColor: 'error.dark' } }}
        >
          Sign Out
        </Button>
      </Box>
    </Drawer>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', overflow: 'auto' }}>
        {/* Mobile Header */}
        {isMobile && (
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper' }}>
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={() => setSidebarOpen(true)}
                edge="start"
                sx={{ mr: 2 }}
              >
                <Menu />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary' }}>
                {window.location.pathname.split('/').pop() || 'Dashboard'}
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {isMobile && <Toolbar />} {/* Spacer for fixed AppBar on mobile */}

        {/* Main Content */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
