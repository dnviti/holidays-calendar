import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  Grid,
  Card as MuiCard,
  CardContent as MuiCardContent,
  Button as MuiButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';

const Dashboard = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    start_date: '',
    end_date: '',
    title: '',
    description: '',
    business_unit_id: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, [user]);

  const fetchHolidays = async () => {
    try {
      const response = await api.get('/holidays');
      setHolidays(response.data);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      // Get the user's first business unit if not selected (simplification for now)
      let buId = requestData.business_unit_id;
      if (!buId && user.business_unit_memberships?.length > 0) {
        // We need to fetch BUs or rely on preloaded data.
        // For now, let's assume we need to select one.
        // In a real app we'd have a select in the form.
      }

      // Temporary fix: fetch accessible BUs first or let user select
      const buResponse = await api.get('/business-units');
      const bus = buResponse.data;
      if (bus.length > 0 && !buId) {
        buId = bus[0].id;
      }

      await api.post('/holidays', {
        ...requestData,
        business_unit_id: buId
      });

      toast.success('Holiday request submitted!');
      setIsRequestModalOpen(false);
      setRequestData({
        start_date: '',
        end_date: '',
        title: '',
        description: '',
        business_unit_id: ''
      });
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEventDrop = async (info) => {
    const { event } = info;
    try {
      const start = event.start.toISOString().split('T')[0];

      // FullCalendar end date is exclusive, but backend is inclusive.
      // If event.end is null (it happens for 1 day events sometimes in FC), use start.
      // Otherwise subtract 1 day.
      let end = start;
      if (event.end) {
        const endDate = new Date(event.end);
        endDate.setDate(endDate.getDate() - 1);
        end = endDate.toISOString().split('T')[0];
      }

      await api.put(`/holidays/${event.extendedProps.id}`, {
        start_date: start,
        end_date: end
      });

      toast.success('Holiday updated');
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update holiday');
      info.revert();
    }
  };

  const events = holidays.map(h => {
    // Add 1 day to end date for FullCalendar (exclusive end)
    const endDate = new Date(h.end_date);
    endDate.setDate(endDate.getDate() + 1);

    return {
      id: h.id, // Important for drag and drop to identify event
      title: h.title,
      start: h.start_date,
      end: endDate.toISOString().split('T')[0],
      color: h.status === 'approved' ? 'var(--success-color)' : 'var(--warning-color)',
      extendedProps: { ...h },
      editable: h.status === 'pending' // Only allow editing pending requests
    };
  });

  return (
    <Box sx={{ flex: 1, gap: 3, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user?.display_name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here is your holiday overview
          </Typography>
        </Box>
        <MuiButton
          variant="contained"
          onClick={() => setIsRequestModalOpen(true)}
          sx={{ borderRadius: 2, py: 1, px: 3 }}
        >
          Request Leave
        </MuiButton>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <MuiCard sx={{ borderRadius: 2, boxShadow: 2 }}>
            <MuiCardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Pending Requests
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {holidays.filter(h => h.status === 'pending').length}
              </Typography>
            </MuiCardContent>
          </MuiCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <MuiCard sx={{ borderRadius: 2, boxShadow: 2 }}>
            <MuiCardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Approved (This Year)
              </Typography>
              <Typography
                variant="h4"
                component="div"
                fontWeight="bold"
                color="success.main"
              >
                {holidays.filter(h => h.status === 'approved').length}
              </Typography>
            </MuiCardContent>
          </MuiCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <MuiCard sx={{ borderRadius: 2, boxShadow: 2 }}>
            <MuiCardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Holidays
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {holidays.length}
              </Typography>
            </MuiCardContent>
          </MuiCard>
        </Grid>
      </Grid>

      <Box sx={{ flex: 1, minHeight: '600px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CalendarView events={events} onEventDrop={handleEventDrop} />
      </Box>

      <Dialog
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Request Leave</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" onSubmit={handleRequestSubmit} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={requestData.title}
              onChange={e => setRequestData({ ...requestData, title: e.target.value })}
              required
              placeholder="e.g. Summer Vacation"
              margin="normal"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={requestData.start_date}
                  onChange={e => setRequestData({ ...requestData, start_date: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={requestData.end_date}
                  onChange={e => setRequestData({ ...requestData, end_date: e.target.value })}
                  required
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Description"
              value={requestData.description}
              onChange={e => setRequestData({ ...requestData, description: e.target.value })}
              placeholder="Optional"
              multiline
              rows={3}
              margin="normal"
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <MuiButton
            onClick={() => setIsRequestModalOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </MuiButton>
          <MuiButton
            onClick={handleRequestSubmit}
            variant="contained"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Submit Request
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
