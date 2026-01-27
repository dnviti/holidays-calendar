import api from './api';

export const createHoliday = async (holidayData) => {
  try {
    const response = await api.post('/holidays', holidayData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create holiday request');
  }
};

export const getHolidays = async (params = {}) => {
  try {
    const response = await api.get('/holidays', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch holidays');
  }
};

export const getCalendarHolidays = async (business_unit_id, start_date, end_date) => {
  try {
    const params = {
      business_unit_id,
      start_date,
      end_date
    };
    const response = await api.get('/holidays/calendar', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch calendar holidays');
  }
};

export const updateHoliday = async (holidayId, holidayData) => {
  try {
    const response = await api.put(`/holidays/${holidayId}`, holidayData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to update holiday');
  }
};

export const deleteHoliday = async (holidayId) => {
  try {
    await api.delete(`/holidays/${holidayId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to delete holiday');
  }
};

export const approveHoliday = async (holidayId, notes = null) => {
  try {
    const response = await api.post(`/holidays/${holidayId}/approve`, { notes });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to approve holiday');
  }
};

export const rejectHoliday = async (holidayId, notes = null) => {
  try {
    const response = await api.post(`/holidays/${holidayId}/reject`, { notes });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to reject holiday');
  }
};

export const requestChangeHoliday = async (holidayId, notes) => {
  try {
    const response = await api.post(`/holidays/${holidayId}/request-change`, {
      status: 'change_requested',
      manager_notes: notes
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to request change');
  }
};

export const checkOverlaps = async (business_unit_id, start_date, end_date, exclude_holiday_id = null) => {
  try {
    const params = {
      business_unit_id,
      start_date,
      end_date,
      ...(exclude_holiday_id && { exclude_holiday_id })
    };
    const response = await api.get('/holidays/overlaps', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to check overlaps');
  }
};

export const getPendingApprovals = async (business_unit_id = null) => {
  try {
    const params = business_unit_id ? { business_unit_id } : {};
    const response = await api.get('/holidays/pending', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch pending approvals');
  }
};
