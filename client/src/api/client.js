const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('swasthya_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || (data.details && data.details[0]?.message) || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),
  getDemoUsers: () => request('/auth/demo-users'),

  // Patients
  getPatients: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qStr = query.toString();
    return request(`/patients${qStr ? `?${qStr}` : ''}`);
  },
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (patientData) => request('/patients', { method: 'POST', body: JSON.stringify(patientData) }),
  recordReading: (patientId, readingData) => request(`/patients/${patientId}/readings`, { method: 'POST', body: JSON.stringify(readingData) }),

  // Visits
  getTodaysVisits: () => request('/visits/today'),
  completeVisit: (visitId, readingData) => request(`/visits/${visitId}/complete`, { method: 'POST', body: JSON.stringify(readingData) }),

  // Reminders
  getReminders: () => request('/reminders'),
  sendReminder: (reminderData) => request('/reminders/send', { method: 'POST', body: JSON.stringify(reminderData) }),
  autoTriggerReminders: () => request('/reminders/auto-trigger', { method: 'POST' }),

  // Dashboard (PHC Officer)
  getDashboardSummary: () => request('/dashboard/summary'),
  getDashboardTrends: () => request('/dashboard/trends'),
  getAshaPerformance: () => request('/dashboard/asha-performance'),
  getSevereAndOverdue: () => request('/dashboard/severe-overdue'),
};
