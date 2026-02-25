import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import { toast } from 'sonner';
import {
  getCalendarHolidays,
  updateHoliday,
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
  Button as MuiButton,
  Autocomplete,
  Checkbox,
  TextField,
  Chip,
  CircularProgress
} from '@mui/material';
import { CheckBoxOutlineBlank, CheckBox } from '@mui/icons-material';
import LeaveRequestDialog from '../components/LeaveRequestDialog';

const icon = <CheckBoxOutlineBlank fontSize="small" />;
const checkedIcon = <CheckBox fontSize="small" />;

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [selectedBUs, setSelectedBUs] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Keep a ref to selectedBUs for use inside fetchCalendarData without re-creating the callback
  const selectedBUsRef = useRef(selectedBUs);
  selectedBUsRef.current = selectedBUs;

  useEffect(() => {
    fetchBusinessUnits();
  }, [user]);

  const fetchBusinessUnits = async () => {
    try {
      const response = await api.get('/business-units');
      setBusinessUnits(response.data);
      setSelectedBUs(response.data); // Select all by default
    } catch (error) {
      console.error('Failed to fetch business units:', error);
    }
  };

  const fetchCalendarData = useCallback(async (bus = null) => {
    const buList = bus || selectedBUsRef.current;
    if (buList.length === 0) {
      setCalendarEvents([]);
      setLoading(false);
      return;
    }

    setLoadingEvents(true);
    try {
      const year = new Date().getFullYear();
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;

      const results = await Promise.all(
        buList.map(bu =>
          getCalendarHolidays(bu.id, start, end).then(holidays => ({ buId: bu.id, holidays }))
        )
      );

      // Merge and deduplicate by holiday id
      const seen = new Set();
      const allEvents = [];
      for (const { buId, holidays } of results) {
        for (const h of holidays) {
          if (!seen.has(h.id)) {
            seen.add(h.id);
            allEvents.push({
              id: h.id,
              title: h.title,
              start: h.start,
              end: h.end,
              allDay: true,
              backgroundColor: h.color,
              borderColor: h.color,
              textColor: '#ffffff',
              extendedProps: {
                user_id: h.user_id,
                userName: h.user_name,
                userAvatar: h.user_avatar,
                holidayType: h.holiday_type,
                status: h.status,
                has_overlap: h.has_overlap,
                business_unit_id: buId,
                description: h.description || '',
                category: 'holiday'
              }
            });
          }
        }
      }

      setCalendarEvents(allEvents);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadCalendarFailed'));
    } finally {
      setLoading(false);
      setLoadingEvents(false);
    }
  }, [t]);

  // Fetch calendar data when selected BUs change
  useEffect(() => {
    if (businessUnits.length > 0) {
      fetchCalendarData(selectedBUs);
    }
  }, [selectedBUs, businessUnits.length, fetchCalendarData]);

  const handleCreateHoliday = () => {
    fetchCalendarData();
  };

  const handleUpdateHoliday = () => {
    fetchCalendarData();
  };

  const handleDeleteHoliday = async (holidayId) => {
    try {
      await deleteHoliday(holidayId);
      toast.success(t('messages.holidayDeleted'));
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.holidayDeleteFailed'));
    }
  };

  const handleApproveHoliday = async (holidayId, notes) => {
    try {
      await approveHoliday(holidayId, notes);
      toast.success(t('messages.leaveApproved'));
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.approveLeaveRequestFailed'));
    }
  };

  const handleRejectHoliday = async (holidayId, notes) => {
    try {
      await rejectHoliday(holidayId, notes);
      toast.success(t('messages.leaveRejected'));
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.rejectLeaveRequestFailed'));
    }
  };

  const handleRequestChange = async (holidayId, notes) => {
    try {
      await requestChangeHoliday(holidayId, notes);
      toast.success(t('messages.leaveChangeRequested'));
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.requestChangeFailed'));
    }
  };

  const handleEventDrop = async (dropInfo) => {
    try {
      const startDate = dropInfo.event.startStr.split('T')[0];
      let endDate = startDate;

      if (dropInfo.event.endStr) {
        if (dropInfo.event.allDay) {
          const [y, m, dy] = dropInfo.event.endStr.split('T')[0].split('-').map(Number);
          const endObj = new Date(y, m - 1, dy - 1);
          const calculated = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
          if (calculated >= startDate) endDate = calculated;
        } else {
          endDate = dropInfo.event.endStr.split('T')[0];
        }
      }

      await updateHoliday(dropInfo.event.id, {
        start_date: startDate,
        end_date: endDate,
      });

      toast.success(t('messages.holidayUpdated'));
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.holidayUpdateFailed'));
      dropInfo.revert();
    }
  };

  const pendingCount = calendarEvents.filter(e => e.extendedProps.status === 'pending').length;
  const approvedCount = calendarEvents.filter(e => e.extendedProps.status === 'approved').length;
  const totalCount = calendarEvents.length;

  return (
    <Box sx={{ flex: 1, gap: 3, p: 3 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('welcome', { name: user?.display_name })}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Multi-BU Selector */}
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={businessUnits}
            value={selectedBUs}
            onChange={(_, newValue) => setSelectedBUs(newValue)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    checked={selected}
                    sx={{ mr: 1 }}
                  />
                  {option.name}
                </li>
              );
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...rest } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option.name}
                    size="small"
                    {...rest}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('businessUnit.selectPlaceholder')}
                size="small"
              />
            )}
            sx={{ minWidth: { xs: '100%', md: 300 } }}
          />

          <MuiButton
            variant="contained"
            onClick={() => setIsRequestModalOpen(true)}
            sx={{ borderRadius: 2, py: 1, px: 3, whiteSpace: 'nowrap' }}
          >
            {t('requestLeave.button')}
          </MuiButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <MuiCard sx={{ borderRadius: 2, boxShadow: 2 }}>
            <MuiCardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('stats.pendingRequests')}
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {pendingCount}
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
              <Typography variant="h4" component="div" fontWeight="bold" color="success.main">
                {approvedCount}
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
                {totalCount}
              </Typography>
            </MuiCardContent>
          </MuiCard>
        </Grid>
      </Grid>

      {/* Calendar */}
      <Box sx={{ flex: 1, minHeight: '600px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <CalendarView
            events={calendarEvents}
            onEventDrop={handleEventDrop}
            onCreateEvent={handleCreateHoliday}
            onUpdateEvent={handleUpdateHoliday}
            onDeleteEvent={handleDeleteHoliday}
            onApproveEvent={handleApproveHoliday}
            onRejectEvent={handleRejectHoliday}
            onRequestChange={handleRequestChange}
            selectedBusinessUnit={selectedBUs.length === 1 ? selectedBUs[0].id : null}
            businessUnits={businessUnits}
            showEventCreation={true}
          />
        )}
      </Box>

      <LeaveRequestDialog
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          toast.success(t('requestLeave.success'));
          setIsRequestModalOpen(false);
          fetchCalendarData();
        }}
        businessUnits={businessUnits}
      />
    </Box>
  );
};

export default Dashboard;
