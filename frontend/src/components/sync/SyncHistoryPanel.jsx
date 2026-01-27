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
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { toast } from 'sonner';
import { getSyncHistory } from '../../services/syncApi';

const SyncHistoryRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip label={log.sync_type} size="small" variant="outlined" />
        </TableCell>
        <TableCell>{formatDate(log.started_at)}</TableCell>
        <TableCell>
          <Chip label={log.status} color={getStatusColor(log.status)} size="small" />
        </TableCell>
        <TableCell>{log.total_items}</TableCell>
        <TableCell>{log.created_count}</TableCell>
        <TableCell>{log.updated_count}</TableCell>
        <TableCell>{log.deactivated_count}</TableCell>
        <TableCell>{log.error_count}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Completed:</strong>{' '}
                {log.completed_at ? formatDate(log.completed_at) : 'In progress'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Created:</strong> {log.created_count} | <strong>Updated:</strong>{' '}
                {log.updated_count} | <strong>Deactivated:</strong> {log.deactivated_count} |{' '}
                <strong>Skipped:</strong> {log.skipped_count}
              </Typography>
              {log.error_count > 0 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {log.error_count} error(s) occurred during sync
                </Alert>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const SyncHistoryPanel = ({ refreshTrigger }) => {
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getSyncHistory({ limit: 50 });
      setLogs(data);
    } catch (error) {
      toast.error(error.message || t('microsoftSync.messages.syncFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (logs.length === 0) {
    return (
      <Alert severity="info">
        No sync history found. Perform a sync operation to see history here.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Sync History
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Type</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Deactivated</TableCell>
              <TableCell>Errors</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <SyncHistoryRow key={log.id} log={log} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SyncHistoryPanel;
