import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import { toast } from 'sonner';
import {
  deleteHoliday,
  approveHoliday,
  rejectHoliday,
  requestChangeHoliday
} from '../services/holidayService';
import {
  Box,
  Typography,
  Grid,
  Card as MuiCard,
  CardContent as MuiCardContent,
  Button as MuiButton
} from '@mui/material';
import LeaveRequestDialog from '../components/LeaveRequestDialog';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [businessUnits, setBusinessUnits] = useState([]);

  useEffect(() => {
    fetchHolidays();
    fetchBusinessUnits();
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

  const fetchBusinessUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setBusinessUnits(response.data);
    } catch (error) {
      console.error('Failed to fetch business units:', error);
    }
  };

  const handleCreateHoliday = () => {
    fetchHolidays();
  };

  const handleUpdateHoliday = () => {
    fetchHolidays();
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      await deleteHoliday(holidayId);
      toast.success(t('messages.holidayDeleted'));
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.holidayDeleteFailed'));
    }
  };

  const handleApproveHoliday = async (holidayId, notes) => {
    try {
      await approveHoliday(holidayId, notes);
      toast.success(t('messages.leaveApproved'));
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.approveLeaveRequestFailed'));
    }
  };

  const handleRejectHoliday = async (holidayId, notes) => {
    try {
      await rejectHoliday(holidayId, notes);
      toast.success(t('messages.leaveRejected'));
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.rejectLeaveRequestFailed'));
    }
  };

  const handleRequestChange = async (holidayId, notes) => {
    try {
      await requestChangeHoliday(holidayId, notes);
      toast.success(t('messages.leaveChangeRequested'));
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.requestChangeFailed'));
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

      toast.success(t('messages.holidayUpdated'));
      fetchHolidays();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.holidayUpdateFailed'));
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
            {t('welcome', { name: user?.display_name })}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
        <MuiButton
          variant="contained"
          onClick={() => setIsRequestModalOpen(true)}
          sx={{ borderRadius: 2, py: 1, px: 3 }}
        >
          {t('requestLeave.button')}
        </MuiButton>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <MuiCard sx={{ borderRadius: 2, boxShadow: 2 }}>
            <MuiCardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('stats.pendingRequests')}
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
                {t('stats.approvedThisYear')}
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
                {t('stats.totalHolidays')}
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {holidays.length}
              </Typography>
            </MuiCardContent>
          </MuiCard>
        </Grid>
      </Grid>

      <Box sx={{ flex: 1, minHeight: '600px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CalendarView
          events={events}
          onEventDrop={handleEventDrop}
          onCreateEvent={handleCreateHoliday}
          onUpdateEvent={handleUpdateHoliday}
          onDeleteEvent={handleDeleteHoliday}
          onApproveEvent={handleApproveHoliday}
          onRejectEvent={handleRejectHoliday}
          onRequestChange={handleRequestChange}
          businessUnits={businessUnits}
          showEventCreation={true}
        />
      </Box>

      <LeaveRequestDialog
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          toast.success(t('requestLeave.success'));
          setIsRequestModalOpen(false);
          fetchHolidays();
        }}
        businessUnits={businessUnits}
      />
    </Box>
  );
};

export default Dashboard;
