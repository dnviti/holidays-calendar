import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import EventForm from './EventForm';
import { createEvent } from '../services/eventService';

const EventCreationDialog = ({ open, onClose, onSuccess, selectedDate, businessUnits = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && selectedDate) {
      // Pre-populate form with selected date
    }
  }, [open, selectedDate]);

  const handleCreateEvent = async (eventData) => {
    setLoading(true);
    setError('');

    try {
      // If a date was selected, use it as the start/end date
      if (selectedDate) {
        eventData.start_date = selectedDate;
        eventData.end_date = selectedDate;
      }

      // Default to "holiday" event type if not specified
      if (!eventData.event_type) {
        eventData.event_type = 'holiday';
      }

      const newEvent = await createEvent(eventData);
      onSuccess(newEvent);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Create New Event"
      size="large"
    >
      <div className="max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <EventForm
          onSubmit={handleCreateEvent}
          onCancel={onClose}
          businessUnits={businessUnits}
        />
      </div>
    </Modal>
  );
};

export default EventCreationDialog;