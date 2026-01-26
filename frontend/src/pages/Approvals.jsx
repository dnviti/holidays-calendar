import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  Card as MuiCard,
  CardContent as MuiCardContent,
  CardHeader,
  Avatar,
  Chip,
  Button,
  Grid,
  Stack,
  Alert
} from '@mui/material';
import { Check, Clear } from '@mui/icons-material';

const Approvals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/holidays/pending');
      setPendingRequests(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, notes = '') => {
    try {
      const endpoint = action === 'approve'
        ? `/holidays/${id}/approve`
        : `/holidays/${id}/reject`;

      await api.post(endpoint, {}, { params: { notes } });

      toast.success(`Request ${action}d successfully`);
      fetchPendingRequests();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} request`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Leave Approvals
      </Typography>

      {pendingRequests.length === 0 ? (
        <MuiCard sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="info">No pending requests at the moment.</Alert>
        </MuiCard>
      ) : (
        <Grid container spacing={2}>
          {pendingRequests.map(request => (
            <Grid xs={12} key={request.id}>
              <MuiCard>
                <MuiCardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} md={8}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={request.user_avatar} sx={{ bgcolor: 'primary.main' }}>
                          {request.user_name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="h3">
                            {request.user_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {request.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                            <Chip
                              label={`${request.duration_days} days`}
                              size="small"
                              sx={{ ml: 1, verticalAlign: 'middle' }}
                            />
                          </Typography>

                          {/* Overlap Warning */}
                          {request.has_overlap && (
                            <Alert
                              severity="warning"
                              sx={{ mt: 1, alignItems: 'center' }}
                            >
                              ⚠ Warning: Overlaps with {request.overlapping_users.join(', ')}
                            </Alert>
                          )}
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid xs={12} md={4}>
                      <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} sx={{ mt: { xs: 2, md: 0 } }}>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Clear />}
                          onClick={() => handleAction(request.id, 'reject')}
                          sx={{ minWidth: 120 }}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          onClick={() => handleAction(request.id, 'approve')}
                          sx={{ minWidth: 120 }}
                        >
                          Approve
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </MuiCardContent>
              </MuiCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Approvals;
