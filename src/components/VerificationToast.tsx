import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  X,
  FileCheck,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export interface VerificationReceiptData {
  requestId: string;
  category: string;
  documentType: string;
  documentUrl?: string;
  documentFileName?: string;
  documentFileSize?: string;
  reason?: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
}

interface VerificationToastProps {
  receipt: VerificationReceiptData | null;
  onClose: () => void;
  onOpenReceiptModal: () => void;
  durationMs?: number;
}

export const VerificationToast: React.FC<VerificationToastProps> = ({
  receipt,
  onClose,
  onOpenReceiptModal,
  durationMs = 7000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!receipt) return;
    setProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [receipt, durationMs, onClose]);

  if (!receipt) return null;

  const shortId = receipt.requestId ? receipt.requestId.replace(/^req_/, '').slice(0, 6).toUpperCase() : 'VERIF';

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xl shadow-emerald-500/10 dark:shadow-black/40 overflow-hidden transition-all">
        {/* Animated Progress Bar */}
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#5036FF] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            {/* Celebratory Icon Badge */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-[#5036FF] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <BadgeCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Verification Documents Submitted!
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Your credentials for <strong className="text-slate-900 dark:text-white">{receipt.category}</strong> have been received and encrypted for safety review.
              </p>

              {/* Clean Metadata Line */}
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  REF-{shortId}
                </span>
                <span aria-hidden="true">·</span>
                <span>{receipt.documentFileName || receipt.documentType}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <Clock className="w-3 h-3 text-[#5036FF]" />
                  24–48h SLA
                </span>
              </div>

              {/* Actions */}
              <div className="mt-3.5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onOpenReceiptModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  View Receipt
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notification"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VerificationReceiptModalProps {
  receipt: VerificationReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationReceiptModal: React.FC<VerificationReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !receipt) return null;

  const referenceCode = `AURA-VERIF-${(receipt.requestId || 'REQ').replace(/^req_/, '').toUpperCase()}`;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600 via-indigo-600 to-[#5036FF] p-6 text-white relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center p-2 border border-white/20 shadow-inner">
                <img
                  src="/assets/aistudio/Interwoven_Purple_Blue_Ribbon_Logo_baa92702.png"
                  alt="Aura"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold tracking-tight">Application Receipt</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md rounded-md text-white border border-white/20">
                    Official
                  </span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  Documents received & logged into review queue
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Details */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-slate-800 dark:text-slate-100 flex-1">
          {/* Reference Card with Copy */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Application Tracking Reference
              </p>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {referenceCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyRef}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Applicant & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Applicant Identity</span>
              <div className="flex items-center gap-2 mt-1.5">
                {receipt.avatar ? (
                  <img src={receipt.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#5036FF] text-white text-[10px] font-bold flex items-center justify-center">
                    {receipt.displayName.charAt(0)}
                  </div>
                )}
                <div className="truncate">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{receipt.displayName}</p>
                  <p className="text-[10px] text-slate-400">@{receipt.username}</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Requested Category</span>
              <p className="font-bold text-slate-900 dark:text-white mt-1.5">
                {receipt.category}
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                Verified Public Identity
              </p>
            </div>
          </div>

          {/* Submitted Document Information */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verification Evidence Attached</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                Securely Ingested
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 pt-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                {receipt.documentType}
              </p>
              {receipt.documentFileName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  File: {receipt.documentFileName} {receipt.documentFileSize ? `(${receipt.documentFileSize})` : ''}
                </p>
              )}
              {receipt.documentUrl && !receipt.documentUrl.startsWith('data:') && (
                <a
                  href={receipt.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#5036FF] dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 truncate"
                >
                  <span className="truncate">{receipt.documentUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Review SLA Timeline */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5036FF]" />
              Evaluation Process & SLA
            </h5>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Documents Received & Encrypted</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Timestamp: {new Date(receipt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Trust & Safety Committee Review</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Estimated turnaround time: 24 to 48 business hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <BadgeCheck className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-medium text-slate-500 dark:text-slate-400">Decision & Badge Activation</p>
                  <p className="text-[11px] text-slate-400">
                    You will receive an in-app push notification when evaluated.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Seal */}
          <div className="flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your verification documents are securely processed in accordance with Aura Trust & Security policies. They are never published or shared with third parties.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
