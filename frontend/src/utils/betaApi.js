import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'https://synapse-backend.mrpralay2005.workers.dev';

const betaRequest = async (path, options = {}) => {
  const token = Cookies.get('synapse_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.error) {
    data.error = 'The beta service is temporarily unavailable. Please try again.';
  }
  return data;
};

export const submitBetaApplication = (applicationData) => betaRequest('/api/beta/apply', {
  method: 'POST',
  body: JSON.stringify(applicationData)
});

export const verifyBetaOTP = (applicationId, otpCode) => betaRequest('/api/beta/verify-otp', {
  method: 'POST',
  body: JSON.stringify({ applicationId, otpCode })
});

export const resendBetaOTP = (applicationId) => betaRequest('/api/beta/resend-otp', {
  method: 'POST',
  body: JSON.stringify({ applicationId })
});

export const getBetaStatus = () => betaRequest('/api/beta/status');

export const submitBetaFeedback = (feedbackData) => betaRequest('/api/beta/feedback', {
  method: 'POST',
  body: JSON.stringify(feedbackData)
});

export const getBetaFeatures = () => betaRequest('/api/beta/features');
export const getMyFeedback = () => betaRequest('/api/beta/my-feedback');
