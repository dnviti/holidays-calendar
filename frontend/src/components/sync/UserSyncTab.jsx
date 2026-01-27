import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Checkbox,
  Chip,
  Stack,
  TextField,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Sync, Refresh, SelectAll } from '@mui/icons-material';
import { toast } from 'sonner';
import { listMicrosoftUsers, syncUsers } from '../../services/syncApi';

const UserSyncTab = ({ msToken, onSyncComplete }) => {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (msToken) {
      fetchUsers();
    }
  }, [msToken]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listMicrosoftUsers(msToken, {
        search: searchTerm || undefined,
        limit: 1000,
      });
      setUsers(data);
    } catch (error) {
      toast.error(error.message || t('microsoftSync.messages.syncFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSync = async () => {
    if (selectedUsers.size === 0 && users.length > 0) {
      toast.error(t('microsoftSync.messages.selectAtLeastOne', { item: t('microsoftSync.users.syncUsers').toLowerCase() }));
      return;
    }

    setSyncing(true);
    try {
      const request = {
        user_ids: selectedUsers.size === users.length ? null : Array.from(selectedUsers),
        dry_run: dryRun,
        update_existing: true,
      };

      const result = await syncUsers(msToken, request);

      if (result.success) {
        toast.success(
          `${dryRun ? 'Dry run complete' : 'Sync complete'}: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated, ${result.skipped} skipped, ${result.errors.length} errors`
        );

        if (result.errors.length > 0) {
          result.errors.forEach(error => {
            toast.error(t('microsoftSync.messages.syncError', { name: error.name, error: error.error }));
          });
        }

        if (!dryRun && onSyncComplete) {
          onSyncComplete();
        }

        // Clear selection after successful sync
        setSelectedUsers(new Set());
      } else {
        toast.error(t('microsoftSync.messages.syncFailed'));
      }
    } catch (error) {
      toast.error(error.message || t('microsoftSync.messages.syncFailed'));
    } finally {
      setSyncing(false);
    }
  };

  if (!msToken) {
    return (
      <Alert severity="warning">
        Please grant admin consent to preview Microsoft users.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          label="Search users"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchUsers}
          disabled={loading}
        >
          Refresh
        </Button>
        <FormControlLabel
          control={
            <Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          }
          label="Dry Run"
        />
        <Tooltip title="Sync selected users (or all if none selected)">
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
            onClick={handleSync}
            disabled={loading || syncing || users.length === 0}
          >
            {selectedUsers.size > 0 ? `Sync Selected (${selectedUsers.size})` : 'Sync All'}
          </Button>
        </Tooltip>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Alert severity="info">No users found. Try adjusting your search or refresh.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    indeterminate={selectedUsers.size > 0 && selectedUsers.size < users.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  onClick={() => handleSelectUser(user.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedUsers.has(user.id)} />
                  </TableCell>
                  <TableCell>{user.display_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{user.job_title || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_enabled ? 'Active' : 'Disabled'}
                      color={user.is_enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        Total users: {users.length} | Selected: {selectedUsers.size}
      </Typography>
    </Box>
  );
};

export default UserSyncTab;
