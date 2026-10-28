import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flag, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReportModalProps {
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'visual';
  targetPreview?: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Spam or deceptive activity',
  'Harassment or hate speech',
  'Inappropriate or adult content',
  'Misinformation or harmful advice',
  'Copyright or intellectual property violation',
  'Other violation of Aura Community Guidelines',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  targetId,
  targetType,
  targetPreview,
  onClose,
}) => {
  const { token } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetId,
          targetType,
          reason: selectedReason,
          details: details.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit report');
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <Flag className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">
              Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Thank you for letting us know</h4>
            <p className="text-xs text-slate-500">
              Our safety and moderation team will review this report within 24 hours to protect our
              community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {targetPreview && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 line-clamp-2 italic">
                "{targetPreview}"
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Why are you reporting this?
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'border-[#5036FF] bg-indigo-50/50 text-[#5036FF] font-medium'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-[#5036FF]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Details (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Help us understand the issue..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none transition-all resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-sm"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
