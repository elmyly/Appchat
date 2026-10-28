import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Report, VerificationRequest } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import {
  ShieldAlert,
  Users,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Megaphone,
  Ban,
  Clock,
  BadgeCheck,
  XCircle,
  Search,
  ExternalLink,
  Shield,
  UserCheck,
  UserX,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalVisuals: number;
  totalBoards: number;
  pendingReports: number;
  pendingVerifications: number;
  totalVerifications: number;
}

interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  verifiedCategory?: string;
  isSuspended: boolean;
  createdAt: number;
  lastSeen: number | null;
  followersCount: number;
  followingCount: number;
}

export const AdminView: React.FC = () => {
  const { user: currentAuthUser, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'verifications' | 'users' | 'reports'>('verifications');

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalVisuals: 0,
    totalBoards: 0,
    pendingReports: 0,
    pendingVerifications: 0,
    totalVerifications: 0,
  });

  // Data states
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [usersList, setUsersList] = useState<AdminUserSummary[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'verified' | 'admin' | 'suspended'>('all');

  // Denial state modal / inline input
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('Your application did not satisfy our public notability and identity criteria.');

  const [isLoading, setIsLoading] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const [statsRes, reportsRes, verifRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/verifications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.stats || s);
      }
      if (reportsRes.ok) {
        const r = await reportsRes.json();
        setReports(r.reports || r || []);
      }
      if (verifRes.ok) {
        const v = await verifRes.json();
        setVerificationRequests(v.requests || []);
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsersList(u.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // --- Verification Actions ---
  const handleApproveVerification = async (requestId: string) => {
    if (!token) return;
    setActionInProgress(requestId);
    try {
      const res = await fetch(`/api/admin/verifications/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setVerificationRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'approved', reviewedAt: Date.now() } : r))
        );
        // Also update usersList locally
        setUsersList((prev) =>
          prev.map((u) => (u.id === data.request.userId ? { ...u, isVerified: true, verifiedCategory: data.request.category } : u))
        );
        setStats((prev) => ({
          ...prev,
          pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
        }));
        showToast(`Verification request for @${data.request.username} approved! Verified badge awarded.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to approve request', 'error');
      }
    } catch (err) {
      console.error('Approve failed', err);
      showToast('Network error while approving', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDenyVerification = async (requestId: string) => {
    if (!token) return;
    setActionInProgress(requestId);
    try {
      const res = await fetch(`/api/admin/verifications/${requestId}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: denialReason }),
      });

      if (res.ok) {
        const data = await res.json();
        setVerificationRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'denied', adminNotes: denialReason } : r))
        );
        setStats((prev) => ({
          ...prev,
          pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
        }));
        setDenyingRequestId(null);
        showToast(`Request for @${data.request.username} declined with reason provided.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to deny request', 'error');
      }
    } catch (err) {
      console.error('Deny failed', err);
      showToast('Network error while denying', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Direct Toggle Verified for Any User
  const handleToggleUserVerified = async (userId: string, currentStatus: boolean, username: string) => {
    if (!token) return;
    setActionInProgress(`user_ver_${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-verified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category: 'Creator' }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isVerified: !currentStatus, verifiedCategory: data.user.verifiedCategory } : u))
        );
        showToast(
          !currentStatus
            ? `Granted verified badge to @${username}`
            : `Revoked verified badge from @${username}`
        );
      }
    } catch (err) {
      console.error('Toggle verified failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle Admin Role
  const handleToggleUserRole = async (userId: string, currentRole: 'user' | 'admin', username: string) => {
    if (!token) return;
    setActionInProgress(`user_role_${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const nextRole = currentRole === 'admin' ? 'user' : 'admin';
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
        );
        showToast(`Updated @${username} role to ${nextRole}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Action not permitted', 'error');
      }
    } catch (err) {
      console.error('Role toggle failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle Suspend
  const handleToggleUserSuspend = async (userId: string, isSuspended: boolean, username: string) => {
    if (!token) return;
    setActionInProgress(`user_susp_${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuspended: !isSuspended } : u))
        );
        showToast(!isSuspended ? `Suspended @${username}` : `Unsuspended @${username}`);
      }
    } catch (err) {
      console.error('Suspend failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Reports
  const handleReportAction = async (
    reportId: string,
    action: 'dismiss' | 'delete_content' | 'suspend_user'
  ) => {
    if (!token) return;
    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    setActionInProgress(reportId);
    try {
      if (action === 'dismiss') {
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'dismissed' }),
        });
      } else if (action === 'delete_content') {
        if (targetReport.targetType === 'post') {
          await fetch(`/api/admin/posts/${targetReport.targetId}/moderate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'delete' }),
          });
        }
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'resolved' }),
        });
      } else if (action === 'suspend_user') {
        await fetch(`/api/admin/users/${targetReport.targetId}/suspend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'resolved' }),
        });
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: (action === 'dismiss' ? 'dismissed' : 'resolved') as Report['status'] }
            : r
        )
      );
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
      }));
      showToast(`Report updated successfully`);
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || !token) return;

    try {
      const res = await fetch('/api/social/admin/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: announcementText.trim() }),
      });

      if (res.ok) {
        setAnnouncementSuccess(true);
        setAnnouncementText('');
        showToast('Announcement broadcasted across the network!');
        setTimeout(() => setAnnouncementSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send announcement', err);
    }
  };

  // Filter verification requests
  const filteredVerifications = verificationRequests.filter((r) => {
    if (verificationFilter === 'all') return true;
    return r.status === verificationFilter;
  });

  // Filter users directory
  const filteredUsers = usersList.filter((u) => {
    const query = userSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      u.username.toLowerCase().includes(query) ||
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (userRoleFilter === 'verified') return u.isVerified;
    if (userRoleFilter === 'admin') return u.role === 'admin';
    if (userRoleFilter === 'suspended') return u.isSuspended;
    return true;
  });

  return (
    <div className="flex-1 max-w-5xl min-h-screen border-r border-slate-100 bg-white p-6 pb-24">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            feedbackToast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#5036FF]/10 text-[#5036FF] rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Platform Management Console</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#5036FF] rounded-md">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve/deny verified badges, manage user permissions, and moderate community safety.
            </p>
          </div>
        </div>
        <button
          onClick={fetchAdminData}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh Data
        </button>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'verifications'
              ? 'bg-[#5036FF] text-white shadow-md shadow-[#5036FF]/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          <span>Verified Badge Requests</span>
          {stats.pendingVerifications > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'verifications' ? 'bg-white text-[#5036FF]' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {stats.pendingVerifications}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#5036FF] text-white shadow-md shadow-[#5036FF]/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
          <span className="text-[11px] opacity-75">({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#5036FF] text-white shadow-md shadow-[#5036FF]/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Safety Reports</span>
          {stats.pendingReports > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'reports' ? 'bg-white text-[#5036FF]' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {stats.pendingReports}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#5036FF] text-white shadow-md shadow-[#5036FF]/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Overview & Broadcast</span>
        </button>
      </div>

      {/* --- TAB 1: VERIFIED BADGE REQUESTS --- */}
      {activeTab === 'verifications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-indigo-50/50 p-4 rounded-2xl border border-purple-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-[#5036FF]" />
                Verified Badge Applications Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review identity credentials and decide whether to approve or deny verification badges.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200/80 shrink-0">
              {(['pending', 'approved', 'denied', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setVerificationFilter(filter)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                    verificationFilter === filter
                      ? 'bg-[#5036FF] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading verification applications...</div>
          ) : filteredVerifications.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No {verificationFilter} applications found</p>
              <p className="text-xs text-slate-400 mt-1">
                {verificationFilter === 'pending'
                  ? 'All pending verification badge requests have been reviewed!'
                  : 'No records matching the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVerifications.map((req) => (
                <div
                  key={req.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-200 transition-colors space-y-4"
                >
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={req.avatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{req.displayName}</span>
                          <span className="text-xs text-slate-400 font-mono">@{req.username}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-[#5036FF] border border-purple-100 rounded-md">
                            {req.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{req.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg ${
                          req.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 flex items-center gap-1'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.status === 'approved' && <BadgeCheck className="w-3.5 h-3.5" />}
                        {req.status}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Evidence & Justification Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                      <span>Document / Proof: {req.documentType}</span>
                      {req.documentUrl && (
                        <a
                          href={req.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#5036FF] hover:underline flex items-center gap-1 font-bold"
                        >
                          View External Proof <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Applicant's Reason: </span>
                      <p className="text-slate-800 font-normal mt-0.5 leading-relaxed">
                        "{req.reason}"
                      </p>
                    </div>
                    {req.adminNotes && (
                      <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                        <span className="font-bold text-rose-600">Admin Notes / Decision: </span>
                        <span>{req.adminNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar for Pending Requests */}
                  {req.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {denyingRequestId === req.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full animate-in fade-in">
                          <input
                            type="text"
                            placeholder="Reason for denying (sent to user)..."
                            value={denialReason}
                            onChange={(e) => setDenialReason(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-rose-400 w-full"
                          />
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => setDenyingRequestId(null)}
                              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDenyVerification(req.id)}
                              disabled={actionInProgress === req.id}
                              className="px-4 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Confirm Denial
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setDenyingRequestId(req.id);
                              setDenialReason('Your application did not satisfy our public identity guidelines at this time.');
                            }}
                            disabled={actionInProgress === req.id}
                            className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny Request
                          </button>
                          <button
                            onClick={() => handleApproveVerification(req.id)}
                            disabled={actionInProgress === req.id}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#5036FF] hover:bg-[#432bd4] shadow-md shadow-[#5036FF]/20 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <BadgeCheck className="w-4 h-4" />
                            Approve & Grant Badge
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Approved or Denied Status Summary */}
                  {req.status === 'approved' && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {req.reviewedBy || 'Admin'}
                      </span>
                      <button
                        onClick={() => handleToggleUserVerified(req.userId, true, req.username)}
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        Revoke Badge
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: USER MANAGEMENT DIRECTORY --- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5036FF]" />
                Platform Registered Users ({filteredUsers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Directly grant/revoke verified badges, manage administrator privileges, or suspend accounts.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user, @username, email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#5036FF] w-56"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="admin">Admins Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5 pl-4">User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Verified Badge</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <div className="flex items-center gap-1 font-bold text-slate-900">
                              <span>{u.displayName}</span>
                              {u.isVerified && <VerifiedBadge size="xs" category={u.verifiedCategory} />}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-[#5036FF]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {u.isVerified ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                            <BadgeCheck className="w-4 h-4 text-[#5036FF]" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Unverified</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-100 text-rose-700 rounded-md">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 rounded-md">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Verified Button */}
                          <button
                            onClick={() => handleToggleUserVerified(u.id, u.isVerified, u.username)}
                            disabled={actionInProgress === `user_ver_${u.id}`}
                            title={u.isVerified ? 'Revoke Verified Badge' : 'Award Verified Badge'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              u.isVerified
                                ? 'bg-purple-50 text-[#5036FF] border-purple-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-[#5036FF] hover:text-white hover:border-[#5036FF]'
                            }`}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Admin Role Button */}
                          <button
                            onClick={() => handleToggleUserRole(u.id, u.role, u.username)}
                            disabled={actionInProgress === `user_role_${u.id}`}
                            title={u.role === 'admin' ? 'Demote to standard user' : 'Promote to Admin'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-slate-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-600 hover:text-white'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Suspend Button */}
                          <button
                            onClick={() => handleToggleUserSuspend(u.id, u.isSuspended, u.username)}
                            disabled={actionInProgress === `user_susp_${u.id}`}
                            title={u.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              u.isSuspended
                                ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-emerald-100 hover:text-emerald-700'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: SAFETY REPORTS --- */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Community Reports ({reports.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading reports queue...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Inbox Zero</p>
              <p className="text-xs text-slate-400 mt-0.5">
                All community reports have been resolved. The platform is healthy.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {report.targetType.toUpperCase()} #{report.targetId.slice(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            report.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : report.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 font-semibold mt-1">
                        Reason: {report.reason}
                      </p>
                      {report.details && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{report.details}"
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleReportAction(report.id, 'dismiss')}
                        disabled={actionInProgress === report.id}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleReportAction(report.id, 'delete_content')}
                        disabled={actionInProgress === report.id}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Content
                      </button>
                      <button
                        onClick={() => handleReportAction(report.id, 'suspend_user')}
                        disabled={actionInProgress === report.id}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Suspend User
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: OVERVIEW & BROADCAST --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">Total Users</span>
                <Users className="w-4 h-4 text-[#5036FF]" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">Pending Badges</span>
                <BadgeCheck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">{stats.pendingVerifications}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">Total Posts</span>
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalPosts}</p>
            </div>

            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
              <div className="flex items-center justify-between text-rose-500 mb-1">
                <span className="text-[11px] font-semibold">Pending Reports</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-700">{stats.pendingReports}</p>
            </div>
          </div>

          {/* Broadcast Announcement Bar */}
          <div className="p-5 bg-gradient-to-r from-indigo-500 to-[#5036FF] rounded-2xl text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm">
              <Megaphone className="w-4 h-4" />
              Broadcast System Announcement
            </div>
            <p className="text-xs text-indigo-100 mb-3">
              Sends an instant high-priority in-app notification to all registered Aura accounts simultaneously.
            </p>

            {announcementSuccess && (
              <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Announcement dispatched to all users successfully!
              </div>
            )}

            <form onSubmit={handleSendAnnouncement} className="flex gap-2">
              <input
                type="text"
                placeholder="Type platform announcement..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!announcementText.trim()}
                className="px-4 py-2 bg-white text-[#5036FF] hover:bg-indigo-50 font-semibold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
              >
                Broadcast
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
