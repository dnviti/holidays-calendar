import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CalendarView from '../components/CalendarView';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { toast } from 'sonner';

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
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.display_name}</h1>
          <p className="text-secondary">Here is your holiday overview</p>
        </div>
        <Button onClick={() => setIsRequestModalOpen(true)}>Request Leave</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-secondary">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {holidays.filter(h => h.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-secondary">Approved (This Year)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success" style={{ color: 'var(--success-color)' }}>
              {holidays.filter(h => h.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-[500px]">
        <CalendarView events={events} onEventDrop={handleEventDrop} />
      </div>

      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Leave"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <Input
            label="Title"
            value={requestData.title}
            onChange={e => setRequestData({ ...requestData, title: e.target.value })}
            required
            placeholder="e.g. Summer Vacation"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={requestData.start_date}
              onChange={e => setRequestData({ ...requestData, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={requestData.end_date}
              onChange={e => setRequestData({ ...requestData, end_date: e.target.value })}
              required
            />
          </div>
          <Input
            label="Description"
            value={requestData.description}
            onChange={e => setRequestData({ ...requestData, description: e.target.value })}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
