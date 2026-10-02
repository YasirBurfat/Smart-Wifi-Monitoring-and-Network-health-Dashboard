import { http } from './http.js'

export async function fetchNotifications() {
  const { data } = await http.get('/api/notifications', { params: { limit: 30 } })
  return {
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
    unread: Number(data?.unread) || 0,
  }
}

export async function markAllNotificationsRead() {
  const { data } = await http.post('/api/notifications/read-all', {})
  return data
}
