import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Sync, Refresh } from '@mui/icons-material';
import { toast } from 'sonner';
import { listMicrosoftGroups, syncGroups } from '../../services/syncApi';

const GroupSyncTab = ({ msToken, onSyncComplete }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (msToken) {
      fetchGroups();
    }
  }, [msToken]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await listMicrosoftGroups(msToken, {
        search: searchTerm || undefined,
        limit: 1000,
      });
      setGroups(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.id)));
    }
  };

  const handleSelectGroup = (groupId) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    setSelectedGroups(newSelection);
  };

  const handleSync = async () => {
    if (selectedGroups.size === 0 && groups.length > 0) {
      toast.error('Please select at least one group or use "Sync All"');
      return;
    }

    setSyncing(true);
    try {
      const request = {
        group_ids: selectedGroups.size === groups.length ? null : Array.from(selectedGroups),
        dry_run: dryRun,
        include_members: includeMembers,
      };

      const result = await syncGroups(msToken, request);

      if (result.success) {
        toast.success(
          `${dryRun ? 'Dry run complete' : 'Sync complete'}: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`
        );

        if (result.errors.length > 0) {
          result.errors.forEach(error => {
            toast.error(`${error.name}: ${error.error}`);
          });
        }

        if (!dryRun && onSyncComplete) {
          onSyncComplete();
        }

        // Clear selection after successful sync
        setSelectedGroups(new Set());
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!msToken) {
    return (
      <Alert severity="warning">
        Please grant admin consent to preview Microsoft groups.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          label="Search groups"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchGroups()}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchGroups}
          disabled={loading}
        >
          Refresh
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={includeMembers}
              onChange={(e) => setIncludeMembers(e.target.checked)}
            />
          }
          label="Include Members"
        />
        <FormControlLabel
          control={
            <Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          }
          label="Dry Run"
        />
        <Tooltip title="Sync selected groups (or all if none selected)">
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
            onClick={handleSync}
            disabled={loading || syncing || groups.length === 0}
          >
            {selectedGroups.size > 0 ? `Sync Selected (${selectedGroups.size})` : 'Sync All'}
          </Button>
        </Tooltip>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Alert severity="info">No groups found. Try adjusting your search or refresh.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedGroups.size === groups.length && groups.length > 0}
                    indeterminate={selectedGroups.size > 0 && selectedGroups.size < groups.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Members</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow
                  key={group.id}
                  hover
                  onClick={() => handleSelectGroup(group.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedGroups.has(group.id)} />
                  </TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description || '-'}</TableCell>
                  <TableCell>{group.mail || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${group.member_count} members`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        Total groups: {groups.length} | Selected: {selectedGroups.size}
      </Typography>

      {includeMembers && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Group members will be automatically created as users if they don't exist.
        </Alert>
      )}
    </Box>
  );
};

export default GroupSyncTab;
