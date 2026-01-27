import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  getCalendarHolidays,
  updateHoliday,
  deleteHoliday,
  approveHoliday,
  rejectHoliday,
  requestChangeHoliday
} from '../services/holidayService';

const CalendarPage = () => {
  const { t } = useTranslation('calendar');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBU, setSelectedBU] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const { user } = useAuth();
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchBusinessUnits();
  }, []);

  useEffect(() => {
    if (selectedBU) {
      fetchCalendarData(selectedBU);
    }
  }, [selectedBU]);

  const fetchBusinessUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setBusinessUnits(response.data);
      if (response.data.length > 0) {
        setSelectedBU(response.data[0].id);
      } else {
        // No business units available, stop loading
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(t('messages.fetchBusinessUnitsFailed'));
      setLoading(false);
    }
  };

  const fetchCalendarData = async (buId) => {
    setLoadingEvents(true);
    try {
      // Fetch full year for broad coverage
      const start = new Date().getFullYear() + '-01-01';
      const end = new Date().getFullYear() + '-12-31';

      // Fetch holidays
      const holidays = await getCalendarHolidays(buId, start, end);

      // Transform holiday API data to FullCalendar format
      const transformedHolidays = holidays.map(holiday => ({
        id: holiday.id,
        title: holiday.title,
        start: holiday.start,
        end: holiday.end,
        allDay: true, // Holidays are always all-day events
        backgroundColor: holiday.color,
        borderColor: holiday.color,
        textColor: '#ffffff',
        extendedProps: {
          user_id: holiday.user_id,
          userName: holiday.user_name,
          userAvatar: holiday.user_avatar,
          holidayType: holiday.holiday_type,
          status: holiday.status,
          has_overlap: holiday.has_overlap,
          is_half_day: holiday.is_half_day,
          half_day_period: holiday.half_day_period,
          business_unit_id: buId,
          description: holiday.description || '',
          category: 'holiday'
        }
      }));

      setCalendarEvents(transformedHolidays);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadCalendarFailed'));
    } finally {
      setLoading(false);
      setLoadingEvents(false);
    }
  };

  const handleCreateHoliday = async (newHoliday) => {
    try {
      // Transform the API response to FullCalendar format
      const transformedHoliday = {
        id: newHoliday.id,
        title: newHoliday.title,
        start: newHoliday.start_date,
        end: newHoliday.end_date,
        allDay: true,
        backgroundColor: newHoliday.color || '#3B82F6',
        borderColor: newHoliday.color || '#3B82F6',
        textColor: '#ffffff',
        extendedProps: {
          user_id: newHoliday.user_id,
          userName: newHoliday.user_name,
          userAvatar: newHoliday.user_avatar,
          holidayType: newHoliday.holiday_type,
          status: newHoliday.status,
          has_overlap: newHoliday.has_overlap,
          is_half_day: newHoliday.is_half_day,
          half_day_period: newHoliday.half_day_period,
          business_unit_id: newHoliday.business_unit_id,
          description: newHoliday.description || '',
          manager_notes: newHoliday.manager_notes,
          category: 'holiday'
        }
      };

      // Add the new holiday to the calendar
      setCalendarEvents(prev => [...prev, transformedHoliday]);
      toast.success(t('messages.holidayCreated'));
    } catch (error) {
      toast.error(t('messages.holidayCreated'));
    }
  };

  const handleUpdateHoliday = async (updatedHoliday) => {
    try {
      // Extract ID and remove it from the update data
      const { id, ...updateData } = updatedHoliday;

      // Update the holiday in the backend
      const updatedHolidayFromAPI = await updateHoliday(id, updateData);

      // Transform the API response to FullCalendar format
      const transformedHoliday = {
        id: updatedHolidayFromAPI.id,
        title: updatedHolidayFromAPI.title,
        start: updatedHolidayFromAPI.start_date,
        end: updatedHolidayFromAPI.end_date,
        allDay: true,
        backgroundColor: updatedHolidayFromAPI.color || '#3B82F6',
        borderColor: updatedHolidayFromAPI.color || '#3B82F6',
        textColor: '#ffffff',
        extendedProps: {
          user_id: updatedHolidayFromAPI.user_id,
          userName: updatedHolidayFromAPI.user_name,
          userAvatar: updatedHolidayFromAPI.user_avatar,
          holidayType: updatedHolidayFromAPI.holiday_type,
          status: updatedHolidayFromAPI.status,
          has_overlap: updatedHolidayFromAPI.has_overlap,
          is_half_day: updatedHolidayFromAPI.is_half_day,
          half_day_period: updatedHolidayFromAPI.half_day_period,
          business_unit_id: updatedHolidayFromAPI.business_unit_id,
          description: updatedHolidayFromAPI.description || '',
          manager_notes: updatedHolidayFromAPI.manager_notes,
          category: 'holiday'
        }
      };

      setCalendarEvents(prev => prev.map(e => e.id === id ? transformedHoliday : e));
      toast.success(t('messages.holidayUpdated'));
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t('messages.holidayUpdated'));
    }
  };

  const handleEventDrop = async (dropInfo) => {
    try {
      // For holidays, drag-and-drop updates the dates
      const updatedHolidayData = {
        start_date: dropInfo.event.start.toISOString().split('T')[0],
        end_date: dropInfo.event.end ? dropInfo.event.end.toISOString().split('T')[0] : dropInfo.event.start.toISOString().split('T')[0],
      };

      // Update the holiday in the backend
      const updatedHoliday = await updateHoliday(dropInfo.event.id, updatedHolidayData);

      // Transform and update in calendar
      const transformedHoliday = {
        id: updatedHoliday.id,
        title: updatedHoliday.title,
        start: updatedHoliday.start_date,
        end: updatedHoliday.end_date,
        allDay: true,
        backgroundColor: updatedHoliday.color || '#3B82F6',
        borderColor: updatedHoliday.color || '#3B82F6',
        textColor: '#ffffff',
        extendedProps: {
          user_id: updatedHoliday.user_id,
          userName: updatedHoliday.user_name,
          userAvatar: updatedHoliday.user_avatar,
          holidayType: updatedHoliday.holiday_type,
          status: updatedHoliday.status,
          has_overlap: updatedHoliday.has_overlap,
          is_half_day: updatedHoliday.is_half_day,
          half_day_period: updatedHoliday.half_day_period,
          business_unit_id: updatedHoliday.business_unit_id,
          description: updatedHoliday.description || '',
          manager_notes: updatedHoliday.manager_notes,
          category: 'holiday'
        }
      };

      setCalendarEvents(prev =>
        prev.map(e => e.id === dropInfo.event.id ? transformedHoliday : e)
      );

      toast.success(t('messages.leaveDatesUpdated'));
    } catch (error) {
      toast.error(t('messages.moveLeaveRequestFailed'));
      // Revert the drop
      dropInfo.revert();
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      // Delete the holiday from the backend
      await deleteHoliday(holidayId);

      // Remove the holiday from the calendar
      setCalendarEvents(prev => prev.filter(e => e.id !== holidayId));
      toast.success(t('messages.holidayDeleted'));
    } catch (error) {
      toast.error(t('messages.holidayDeleted'));
    }
  };

  const handleApproveHoliday = async (holidayId, notes) => {
    try {
      const updatedHoliday = await approveHoliday(holidayId, notes);

      // Transform and update in calendar
      const transformedHoliday = {
        id: updatedHoliday.id,
        title: updatedHoliday.title,
        start: updatedHoliday.start_date,
        end: updatedHoliday.end_date,
        allDay: true,
        backgroundColor: updatedHoliday.color || '#10B981', // Green for approved
        borderColor: updatedHoliday.color || '#10B981',
        textColor: '#ffffff',
        extendedProps: {
          user_id: updatedHoliday.user_id,
          userName: updatedHoliday.user_name,
          userAvatar: updatedHoliday.user_avatar,
          holidayType: updatedHoliday.holiday_type,
          status: 'approved',
          has_overlap: updatedHoliday.has_overlap,
          is_half_day: updatedHoliday.is_half_day,
          half_day_period: updatedHoliday.half_day_period,
          business_unit_id: updatedHoliday.business_unit_id,
          description: updatedHoliday.description || '',
          manager_notes: updatedHoliday.manager_notes,
          category: 'holiday'
        }
      };

      setCalendarEvents(prev => prev.map(e => e.id === holidayId ? transformedHoliday : e));
      toast.success(t('messages.leaveApproved'));
    } catch (error) {
      toast.error(t('messages.approveLeaveRequestFailed'));
    }
  };

  const handleRejectHoliday = async (holidayId, notes) => {
    try {
      const updatedHoliday = await rejectHoliday(holidayId, notes);

      // Transform and update in calendar
      const transformedHoliday = {
        id: updatedHoliday.id,
        title: updatedHoliday.title,
        start: updatedHoliday.start_date,
        end: updatedHoliday.end_date,
        allDay: true,
        backgroundColor: '#EF4444', // Red for rejected
        borderColor: '#EF4444',
        textColor: '#ffffff',
        extendedProps: {
          user_id: updatedHoliday.user_id,
          userName: updatedHoliday.user_name,
          userAvatar: updatedHoliday.user_avatar,
          holidayType: updatedHoliday.holiday_type,
          status: 'rejected',
          has_overlap: updatedHoliday.has_overlap,
          is_half_day: updatedHoliday.is_half_day,
          half_day_period: updatedHoliday.half_day_period,
          business_unit_id: updatedHoliday.business_unit_id,
          description: updatedHoliday.description || '',
          manager_notes: notes,
          category: 'holiday'
        }
      };

      setCalendarEvents(prev => prev.map(e => e.id === holidayId ? transformedHoliday : e));
      toast.success(t('messages.leaveRejected'));
    } catch (error) {
      toast.error(t('messages.rejectLeaveRequestFailed'));
    }
  };

  const handleRequestChange = async (holidayId, notes) => {
    try {
      const updatedHoliday = await requestChangeHoliday(holidayId, notes);

      // Transform and update in calendar
      const transformedHoliday = {
        id: updatedHoliday.id,
        title: updatedHoliday.title,
        start: updatedHoliday.start_date,
        end: updatedHoliday.end_date,
        allDay: true,
        backgroundColor: '#F97316', // Orange for change requested
        borderColor: '#F97316',
        textColor: '#ffffff',
        extendedProps: {
          user_id: updatedHoliday.user_id,
          userName: updatedHoliday.user_name,
          userAvatar: updatedHoliday.user_avatar,
          holidayType: updatedHoliday.holiday_type,
          status: 'change_requested',
          has_overlap: updatedHoliday.has_overlap,
          is_half_day: updatedHoliday.is_half_day,
          half_day_period: updatedHoliday.half_day_period,
          business_unit_id: updatedHoliday.business_unit_id,
          description: updatedHoliday.description || '',
          manager_notes: notes,
          category: 'holiday'
        }
      };

      setCalendarEvents(prev => prev.map(e => e.id === holidayId ? transformedHoliday : e));
      toast.success(t('messages.leaveChangeRequested'));
    } catch (error) {
      toast.error(t('messages.requestChangeFailed'));
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            {t('title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        <FormControl
          variant="outlined"
          sx={{
            minWidth: { xs: '100%', md: 250 }
          }}
        >
          <InputLabel>{t('selectBusinessUnit')}</InputLabel>
          <Select
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            label={t('selectBusinessUnit')}
            disabled={loading}
          >
            {businessUnits.map((bu) => (
              <MenuItem key={bu.id} value={bu.id}>
                {bu.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Calendar Area */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2
            }}
          >
            <CircularProgress />
          </Box>
        ) : businessUnits.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 4
            }}
          >
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              {t('noBusinessUnits')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('noBusinessUnitsDescription')}
            </Typography>
          </Box>
        ) : (
          <CalendarView
            events={calendarEvents}
            businessUnitName={businessUnits.find(b => b.id === selectedBU)?.name}
            selectedBusinessUnit={selectedBU}
            onCreateEvent={handleCreateHoliday}
            onUpdateEvent={handleUpdateHoliday}
            onDeleteEvent={handleDeleteHoliday}
            onEventDrop={handleEventDrop}
            onApproveEvent={handleApproveHoliday}
            onRejectEvent={handleRejectHoliday}
            onRequestChange={handleRequestChange}
            businessUnits={businessUnits}
            showEventCreation={true}
          />
        )}
      </Box>
    </Box>
  );
};

export default CalendarPage;
