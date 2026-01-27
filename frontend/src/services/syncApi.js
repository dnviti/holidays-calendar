import api from './api';

/**
 * Get sync status and permissions
 */
export const getSyncStatus = async (msToken = null) => {
  try {
    const headers = msToken ? { 'X-MS-Token': msToken } : {};
    const response = await api.get('/sync/status', { headers });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to get sync status');
  }
};

/**
 * Get Microsoft admin consent URL
 */
export const getConsentUrl = async () => {
  try {
    const response = await api.get('/sync/consent-url');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to get consent URL');
  }
};

/**
 * List Microsoft users (preview)
 */
export const listMicrosoftUsers = async (msToken, params = {}) => {
  try {
    const headers = { 'X-MS-Token': msToken };
    const response = await api.get('/sync/microsoft/users', { headers, params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch Microsoft users');
  }
};

/**
 * List Microsoft groups (preview)
 */
export const listMicrosoftGroups = async (msToken, params = {}) => {
  try {
    const headers = { 'X-MS-Token': msToken };
    const response = await api.get('/sync/microsoft/groups', { headers, params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch Microsoft groups');
  }
};

/**
 * Sync users from Microsoft 365
 */
export const syncUsers = async (msToken, request) => {
  try {
    const headers = { 'X-MS-Token': msToken };
    const response = await api.post('/sync/users', request, { headers });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to sync users');
  }
};

/**
 * Sync groups from Microsoft 365
 */
export const syncGroups = async (msToken, request) => {
  try {
    const headers = { 'X-MS-Token': msToken };
    const response = await api.post('/sync/groups', request, { headers });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to sync groups');
  }
};

/**
 * Get sync history
 */
export const getSyncHistory = async (params = {}) => {
  try {
    const response = await api.get('/sync/history', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch sync history');
  }
};

/**
 * Helper function to initiate Microsoft OAuth flow with elevated scopes
 * Returns a promise that resolves when the OAuth flow completes
 */
export const requestElevatedScopes = () => {
  return new Promise((resolve, reject) => {
    // Open OAuth window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      '/api/auth/login?scope=elevated',
      'Microsoft Authentication',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!authWindow) {
      reject(new Error('Failed to open authentication window'));
      return;
    }

    // Listen for messages from the OAuth window
    const messageHandler = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-success' && event.data.accessToken) {
        window.removeEventListener('message', messageHandler);
        authWindow.close();
        resolve(event.data.accessToken);
      } else if (event.data.type === 'oauth-error') {
        window.removeEventListener('message', messageHandler);
        authWindow.close();
        reject(new Error(event.data.error || 'Authentication failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if window was closed manually
    const checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Authentication window was closed'));
      }
    }, 500);
  });
};
