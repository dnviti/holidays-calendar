import api from './api';

export const getNotifications = async ({ limit = 20, unreadOnly = false } = {}) => {
  const response = await api.get('/notifications', {
    params: { limit, unread_only: unreadOnly },
  });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data.unread_count;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.post(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};
