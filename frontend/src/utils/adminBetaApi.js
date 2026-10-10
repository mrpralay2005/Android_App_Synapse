import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

const adminBetaRequest = async (path, options = {}) => {
  const token = Cookies.get('synapse_token');
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Beta administration service unavailable (${response.status})`,
        ...data
      };
    }
    return {
      success: data.success !== false,
      ...data
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network connection severed.'
    };
  }
};

export const getPendingApplications = () => adminBetaRequest('/api/admin/beta/applications/pending');

export const getAllApplications = (status = null) => adminBetaRequest(
  `/api/admin/beta/applications${status ? `?status=${encodeURIComponent(status)}` : ''}`
);

export const approveBetaApplication = (applicationId, notes = '') => adminBetaRequest('/api/admin/beta/applications/approve', {
  method: 'POST',
  body: JSON.stringify({ applicationId, notes })
});

export const rejectBetaApplication = (applicationId, reason = '') => adminBetaRequest('/api/admin/beta/applications/reject', {
  method: 'POST',
  body: JSON.stringify({ applicationId, reason })
});

export const revokeBetaAccess = (userId, reason = '', applicationId = null) => adminBetaRequest('/api/admin/beta/revoke-access', {
  method: 'POST',
  body: JSON.stringify({ userId, reason, applicationId })
});

export const getAllFeedback = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.unread) params.set('unread', 'true');
  return adminBetaRequest(`/api/admin/beta/feedback${params.size ? `?${params}` : ''}`);
};

export const markFeedbackRead = (feedbackId) => adminBetaRequest('/api/admin/beta/feedback/read', {
  method: 'POST',
  body: JSON.stringify({ feedbackId })
});

export const respondToFeedback = (feedbackId, response, newStatus = 'IN_REVIEW') => adminBetaRequest('/api/admin/beta/feedback/respond', {
  method: 'POST',
  body: JSON.stringify({ feedbackId, response, newStatus })
});

export const getBetaStats = () => adminBetaRequest('/api/admin/beta/stats');
export const getAllFeatureFlags = () => adminBetaRequest('/api/admin/beta/features');

export const updateFeatureFlag = (featureId, enabledForBeta, enabledForAll, name = null) => adminBetaRequest('/api/admin/beta/features/update', {
  method: 'POST',
  body: JSON.stringify({ featureId, enabledForBeta, enabledForAll, name })
});
