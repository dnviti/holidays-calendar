import api from './api';

export const createEvent = async (eventData) => {
  try {
    const response = await api.post('/events', eventData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create event');
  }
};

export const getEvents = async (params = {}) => {
  try {
    const response = await api.get('/events', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch events');
  }
};

export const getCalendarEvents = async (start_date, end_date, business_unit_id = null) => {
  try {
    const params = {
      start_date,
      end_date,
      ...(business_unit_id && { business_unit_id })
    };
    const response = await api.get('/events/calendar', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch calendar events');
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    const response = await api.put(`/events/${eventId}`, eventData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to update event');
  }
};

export const deleteEvent = async (eventId) => {
  try {
    await api.delete(`/events/${eventId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to delete event');
  }
};