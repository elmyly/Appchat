import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Copy, Check, Key, QrCode, X, AlertTriangle } from 'lucide-react';
import { Conversation } from '../types';
import { generateSafetyFingerprint } from '../lib/crypto';

interface SecurityModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ conversation, onClose }) => {
  const [fingerprint, setFingerprint] = useState<string>('Generating...');
  const [copied, setCopied] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem(`verified_conv_${conversation.id}`) === 'true';
  });

  useEffect(() => {
    async function getFingerprint() {
      const fp = await generateSafetyFingerprint(conversation.id);
      setFingerprint(fp);
    }
    getFingerprint();
  }, [conversation.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVerified = () => {
    const next = !isVerified;
    setIsVerified(next);
    localStorage.setItem(`verified_conv_${conversation.id}`, String(next));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              End-to-End Encryption
              {isVerified && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              {conversation.type === 'group' ? 'Encrypted Group Channel' : 'Direct Peer-to-Peer Encryption'}
            </p>
          </div>
        </div>

        {/* Security explanation */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          Messages and media in this chat are completely end-to-end encrypted.
          Only participants hold the private keys. No third party or server can read your conversations.
        </p>

        {/* Safety Number Fingerprint */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-600" /> Safety Number Fingerprint
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-mono text-center tracking-widest text-sm text-indigo-700 select-all font-bold shadow-inner">
            {fingerprint}
          </div>
          <span className="block text-[11px] text-slate-500 mt-1 text-center">
            Compare this safety number with the recipient to confirm your conversation is secure.
          </span>
        </div>

        {/* Security guarantees */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Security</span>
            <span className="font-semibold text-slate-800">End-to-End Encrypted</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Access</span>
            <span className="font-semibold text-slate-800">Direct & Private</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Integrity</span>
            <span className="font-semibold text-slate-800">Tamper-Proof</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Privacy</span>
            <span className="font-semibold text-slate-800">Zero-Knowledge</span>
          </div>
        </div>

        {/* Verification Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Mark as Verified</span>
            <span className="text-[11px] text-slate-500">Confirm identity keys match</span>
          </div>
          <button
            onClick={handleToggleVerified}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isVerified
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {isVerified ? 'Verified ✓' : 'Verify'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
