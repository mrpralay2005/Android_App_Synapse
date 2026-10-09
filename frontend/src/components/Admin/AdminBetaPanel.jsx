import React, { useState, useEffect } from 'react';
import { X, Users, MessageSquare, TrendingUp, CheckCircle, XCircle, AlertCircle, Clock, Star, Eye, Send, Sparkles, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPendingApplications,
  getAllApplications,
  approveBetaApplication,
  rejectBetaApplication,
  revokeBetaAccess,
  getAllFeedback,
  markFeedbackRead,
  respondToFeedback,
  getBetaStats,
  getAllFeatureFlags,
  updateFeatureFlag
} from '../../utils/adminBetaApi';

export default function AdminBetaPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [features, setFeatures] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load data on mount and tab change
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await getBetaStats();
        if (data.success) setStats(data.stats);
      } else if (activeTab === 'applications') {
        const data = await getPendingApplications();
        if (data.success) setApplications(data.applications);
      } else if (activeTab === 'feedback') {
        const data = await getAllFeedback({ unread: true });
        if (data.success) setFeedback(data.feedback);
      } else if (activeTab === 'features') {
        const data = await getAllFeatureFlags();
        if (data.success) setFeatures(data.flags);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId, notes = '') => {
    setActionLoading(true);
    try {
      const data = await approveBetaApplication(applicationId, notes);
      if (data.success) {
        loadData(); // Refresh
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId, reason = '') => {
    setActionLoading(true);
    try {
      const data = await rejectBetaApplication(applicationId, reason);
      if (data.success) {
        loadData();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (userId, reason = '') => {
    setActionLoading(true);
    try {
      const data = await revokeBetaAccess(userId, reason);
      if (data.success) {
        loadData();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to revoke:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondFeedback = async (feedbackId, response) => {
    setActionLoading(true);
    try {
      const data = await respondToFeedback(feedbackId, response, 'RESOLVED');
      if (data.success) {
        loadData();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to respond:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeature = async (featureId, field, value) => {
    const updates = {};
    updates[field] = value;
    
    try {
      const data = await updateFeatureFlag(featureId, 
        field === 'enabledForBeta' ? value : undefined,
        field === 'enabledForAll' ? value : undefined
      );
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to update feature:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm">
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-gray-900/95">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Beta Control</h1>
              <p className="text-xs text-gray-400">Real-time management dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-purple-500/20 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'applications', label: 'Applications', icon: Users },
            { id: 'feedback', label: 'Feedback', icon: MessageSquare },
            { id: 'features', label: 'Features', icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl border border-blue-500/20">
                  <div className="text-3xl font-bold text-white">{stats.applications.pending}</div>
                  <div className="text-sm text-blue-300 mt-1">Pending Applications</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl border border-green-500/20">
                  <div className="text-3xl font-bold text-white">{stats.betaTesters.active}</div>
                  <div className="text-sm text-green-300 mt-1">Active Beta Testers</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/20">
                  <div className="text-3xl font-bold text-white">{stats.feedback.unread}</div>
                  <div className="text-sm text-purple-300 mt-1">Unread Feedback</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-2xl border border-pink-500/20">
                  <div className="text-3xl font-bold text-white">{stats.applications.total}</div>
                  <div className="text-sm text-pink-300 mt-1">Total Applications</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="font-bold text-white mb-4">Application Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Approved</span>
                      <span className="text-green-400 font-semibold">{stats.applications.approved}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Rejected</span>
                      <span className="text-red-400 font-semibold">{stats.applications.rejected}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Pending</span>
                      <span className="text-yellow-400 font-semibold">{stats.applications.pending}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="font-bold text-white mb-4">Feedback Overview</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Submitted</span>
                      <span className="text-blue-400 font-semibold">{stats.feedback.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Unread</span>
                      <span className="text-purple-400 font-semibold">{stats.feedback.unread}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="space-y-3">
              {applications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending applications</p>
                </div>
              ) : (
                applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer"
                    onClick={() => setSelectedItem(app)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={app.user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.user.username}`}
                            className="w-10 h-10 rounded-full"
                            alt={app.user.username}
                          />
                          <div>
                            <div className="font-semibold text-white">{app.fullName}</div>
                            <div className="text-xs text-gray-400">@{app.user.username}</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">{app.reasonForJoining}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-3">
              {feedback.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No unread feedback</p>
                </div>
              ) : (
                feedback.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user.username}`}
                          className="w-8 h-8 rounded-full"
                          alt={item.user.username}
                        />
                        <span className="font-semibold text-white text-sm">@{item.user.username}</span>
                      </div>
                      {item.rating && (
                        <div className="flex gap-1">
                          {[...Array(item.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
                    {item.featureName && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg">
                        <span className="text-xs text-purple-300">{item.featureName}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{feature.displayName}</h4>
                      <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feature.enabledForBeta}
                        onChange={(e) => handleToggleFeature(feature.id, 'enabledForBeta', e.target.checked)}
                        className="w-4 h-4 rounded border-purple-500/30 bg-white/5 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">Beta Access</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feature.enabledForAll}
                        onChange={(e) => handleToggleFeature(feature.id, 'enabledForAll', e.target.checked)}
                        className="w-4 h-4 rounded border-green-500/30 bg-white/5 text-green-500 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-300">Public Access</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80"
              onClick={() => setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden"
              >
                <ApplicationDetailModal 
                  item={selectedItem}
                  type={activeTab}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRevoke={handleRevoke}
                  onRespond={handleRespondFeedback}
                  loading={actionLoading}
                  onClose={() => setSelectedItem(null)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Detail Modal Component
function ApplicationDetailModal({ item, type, onApprove, onReject, onRevoke, onRespond, loading, onClose }) {
  const [notes, setNotes] = useState('');
  const [response, setResponse] = useState('');

  if (type === 'applications') {
    return (
      <>
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-white">Application Details</h3>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <img
              src={item.user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user.username}`}
              className="w-16 h-16 rounded-full"
              alt={item.user.username}
            />
            <div>
              <div className="font-bold text-white text-lg">{item.fullName}</div>
              <div className="text-gray-400">@{item.user.username}</div>
              <div className="text-sm text-gray-500">{item.email}</div>
            </div>
          </div>

          {item.age && <div><span className="text-gray-400">Age:</span> <span className="text-white">{item.age}</span></div>}
          {item.gender && <div><span className="text-gray-400">Gender:</span> <span className="text-white">{item.gender}</span></div>}
          {item.address && <div><span className="text-gray-400">Address:</span> <span className="text-white">{item.address}</span></div>}

          <div>
            <div className="text-gray-400 font-semibold mb-2">Why joining?</div>
            <div className="text-white bg-white/5 p-3 rounded-lg">{item.reasonForJoining}</div>
          </div>

          <div>
            <div className="text-gray-400 font-semibold mb-2">Motivation</div>
            <div className="text-white bg-white/5 p-3 rounded-lg">{item.motivation}</div>
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-2">Admin Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              placeholder="Add notes about this application..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-purple-500/20 flex gap-3">
          <button
            onClick={() => onReject(item.id, notes)}
            disabled={loading}
            className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-all disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(item.id, notes)}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </>
    );
  }

  if (type === 'feedback') {
    return (
      <>
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-white">Feedback Details</h3>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <img
              src={item.user.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user.username}`}
              className="w-12 h-12 rounded-full"
              alt={item.user.username}
            />
            <div>
              <div className="font-bold text-white">@{item.user.username}</div>
              {item.rating && (
                <div className="flex gap-1 mt-1">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {item.featureName && (
            <div>
              <span className="text-gray-400">Feature:</span>{' '}
              <span className="text-purple-400 font-semibold">{item.featureName}</span>
            </div>
          )}

          <div>
            <div className="text-gray-400 font-semibold mb-2">Title</div>
            <div className="text-white text-lg">{item.title}</div>
          </div>

          <div>
            <div className="text-gray-400 font-semibold mb-2">Description</div>
            <div className="text-white bg-white/5 p-3 rounded-lg">{item.description}</div>
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-2">Your Response</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={4}
              placeholder="Write your response to the user..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-purple-500/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
          >
            Close
          </button>
          <button
            onClick={() => onRespond(item.id, response)}
            disabled={loading || !response}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Response'}
          </button>
        </div>
      </>
    );
  }

  return null;
}
