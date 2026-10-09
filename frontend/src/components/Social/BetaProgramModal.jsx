import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { submitBetaApplication, verifyBetaOTP, resendBetaOTP, getBetaStatus } from '../../utils/betaApi';

export default function BetaProgramModal({ isOpen, onClose }) {
  const [step, setStep] = useState('status'); // status, form, otp, success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [betaStatus, setBetaStatus] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    age: '',
    gender: '',
    reasonForJoining: '',
    motivation: ''
  });
  
  const [otpCode, setOtpCode] = useState('');

  // Load beta status on open
  useEffect(() => {
    if (isOpen) {
      loadBetaStatus();
    }
  }, [isOpen]);

  const loadBetaStatus = async () => {
    try {
      setLoading(true);
      const data = await getBetaStatus();
      if (data.success) {
        setBetaStatus(data);
        if (data.isBetaTester) {
          setStep('already-member');
        } else if (data.application && data.application.status === 'PENDING' && !data.application.otpVerified) {
          setStep('otp');
          setApplicationId(data.application.id);
        } else if (data.application && data.application.status === 'PENDING') {
          setStep('under-review');
        } else if (data.application && data.application.status === 'REJECTED') {
          setStep('rejected');
        } else {
          setStep('welcome');
        }
      }
    } catch (err) {
      console.error('Failed to load beta status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setError('');
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.reasonForJoining || !formData.motivation) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const data = await submitBetaApplication(formData);
      
      if (data.success) {
        setApplicationId(data.applicationId);
        setStep('otp');
      } else {
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await verifyBetaOTP(applicationId, otpCode);
      
      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await resendBetaOTP(applicationId);
      
      if (data.success) {
        setError('');
        // Show success message briefly
        const msg = 'OTP resent successfully!';
        setError(msg);
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/20">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-purple-500/20 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Beta Program</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Loading State */}
          {loading && step === 'status' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-purple-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading your beta status...</p>
            </div>
          )}

          {/* Welcome Screen */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Join Our Beta Program</h3>
                <p className="text-gray-300 max-w-xl mx-auto">
                  Get early access to cutting-edge features before anyone else. Shape the future of our platform with your feedback.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-purple-500/20">
                  <h4 className="font-semibold text-white mb-2">🚀 Early Access</h4>
                  <p className="text-sm text-gray-400">Be the first to test new features</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-purple-500/20">
                  <h4 className="font-semibold text-white mb-2">💡 Direct Impact</h4>
                  <p className="text-sm text-gray-400">Your feedback shapes development</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-purple-500/20">
                  <h4 className="font-semibold text-white mb-2">🎯 Exclusive Features</h4>
                  <p className="text-sm text-gray-400">Access beta-only tools</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-purple-500/20">
                  <h4 className="font-semibold text-white mb-2">⭐ VIP Treatment</h4>
                  <p className="text-sm text-gray-400">Priority support & recognition</p>
                </div>
              </div>

              <button
                onClick={() => setStep('form')}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Apply Now
              </button>
            </div>
          )}

          {/* Application Form */}
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-gray-300 text-center mb-6">
                Tell us about yourself and why you want to join our beta program
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="18"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Why do you want to join the beta program? *
                  </label>
                  <textarea
                    value={formData.reasonForJoining}
                    onChange={(e) => setFormData({...formData, reasonForJoining: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Tell us your reason..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    What motivates you to test new features? *
                  </label>
                  <textarea
                    value={formData.motivation}
                    onChange={(e) => setFormData({...formData, motivation: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Share your motivation..."
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
                  Submit Application
                </button>
              </div>
            </div>
          )}

          {/* OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Verify Your Email</h3>
                <p className="text-gray-400">
                  We've sent a 6-digit code to your email. Enter it below to complete your application.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-4 bg-white/5 border border-purple-500/20 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
                  Verify OTP
                </button>

                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full py-3 text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Application Submitted!</h3>
                <p className="text-gray-300">
                  Your application is now under review. You'll be notified once an admin reviews your application.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Got it!
              </button>
            </div>
          )}

          {/* Under Review */}
          {step === 'under-review' && betaStatus?.application && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Loader className="w-12 h-12 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Application Under Review</h3>
                <p className="text-gray-300 mb-4">
                  Your application is being reviewed by our team. We'll notify you once a decision is made.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <span className="text-sm text-yellow-400">Applied {new Date(betaStatus.application.appliedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          )}

          {/* Already a Beta Tester */}
          {step === 'already-member' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">You're a Beta Tester!</h3>
                <p className="text-gray-300">
                  You already have access to all beta features. Thank you for helping us improve!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Awesome!
              </button>
            </div>
          )}

          {/* Rejected */}
          {step === 'rejected' && betaStatus?.application && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Application Not Approved</h3>
                <p className="text-gray-300 mb-4">
                  Unfortunately, your application was not approved at this time.
                </p>
                {betaStatus.application.reviewNotes && (
                  <div className="p-4 bg-white/5 rounded-xl border border-red-500/20 mb-4">
                    <p className="text-sm text-gray-400">{betaStatus.application.reviewNotes}</p>
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  You can apply again in the future.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
