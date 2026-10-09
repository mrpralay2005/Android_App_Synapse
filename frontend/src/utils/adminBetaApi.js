const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Get pending beta applications
export async function getPendingApplications() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/applications/pending`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Get all beta applications
export async function getAllApplications(status = null) {
  const token = localStorage.getItem('token');
  const url = status 
    ? `${API_URL}/api/admin/beta/applications?status=${status}`
    : `${API_URL}/api/admin/beta/applications`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Approve beta application
export async function approveBetaApplication(applicationId, notes = '') {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/applications/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ applicationId, notes })
  });
  return await response.json();
}

// Reject beta application
export async function rejectBetaApplication(applicationId, reason = '') {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/applications/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ applicationId, reason })
  });
  return await response.json();
}

// Revoke beta access
export async function revokeBetaAccess(userId, reason = '') {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/revoke-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, reason })
  });
  return await response.json();
}

// Get all beta feedback
export async function getAllFeedback(filters = {}) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.unread) params.append('unread', 'true');
  
  const url = `${API_URL}/api/admin/beta/feedback${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Mark feedback as read
export async function markFeedbackRead(feedbackId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/feedback/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ feedbackId })
  });
  return await response.json();
}

// Respond to feedback
export async function respondToFeedback(feedbackId, response, newStatus = 'IN_REVIEW') {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/admin/beta/feedback/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ feedbackId, response, newStatus })
  });
  return await res.json();
}

// Get beta program statistics
export async function getBetaStats() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Get all feature flags
export async function getAllFeatureFlags() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/features`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// Update feature flag
export async function updateFeatureFlag(featureId, enabledForBeta, enabledForAll) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/admin/beta/features/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ featureId, enabledForBeta, enabledForAll })
  });
  return await response.json();
}
