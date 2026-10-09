const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Submit beta program application
export async function submitBetaApplication(applicationData) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(applicationData)
  });
  return await response.json();
}

// Verify OTP for beta application
export async function verifyBetaOTP(applicationId, otpCode) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ applicationId, otpCode })
  });
  return await response.json();
}

// Resend OTP
export async function resendBetaOTP(applicationId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ applicationId })
  });
  return await response.json();
}

// Get user's beta status
export async function getBetaStatus() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// Submit beta feedback
export async function submitBetaFeedback(feedbackData) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(feedbackData)
  });
  return await response.json();
}

// Get beta features
export async function getBetaFeatures() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/beta/features`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
