/**
 * Erisn Clock-In API Client
 * 
 * This file provides a complete API client for the frontend.
 * Copy this to your frontend project and configure the BASE_URL.
 * 
 * Usage:
 *   import api from './api';
 *   const { data } = await api.auth.login({ email, password });
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==================== TOKEN MANAGEMENT ====================

let authToken = null;

export const setToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('token');
  }
  return authToken;
};

export const clearToken = () => {
  authToken = null;
  localStorage.removeItem('token');
};

// ==================== HTTP CLIENT ====================

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

// ==================== AUTH API ====================

export const auth = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  verifyOtp: (data) => request('/auth/verify-email-otp', { method: 'POST', body: data }),
  resendOtp: (data) => request('/auth/resend-otp', { method: 'POST', body: data }),
  login: async (data) => {
    const response = await request('/auth/login', { method: 'POST', body: data });
    if (response.token) setToken(response.token);
    return response;
  },
  logout: async () => {
    const response = await request('/auth/logout', { method: 'GET' });
    clearToken();
    return response;
  },
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: data }),
  resetPassword: (token, data) => request(`/auth/reset-password/${token}`, { method: 'POST', body: data }),
};

// ==================== USER API ====================

export const user = {
  getProfile: () => request('/users/profile', { method: 'GET' }),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: data }),
  deleteAccount: () => request('/users/profile', { method: 'DELETE' }),
  getPreferences: () => request('/users/preferences', { method: 'GET' }),
  updatePreferences: (data) => request('/users/preferences', { method: 'PUT', body: data }),
};

// ==================== ATTENDANCE API ====================

export const attendance = {
  /**
   * Get current clock status
   * @returns {Promise} - { success, status, attendanceStatus, type, data }
   */
  getStatus: () => request('/attendance/status', { method: 'GET' }),

  /**
   * Get today's attendance record
   * @returns {Promise} - { success, data, status }
   */
  getToday: () => request('/attendance/today', { method: 'GET' }),

  /**
   * Clock in (only once per day, before 17:00, workdays only)
   * @param {Object} data - { notes? }
   * @returns {Promise} - { success, message, data }
   */
  clockIn: (data = {}) => request('/attendance/clock-in', { method: 'POST', body: data }),

  /**
   * Clock out
   * @param {Object} data - { notes? }
   * @returns {Promise} - { success, message, data }
   */
  clockOut: (data = {}) => request('/attendance/clock-out', { method: 'POST', body: data }),

  /**
   * Start break (one per day)
   * @returns {Promise} - { success, message, data }
   */
  breakIn: () => request('/attendance/break-in', { method: 'POST', body: {} }),

  /**
   * End break
   * @returns {Promise} - { success, message, data }
   */
  breakOut: () => request('/attendance/break-out', { method: 'POST', body: {} }),

  /**
   * Get attendance history
   * @param {Object} params - { startDate?, endDate?, type?, attendanceStatus?, page?, limit? }
   * @returns {Promise} - { success, data, pagination }
   */
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/history${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  /**
   * Get all attendance (admin only)
   * @param {Object} params - { userId?, startDate?, endDate?, type?, attendanceStatus?, userName?, page?, limit? }
   * @returns {Promise} - { success, data, pagination }
   */
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/all${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  /**
   * Get attendance summary (admin only)
   * @param {Object} params - { startDate?, endDate?, userId? }
   * @returns {Promise} - { success, data: { present, absent, weekend, holiday, total } }
   */
  getSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/summary${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  /**
   * Export my attendance (user)
   * @param {Object} params - { year, month, type: 'csv'|'pdf' }
   * @returns {Promise<Response>} - File response
   */
  exportMy: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export/my?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response;
  },

  /**
   * Export monthly attendance (admin only)
   * @param {Object} params - { year, month, type: 'csv'|'pdf', userId? }
   * @returns {Promise<Response>} - File response
   */
  exportMonthly: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response;
  },

  /**
   * Export individual user attendance (admin only)
   * @param {string} userId - User ID
   * @param {Object} params - { year, month, type: 'csv'|'pdf' }
   * @returns {Promise<Response>} - File response
   */
  exportUser: async (userId, params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export/${userId}?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response;
  },
};

// ==================== REPORTS API ====================

export const reports = {
  submit: (data) => request('/reports', { method: 'POST', body: data }),
  update: (id, data) => request(`/reports/${id}`, { method: 'PUT', body: data }),
  getMyReports: () => request('/reports', { method: 'GET' }),
  getById: (id) => request(`/reports/${id}`, { method: 'GET' }),
  exportMyReports: (type) => request(`/reports/export/data?type=${type}`, { method: 'GET' }),
};

// ==================== NOTIFICATIONS API ====================

export const notifications = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notifications${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getUnreadCount: () => request('/notifications/unread-count', { method: 'GET' }),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/notifications/mark-all-read', { method: 'PATCH' }),
  subscribePush: (subscription) => request('/notifications/subscribe', { method: 'POST', body: { subscription } }),
};

// ==================== ADMIN API ====================

export const admin = {
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/reports${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  exportReports: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/reports/export?${query}`, { method: 'GET' });
  },
  approveReport: (id, data = {}) => request(`/admin/reports/${id}/approve`, { method: 'POST', body: data }),
  rejectReport: (id, data) => request(`/admin/reports/${id}/reject`, { method: 'POST', body: data }),
  markReportReviewed: (id, data = {}) => request(`/admin/reports/${id}/review`, { method: 'POST', body: data }),
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getGraduates: () => request('/users/graduates', { method: 'GET' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

// ==================== HEALTH API ====================

export const health = {
  check: () => request('/health', { method: 'GET' }),
  ready: () => request('/ready', { method: 'GET' }),
};

// ==================== DEFAULT EXPORT ====================

const api = {
  auth,
  user,
  attendance,
  reports,
  notifications,
  admin,
  health,
  setToken,
  getToken,
  clearToken,
};

export default api;
