import React, { useState, useEffect } from 'react';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../contexts/AuthContext';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
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
      fetchEvents(selectedBU);
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

  const fetchEvents = async (buId) => {
    setLoadingEvents(true);
    try {
      // Fetch full year for broad coverage
      const start = new Date().getFullYear() + '-01-01';
      const end = new Date().getFullYear() + '-12-31';

      const response = await api.get(`/holidays/calendar?business_unit_id=${buId}&start_date=${start}&end_date=${end}`);
      setEvents(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = () => {
    // Basic navigation or modal trigger would go here
    // For now, we'll just show a toast as per original placeholder
    console.log('Create event clicked');
    toast.info('Create event functionality coming soon');
  };

  const buOptions = businessUnits.map(bu => ({
    value: bu.id,
    label: bu.name
  }));

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Calendar</h1>
          <p className="text-secondary text-sm">View holidays and events for your team</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Select
              value={selectedBU}
              onChange={(e) => setSelectedBU(e.target.value)}
              options={buOptions}
              disabled={loading}
              placeholder="Select Business Unit"
            />
          </div>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 relative min-h-0 bg-surface rounded-lg">
        {loading && !events.length ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <CalendarView
            events={events}
            businessUnitName={businessUnits.find(b => b.id === selectedBU)?.name}
          />
        )}
      </div>

      {/* Floating Action Button Replacement - Fixed position button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={handleCreateEvent}
          className="rounded-full w-14 h-14 shadow-lg flex items-center justify-center p-0"
          title="Add Holiday"
        >
          <Plus size={24} />
        </Button>
      </div>
    </div>
  );
};

export default CalendarPage;
