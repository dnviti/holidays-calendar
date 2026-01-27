import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Alert,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import { CloudSync, Security } from '@mui/icons-material';
import { toast } from 'sonner';
import { getSyncStatus, getConsentUrl } from '../../services/syncApi';
import UserSyncTab from '../../components/sync/UserSyncTab';
import GroupSyncTab from '../../components/sync/GroupSyncTab';
import SyncHistoryPanel from '../../components/sync/SyncHistoryPanel';

const MicrosoftSync = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null);
  const [msToken, setMsToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkSyncStatus();

    // Check if there's a token in session storage
    const storedToken = sessionStorage.getItem('ms_sync_token');
    if (storedToken) {
      setMsToken(storedToken);
    }
  }, []);

  const checkSyncStatus = async () => {
    setLoading(true);
    try {
      const status = await getSyncStatus(msToken);
      setSyncStatus(status);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    try {
      const { consent_url } = await getConsentUrl();

      // Open consent window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const consentWindow = window.open(
        consent_url,
        'Microsoft Admin Consent',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!consentWindow) {
        toast.error('Failed to open consent window. Please allow popups.');
        return;
      }

      // Poll for window closure
      const checkClosed = setInterval(async () => {
        if (consentWindow.closed) {
          clearInterval(checkClosed);
          toast.info('Consent window closed. Checking status...');

          // Check if consent was granted
          // In a real implementation, you'd need to handle the callback
          // and get the token. For now, we'll just check status.
          await checkSyncStatus();
        }
      }, 500);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRequestToken = () => {
    // Open Microsoft login to get elevated token
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      '/api/auth/login',
      'Microsoft Authentication',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!authWindow) {
      toast.error('Failed to open authentication window. Please allow popups.');
      return;
    }

    // Listen for messages from OAuth callback
    const messageHandler = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'ms-token' && event.data.token) {
        window.removeEventListener('message', messageHandler);
        authWindow.close();

        setMsToken(event.data.token);
        sessionStorage.setItem('ms_sync_token', event.data.token);
        toast.success('Microsoft token received');
        checkSyncStatus();
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if window was closed manually
    const checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
      }
    }, 500);
  };

  const handleSyncComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.info('Refreshing sync history...');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudSync /> Microsoft 365 Sync
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sync users and groups from Microsoft 365 to your Holiday Calendar application.
          </Typography>
        </Box>

        {/* Status Banner */}
        {syncStatus && !syncStatus.is_local_admin && (
          <Alert severity="error">
            You must be an administrator to access this feature.
          </Alert>
        )}

        {syncStatus && !syncStatus.has_microsoft_auth && (
          <Alert severity="warning">
            You must be authenticated with Microsoft to use sync features.
            Please log in with your Microsoft account.
          </Alert>
        )}

        {syncStatus && syncStatus.needs_consent && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<Security />}
                onClick={handleGrantConsent}
              >
                Grant Consent
              </Button>
            }
          >
            Admin consent required. Click "Grant Consent" to authorize elevated permissions.
          </Alert>
        )}

        {syncStatus && !msToken && syncStatus.has_microsoft_admin === false && (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleRequestToken}
              >
                Get Token
              </Button>
            }
          >
            A Microsoft access token is required for sync operations. Click "Get Token" to authenticate.
          </Alert>
        )}

        {/* Main Content */}
        {syncStatus && syncStatus.is_local_admin && (
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Sync Users" />
              <Tab label="Sync Groups" />
              <Tab label="History" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {activeTab === 0 && (
                <UserSyncTab msToken={msToken} onSyncComplete={handleSyncComplete} />
              )}
              {activeTab === 1 && (
                <GroupSyncTab msToken={msToken} onSyncComplete={handleSyncComplete} />
              )}
              {activeTab === 2 && <SyncHistoryPanel refreshTrigger={refreshTrigger} />}
            </Box>
          </Paper>
        )}

        {/* Instructions */}
        <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            How to use Microsoft 365 Sync
          </Typography>
          <Typography variant="body2" component="div" color="text.secondary">
            <ol>
              <li>Ensure you're logged in with your Microsoft admin account</li>
              <li>Grant admin consent if prompted (required once)</li>
              <li>Navigate to "Sync Users" or "Sync Groups" tab</li>
              <li>Select specific items or sync all</li>
              <li>Enable "Dry Run" to preview changes without committing</li>
              <li>Click "Sync" to perform the synchronization</li>
              <li>View results in the "History" tab</li>
            </ol>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              <strong>Note:</strong> Group sync will automatically create users for group members
              if they don't exist. Users removed from Microsoft 365 will be automatically
              deactivated during user sync.
            </Typography>
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
};

export default MicrosoftSync;
