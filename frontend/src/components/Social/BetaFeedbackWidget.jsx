import React, { useState } from 'react';
import { MessageSquare, X, Star, Send, Loader } from 'lucide-react';
import { submitBetaFeedback } from '../../utils/betaApi';

export default function BetaFeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    featureName: '',
    rating: 0,
    title: '',
    description: ''
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await submitBetaFeedback(formData);
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setFormData({
            featureName: '',
            rating: 0,
            title: '',
            description: ''
          });
        }, 2000);
      } else {
        setError(data.error || 'Feedback could not be submitted. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Feedback could not be submitted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => { setError(''); setIsOpen(true); }}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-purple-500/50 md:bottom-6 md:right-6"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Beta Feedback</span>
        </button>
      )}

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed bottom-24 left-3 right-3 z-50 overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 shadow-2xl md:bottom-6 md:left-auto md:right-6 md:w-96">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-gray-900/95">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white">Beta Feedback</h3>
            </div>
            <button
              onClick={() => { setError(''); setIsOpen(false); }}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-semibold">Feedback Submitted!</p>
                <p className="text-sm text-gray-400 mt-2">Thank you for helping us improve</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Feature (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.featureName}
                    onChange={(e) => setFormData({...formData, featureName: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Which feature?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFormData({...formData, rating: star})}
                        className="transition-all"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= formData.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Share your thoughts..."
                  />
                </div>

                {error && (
                  <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-relaxed text-red-200">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.title || !formData.description}
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
