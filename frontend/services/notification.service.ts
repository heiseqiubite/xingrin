/**
 * Notification service
 * Handles all notification-related API requests
 */

import api from '@/lib/api-client'
import type {
  Notification,
  GetNotificationsRequest,
  GetNotificationsResponse,
} from '@/types/notification.types'

export class NotificationService {
  /**
   * Get notification list
   * 后端返回分页格式: { results, total, page, pageSize, totalPages }
   */
  static async getNotifications(
    params: GetNotificationsRequest = {}
  ): Promise<GetNotificationsResponse> {
    const response = await api.get<GetNotificationsResponse>('/notifications/', {
      params,
    })
    return response.data
  }

  /**
   * Mark all notifications as read
   * 后端返回: { updated: number }
   */
  static async markAllAsRead(): Promise<{ updated: number }> {
    const response = await api.post<{ updated: number }>('/notifications/mark-all-as-read/')
    return response.data
  }

  /**
   * Get unread notification count
   * 后端返回: { count: number }
   */
  static async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/notifications/unread-count/')
    return response.data
  }
}
