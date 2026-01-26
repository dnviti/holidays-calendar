import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Fab,
  Grid
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { getCalendarEvents } from '../services/eventService';

const CalendarPage = () => {
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
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch business units');
    }
  };

  const fetchCalendarData = async (buId) => {
    setLoadingEvents(true);
    try {
      // Fetch full year for broad coverage
      const start = new Date().getFullYear() + '-01-01';
      const end = new Date().getFullYear() + '-12-31';

      // Fetch holidays
      const holidaysResponse = await api.get(`/holidays/calendar?business_unit_id=${buId}&start_date=${start}&end_date=${end}`);
      const holidays = holidaysResponse.data;

      // Fetch events
      const eventsResponse = await getCalendarEvents(start, end, buId);
      const events = eventsResponse;

      // Combine holidays and events
      const combinedEvents = [...holidays, ...events];

      setCalendarEvents(combinedEvents);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = (newEvent) => {
    // Add the new event to the calendar
    setCalendarEvents(prev => [...prev, newEvent]);
    toast.success('Event created successfully!');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
      {/* Header Section */}
      <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Grid item>
          <Typography variant="h4" component="h1" gutterBottom>
            Team Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View holidays and events for your team
          </Typography>
        </Grid>

        <Grid item xs={12} md="auto">
          <FormControl fullWidth variant="outlined" sx={{ minWidth: 250 }}>
            <InputLabel>Select Business Unit</InputLabel>
            <Select
              value={selectedBU}
              onChange={(e) => setSelectedBU(e.target.value)}
              label="Select Business Unit"
              disabled={loading}
            >
              {businessUnits.map((bu) => (
                <MenuItem key={bu.id} value={bu.id}>
                  {bu.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Calendar Area */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0, bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
        {loading && !calendarEvents.length ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <CalendarView
            events={calendarEvents}
            businessUnitName={businessUnits.find(b => b.id === selectedBU)?.name}
            onCreateEvent={handleCreateEvent}
            businessUnits={businessUnits}
            showEventCreation={true}
          />
        )}
      </Box>

      {/* Floating Action Button - This is now handled by the CalendarView component */}
    </Box>
  );
};

export default CalendarPage;
